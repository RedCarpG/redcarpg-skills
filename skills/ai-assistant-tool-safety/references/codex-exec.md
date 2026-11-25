# 在自己的应用里调用本机 Codex（`codex exec`）

把用户本机的 Codex CLI 当成应用里的 AI 助手（和 `claude -p` 并列）时要注意的事。codex-cli 0.154.0、Windows 上验证过（2026-11-23，生图配方库 `app/chat.mjs` 的 Codex 部分）。

## 必须改的默认值

- **`--ignore-user-config` 不够。** 它只是不读 `$CODEX_HOME/config.toml`；`$CODEX_HOME/AGENTS.md`（用户的全局指令）、skills 列表、已装的插件和 MCP（Notion、Canva…）照样加载。实测一句短问题 79k 输入 token，模型能引用用户的 AGENTS.md。
  - **做法：给应用单独一个 `CODEX_HOME`**（比如 `%LOCALAPPDATA%\<应用>\codex-home`），在应用里放个「登录 Codex」按钮，spawn `codex login`（带这个 CODEX_HOME）让用户自己在浏览器里登录一次。`codex login status` 判断登没登录（输出含 `Not logged in` 就是没登）。
  - **登录用 `codex login --device-auth`，不要用普通的 `codex login`**：普通登录要在本机 127.0.0.1:1455 等网页回调，开了 Hyper-V / WSL 的 Windows 常把这段端口保留掉（`netsh int ipv4 show excludedportrange protocol=tcp` 能看到 1438–1537 之类），直接报 `os error 10013` 退出；stdio 设成 ignore 的话用户只看到「点了没反应」。device-auth 不用本机端口，stdout 打出网址（`https://auth.openai.com/codex/device`）和一次性代码（`XXXX-XXXXX`，15 分钟有效），去掉 ANSI 颜色后用正则取出来显示在界面上，用户输完代码进程自己退出；界面每几秒问一次 `codex login status`。
  - **不要把用户的 `auth.json` 复制过去**：两份各自刷新 token，refresh token 轮换后用户自己的 Codex 可能被踢下线。
- **在同一个 CODEX_HOME 里也要逐个关掉的功能**（`codex features list` 看全名）：`--disable` apps、plugins、remote_plugin、memories、hooks、multi_agent、browser_use、browser_use_external、computer_use、image_generation、goals、skill_search、tool_suggest、in_app_browser 等；再加 `-c web_search="disabled"`、`--ignore-rules`。
- **沙箱**：`-c sandbox_mode="workspace-write"` + `-c approval_policy="never"` + `-c sandbox_workspace_write.network_access=false`，`cwd` 设成唯一可写的数据文件夹。Codex 没有「只读工具」，只能靠 shell 命令看文件，所以**它能读到工作区以外的文件**（Claude Code 只给 Read/Edit 时读不到），这一点要在系统提示词里限制，并告诉用户。
- **Windows**：忽略用户配置后没有 `[windows] sandbox`，连 `Get-Content` 都会 `blocked by policy`。要显式加 `-c windows.sandbox="elevated"`（全新的 CODEX_HOME 第一次用 elevated 可能要做一次沙箱设置，留个环境变量能改成 unelevated）。

## 调用细节

- **prompt 走 stdin**：参数里写 `-`，并且紧跟在 `exec`（或 `exec resume <id>`）后面。`-i <FILE>...` 能吃多个值，放在它后面的 `-` 会被当成图片文件。
- **接着聊**：`codex exec resume <thread_id> - ...`；resume 子命令没有 `-s`、`-C`，沙箱用 `-c sandbox_mode=...`、目录用 spawn 的 `cwd`。
- **没有「追加系统提示词」参数**：新会话时把规矩放在第一句话前面，resume 时它在历史里。`-c developer_instructions=...` 也能用，但长文本放命令行容易碰到 Windows 32k 限制。
- **`--json` 事件**：`thread.started{thread_id}` → `item.started/item.completed`，item.type 有 `agent_message`（整段给，不流式）、`command_execution{command}`、`file_change{changes:[{path,kind}]}`、`error` → `turn.completed{usage}` 或 `turn.failed{error}`。
- **用量**：`turn.completed.usage` 的 `input_tokens` 是**这一句里所有模型调用加起来的**，包含 `cached_input_tokens`，不是上下文长度。别拿它判断「对话太长要换新」（会第一句就触发）；Codex 自己会压缩历史。不报金额。
- **模型别写死**：能用哪些模型看账号。同一台电脑上用户自己的 Codex 能用 `gpt-6.1-sol`，单独登录的账号用它就报 `model_not_found`（"not supported when using Codex with a ChatGPT account"）。从这份 CODEX_HOME 的 `models_cache.json` 读 `visibility == "list"` 的给用户选，默认不传 `-m`，让 Codex 按账号自己挑。
- 找可执行文件时优先 `codex.exe`，不要用 `.cmd` 包装（长参数经过 cmd.exe 会被搅乱）。去掉宿主的 `CODEX_*` 环境变量，再设自己的 `CODEX_HOME`。
