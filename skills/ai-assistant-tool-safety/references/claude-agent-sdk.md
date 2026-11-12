# 把 Claude Agent SDK 嵌进自己的应用

适用：用 `@anthropic-ai/claude-agent-sdk` 做一个常驻的聊天角色、助手、后台 agent，而不是当编程助手用。下面每条都在一个桌宠应用里用了一个多月。选项名以 2026-11 的 SDK 为准，升级后对着文档再确认。

## 必须改的默认值

```ts
const session = query({
  prompt: inbox,                       // AsyncIterable<SDKUserMessage>：常驻会话
  options: {
    model,
    systemPrompt: buildSystemPrompt(), // 自己的字符串，不用 Claude Code 的 preset
    settingSources: [],                // ① 一定要显式写
    settings: { disableClaudeAiConnectors: true }, // ② 关掉账号上的连接器
    strictMcpConfig: true,             // ② 只用你给的 MCP 服务器
    tools: READ_ONLY_TOOLS,            // 有哪些工具
    allowedTools: READ_ONLY_TOOLS,     // ③ 哪些免确认：这些不经过 canUseTool
    canUseTool: async (name) => {      // 兜底：漏到这里的一律拒绝并记日志
      log.warn("denied tool", name);
      return { behavior: "deny", message: "这个能力还没开放" };
    },
    hooks: { PreToolUse: [/* ③ 这一轮要禁工具时在这里拒绝 */] },
    includePartialMessages: true,      // 逐字增量
    persistSession: false,             // 不往 ~/.claude/projects 写会话文件
    env: scrubbedEnv(),                // ④ 去掉宿主的 CLAUDE* 变量
    cwd: workspaceDir,                 // 应用自己的空文件夹
  },
});
```

① **`settingSources: []`**
- 不写的话，SDK 和 CLI 一样加载 `~/.claude` 下的用户设置、CLAUDE.md、hooks、权限规则。
- 后果一：开发者自己的 Claude Code 配置混进角色的人设和权限里。
- 后果二：如果把 Claude Code 的 hooks 指向这个应用（「Claude Code 做完了通知我」），角色自己的每次对话也会触发 hooks、再通知自己，形成回环。

② **claude.ai 连接器**
- 用 claude.ai 账号登录时，账号上连的 MCP 连接器（Gmail、Drive……几百个工具，含发邮件、删文件）会自动加进会话。
- `canUseTool` 能拒绝调用，但这些工具不该出现在角色面前，而且会让每轮慢好几倍。
- 会话里出现只读名单以外的工具时，打一条警告日志。

③ **`allowedTools` 里的工具不经过 `canUseTool`**
- 放进 `allowedTools` 的工具根本走不到 `canUseTool`。要在某一轮临时禁掉工具（比如这一轮在处理外来内容），得在 `PreToolUse` hook 里拒绝。用户自己加的 MCP 服务器也一样。
- 用户加的 MCP 服务器的工具不放进 `allowedTools`，让它们走 `canUseTool` → 界面确认。

④ **宿主环境变量**
- 从 Claude Code 或 Claude 桌面应用的终端里运行时，环境里带着宿主会话的 `CLAUDECODE`、`CLAUDE_CODE_*`（子会话标记、消息管道、宿主登录刷新），约 30 个。
- 不去掉的话，SDK 底下的 Claude Code 会把自己当成宿主的子会话。
- 做法：传给底下进程前去掉所有 `CLAUDE*`，只留 `CLAUDE_CONFIG_DIR`。

```ts
export function scrubbedEnv(src = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) continue;
    // Windows 的环境变量名不分大小写，所以按不分大小写比
    if (/^CLAUDE/i.test(k) && k.toUpperCase() !== "CLAUDE_CONFIG_DIR") continue;
    out[k] = v;
  }
  return out;
}
```

## 登录排错

- 在 Claude 应用的终端里跑 SDK 自带的 `claude.exe auth login`，只把账号资料写进 `~/.claude.json`，没写 token，应用一直报「Not logged in」（2026-10-25 碰到）。
- 先清干净环境再登（PowerShell）：

```powershell
Get-ChildItem Env:CLAUDE* | Remove-Item
& .\node_modules\@anthropic-ai\claude-agent-sdk-win32-x64\claude.exe auth login
```

- 报登录错误时，先在干净环境里跑 `claude.exe auth status`。不要假定在 Claude 应用终端里登录成功了。

## 常驻会话

- `prompt` 传 AsyncIterable，每来一句推一条 user 消息：多轮共享上下文，底下进程一直热着，第二句起更快。`query.interrupt()` 只在这个模式下能用。
- **出错后的下一句要排队：** 前端收到 `error` 就当这句结束了，但 SDK 的 `result` 可能还没到。这时来的下一句先排队，等 `result` 到了再发，否则两句的消息串在一起。
- 流式文字：取 `stream_event` 里 `content_block_delta` / `text_delta` 的文本。
- 错误分类：assistant 消息上的 `error`（如 `authentication_failed`）归「登录」；`result` 的 `error_*` 归「内部错误」。给用户的出错信息分五类（登录、额度、限流、网络、其他），每类一个能点的按钮（「换个接口」或「再试一次」）。
- **省资源：** 底下的 Claude Code 进程常驻约 350 MB。改成第一次说话才开、闲 15 分钟关掉，下次开时带上最近几轮对话。

## 打包和登录方式

- SDK 通过可选依赖带一个分平台的 Claude Code 程序，Windows 上 `claude.exe` 约 297 MB（2026-11）。打包用 `npm ci --omit=dev --os <平台> --cpu <架构>`，只装目标平台那一个。
- Agent SDK 文档写明：未经批准，第三方产品不能提供 claude.ai 账号登录。自己电脑上用自己的登录没问题；给别人用时，让对方用自己已登录的 Claude Code，或者填自己的 API key，或者走 OpenAI 兼容接口。
- 别的接口（OpenAI 兼容）没有 SDK 自带的工具循环，要自己写：一句话里最多 8 轮「调工具 → 拿结果 → 再说」，超了就不给工具、让它直接说。
