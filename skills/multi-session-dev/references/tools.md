# 各工具怎么做

SKILL.md 和各篇 reference 用的是通用说法：开一个会话、派子代理、开 worktree、发消息。下面写各工具的具体做法。标〔未验证〕的是没有在实际项目里用过的，用之前先在该工具里确认。

| 通用说法 | Claude Code（CLI / 桌面应用） | claude.ai | Codex | DeepSeek Harness（DSH） |
|---|---|---|---|---|
| 仓库指令文件 | `CLAUDE.md` | 项目说明（Project instructions） | `AGENTS.md`〔未验证细节〕 | 工作区的 `AGENTS.md`、`CLAUDE.md`（按目录加载）；用户级全局 `~/.dsh/AGENTS.md`，也读 `~/.agents/AGENTS.md` |
| 项目 skill 放哪 | 只扫 `.claude/skills/` | 无（用 claude.ai 账号里上传的） | 从当前目录往上到仓库根扫 `.agents/skills/`（[官方文档](https://learn.chatgpt.com/docs/build-skills.md)） | 项目根（往上第一个带 `.git` 的目录，worktree 的 `.git` 文件也算）下的 `.dsh/skills/` 和 `.agents/skills/`；新加的当前会话马上可见 |
| 开一个开发会话 | CLI：`claude -w <名字>` 或在 worktree 里起 `claude`；桌面应用：管理会话开新会话（可选独立 worktree） | 新对话；碰不到本地仓库，只适合设计和评审 | 新任务〔未验证〕 | 用户在 DSH 界面里新开会话；会话之间不共享记忆，同一工作区能用 `session_search`、`session_event_search` 搜旧会话；会话不能关掉 |
| 派子代理 | 子代理（Agent / Task 工具），只交回摘要，彼此不能通信；可按次指定模型，见下文 | 无 | 在当前聊天中明确请求派子代理，可按次指定模型和推理强度，见下文 | `subagent`、`subagent_fork`、`subagent_claude_code`、`subagent_codex`；结束时父会话自动收到通知；见下文 |
| 开 worktree | 有项目脚本用脚本；否则 `git worktree add ../<repo>-<名字> -b <分支>`。子代理的 `isolation: worktree` 默认从默认分支开，不会接入项目要的本地资源 | 无 | 〔未验证〕 | 项目有脚本用脚本；否则 `create_worktree`（建分支和 worktree，把会话目录切过去），它不会接项目脚本里的 junction、本机配置 |
| 会话之间发消息 | 桌面应用：会话之间可以互发消息；被开出来的会话结束一轮时，管理会话会收到通知 | 无 | 〔未验证〕 | 顶层会话之间不能发；父会话和子代理之间可以（`send_message`） |
| 云端会话 | 云端会话推到远端分支；不会回发消息，要看它的记录或 PR。只加载 claude.ai 账号里启用的 skill（会话开始时同步）和仓库里的 `.claude/skills/`；本机 `~/.claude/skills/`、仓库 `.claude/settings.json` 里开的插件都不加载。改了 skill 要重新上传到 claude.ai，新会话才用上（[文档](https://code.claude.com/docs/en/cloud-environments.md#what-carries-over-from-your-setup)） | 无 | 云端任务产出 PR〔未验证〕 | 无 |

## 跨工具放项目 skill

三个工具扫的目录不一样。要让项目 skill 在 DSH、Codex、Claude Code 里都能用：正文放 `.agents/skills/<名字>/`，`.claude/skills/<名字>/` 放一个同名入口，只写「去 `.agents/skills/<名字>/SKILL.md` 看」。别把正文复制两份，改一边忘一边。

## Claude Code 的实际经验（Cirra，2026-11）

- **结束通知只显示前几百字。** 管理会话收到的通知会截断，细节得去翻对方的记录，很耗上下文。所以结束报告的第一句一定要把「分支 @ 提交｜状态｜在等谁」写全。
- **权限确认不能转交。** 开发会话被拦下的安装、下载、登录，管理会话不能替它执行；告诉用户去那个会话里批准。
- **开发会话可以再开会话。** 被开出来的会话归属于开它的那个会话，它的结果先回到那里。管理会话想了解，就问那个开它的会话，或者直接看 Git。
- **远程遥控**：用户可以在手机上回答会话的选择题、给批准，但看不了桌面上的效果。
- **嵌套子代理**：不同版本支持的层数不同，不要让流程依赖它。
- **挑模型和推理强度（桌面应用）。**
  - **开子会话**：开的时候 `model` 只能选和管理会话同级或更便宜的（更高的会被忽略），`effort` 只能等于或低于管理会话。
  - **任务需要更强的模型或更高的推理强度时，可以升级，但要用户确认。** 先按上一条开会话，再对它调 `set_session_model` / `set_session_effort` 设成更高的那档：换成更贵的模型或更高的强度时，app 会弹确认，用户点了才生效（auto 模式下 app 也可能自己决定）。在派工消息里写清为什么要升级，让用户能判断。不能给管理会话自己升级，要换就请用户在模型菜单里选。
  - **派子代理**（Agent 工具）：可以按次指定 `model`；`effort` 只在用户或项目指令明确要求时才设，否则用默认值。
  - **用户确认过的分档**（Cirra，2026-11-16）：只读查找、截图、看日志用 Haiku + low；需求清楚的单模块用 Sonnet + medium；动共享约定、安全、设计文档、有冲突的合并用 Opus + high；难复现的 bug、引擎、大块玩法设计用 Fable（按上面的办法请用户确认升级）。
  - 派工那条消息写一句用的哪一档，免得以为升了级，派出去的其实是默认模型。同一条线的后续发给原来的会话；做完的线归档，换会话时写短交接，不让一个会话拖得很长（上下文压缩本身也耗）。
- **归档会话（桌面应用，2026-11-22 实际用过）。**
  - 管理会话用 `list_sessions` 列会话：看 `lastActivityAt`、`prState`（`MERGED` 是 PR 已合）、`isRunning`、`startedBy`（谁开的）。`list_sessions {"linked": true}` 只列自己这一家。
  - 用 `archive_session` 归档，每次都要用户批准；用户在对话里点了头再调。auto 模式下可能因为钩子改写了输入而拿不到审核结论，照错误信息给的输入原样再发一次即可。
  - 归档会停掉会话的进程，并清理**应用自己开的** worktree；项目脚本开的 worktree 它不管，照旧用项目的删除脚本。开它的会话被归档时，共用同一个 worktree 或已经结束的下级会话会一起归档。
  - 还在跑的、置顶的、开在屏幕上的会话不会被归档，调用会说明原因。归档能用 `unarchive_session` 恢复；`delete_session` 删了就没了，只有用户明说要删才用。
  - 应用有个「PR 关闭后自动归档」的设置（`auto_archive_on_pr_close`），只管开了 PR 的会话；本地合进集成分支、不开 PR 的线（配置 B）不会触发，还得管理会话提议。
- **审查、调研子代理的定义**放在 `.claude/agents/<名字>.md`，frontmatter 写 `name`、`description`、`tools`。只读的审查者只给 `Read`、`Grep`、`Glob`。**`Bash` 不是只读工具**：它能写文件、能跑任意脚本，给了它，配置就保证不了只读。需要跑测试时，交给有权限的验证会话去跑；或者在项目的权限设置里只放行明确的几条命令，并在隔离的环境里跑。正文照 `templates.md` 里的审查者开场指令写。

## claude.ai

适合做管理会话里「想清楚」的那部分：讨论方案、写简报、评审文档。它碰不到本地仓库和 Git，所以不能核对结果，也不能合入、推送。用它做管理会话时，核对和集成交给本地会话。

## Codex

Codex 读取 `AGENTS.md` 作为仓库指令，项目档案放在那里或由它链接。项目 skill 放 `.agents/skills/`：从当前目录往上扫到仓库根。 [官方 skill 文档](https://learn.chatgpt.com/docs/build-skills.md)

- **当前聊天的子代理**：派工时显式给出模型和推理强度。可从 `gpt-6-luna` + `high` 做只读定位和日志筛选起步，跨模块审查可用 `gpt-6.1-sol` + `high`。具体值以当前会话可选配置为准。两项都省略且没有子代理默认配置时，子代理继承主代理的设置。反复使用的角色可以在 `.codex/agents/*.toml` 里设置 `model` 和 `model_reasoning_effort`。 [官方子代理文档](https://learn.chatgpt.com/docs/agent-configuration/subagents#choosing-models-and-reasoning)
- **独立开发会话**：在任务简报记录建议配置，例如单模块修复用 `gpt-6.1-sol` + `medium`。创建会话时确认接口是否支持传入这两项。桌面端可以在该会话的模型选择器设置。管理会话通过创建聊天的接口同时设置这两项〔未验证〕。 [官方模型选择文档](https://learn.chatgpt.com/docs/models#choose-a-model)

## DeepSeek Harness（DSH）

DSH 读工作区的 `AGENTS.md` 和 `CLAUDE.md`（按目录加载），项目档案放在那里或由它们链接。全局指令在 `~/.dsh/AGENTS.md`，也读 `~/.agents/AGENTS.md`。

- **开发会话**：用户在 DSH 界面里新开。会话之间不共享记忆；同一工作区能用 `session_search`、`session_event_search` 搜旧会话，接手时先搜一下。会话不能关掉，也不能给别的顶层会话发消息，所以结果靠结束报告和 Git 传。
- **子代理**：
  - `subagent`：可指定 `provider`、`model`、`reasoning_effort`，三个要一起给；可以用 `send_message` 继续对话。
  - `subagent_fork`：带上当前对话再去做。
  - `subagent_claude_code`、`subagent_codex`：走本机的 Claude Code、Codex，不能再发后续消息。
  - 子代理结束时父会话自动收到通知，不用轮询，也不用 sleep。
- **挑模型**：默认只能用父会话自己的模型。要在 profile 的 `cordis.patch.yml` 里打开 `subagent-model-selection-settings`，并在 `allowedModels` 列出 `{ provider, model }`。**只对之后新建的顶层会话生效**，所以得在开会话之前配好。开场用 `list_subagent_models` 确认可用的路由；加上 `provider`、`model` 能看推理强度档位。
  - **用户确认过的分档**（Cirra，2026-11-16）：找文件、读代码、机械地改文档 → `anthropic/claude-haiku-5-5` + low；写功能、补测试 → `claude-sonnet-5-5` + medium 或 high；审查、难查的 bug → `claude-opus-5-5` + xhigh。
  - 派工那条消息写一句用的哪一档。
- **开 worktree**：`create_worktree` 建分支和 worktree，并把会话目录切过去。它不会接项目脚本里的 junction 和本机配置；项目有脚本时用脚本。
- **项目 skill**：DSH 扫项目根下的 `.dsh/skills/` 和 `.agents/skills/`，新加的当前会话马上可见。项目根是往上第一个带 `.git` 的目录，worktree 里的 `.git` 文件也算。

## DSH 的实际经验（Cirra，2026-11-16）

- **写 `.git` 每次都要用户批准。** workspace-write 模式下，提交、开分支、合并、fetch（要写 `FETCH_HEAD`）、`worktree add/remove` 都要用户批。管理会话把这些攒成一条命令，一次批。
- **子代理只改工作树里的文件，写 `.git` 的步骤交回管理会话。**
- **沙箱写不了工作区外的目录。** 要改别的仓库时，让子代理把完整新文件写到工作区里一个不进 git 的草稿目录，再由管理会话一条命令拷过去、提交。
