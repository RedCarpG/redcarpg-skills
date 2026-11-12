# 测试：架构测试、进程级测试、界面测试、打包测试

| 层 | 测什么 | 在哪 | 跑在 |
|---|---|---|---|
| 架构 | 引用方向、三方约定对齐、文件长度 | `scripts/architecture.test.ts` | 和单元测试一起 |
| 单元 | 一个函数、一个类 | 文件旁边的 `*.test.ts`；Rust 的 `mod tests` | `npm test`、`cargo test` |
| 进程级 | 真起一个 sidecar，一行一个 JSON 收发 | `sidecar/src/e2e/` | 单独一个 vitest project |
| 界面 | 组件画出来有没有、点了交回什么 | 文件旁边的 `*.dom.test.ts` | 和单元测试一起 |
| 端到端 | 真开应用点一遍 | 手测清单 | — |

## 1. 架构测试

用 vitest 写，读源码文本做检查，不需要特别的工具：

- **引用方向：** 扫所有 `.ts` 的 `import` / `export ... from`，解析成路径，按规则判断：`src/` 只能引 `sidecar/src/shared/`；shared 只能引 shared、不能引 `node:` 和包；sidecar 不能引 `src/`；入口文件谁都不能引。
- **Rust 命令四处对齐：**
  - 用正则读出 `build.rs` 里声明的命令、`main.rs` 的 `generate_handler![...]`、`capabilities/*.json` 里的 `allow-xxx`、前端 `ipc.ts` 里 `invoke("xxx")` 的名字；
  - 四个集合要一致：前端调的都声明了、声明的都注册了、capabilities 给的都存在、每个命令至少给了一个窗口。
- **消息类型：** Rust `route` 里匹配的 `type` 字符串，都要在 shared 的协议联合类型里。
- **跨语言常量：** 两边各用正则读出值，比较相等。
- **文件长度：** TS > 600 行、Rust > 800 行的不在名单里就失败；在名单里的，比名单记的行数长了也失败（只许变短）；短到上限内了提示从名单删掉。
- **数据路径：** sidecar 里用 `new URL("../…", import.meta.url)` 这类相对源码目录的路径的，不在白名单里就失败（白名单里是找配置、找自带资源的，每项写为什么）。
- 每条失败信息写清楚：违反了什么、为什么不行、怎么改、真要破例改哪个名单。

## 2. 进程级测试（最值的一层）

写一个 harness（例如 `SidecarProcess`）：

- `start({ files })`：建临时文件夹，先写好要的文件（比如一个坏掉的 `todos.json`），再起 sidecar，等到 `ready` 消息。
  - 所有数据路径、家目录（`HOME`、`USERPROFILE`、`APPDATA`）都指到临时文件夹，碰不到真数据，也不会改 `~/.claude` 这类地方。
  - 联网、要装东西的功能关掉；本机端口换一个空的，开发机上开着真应用也能跑。
  - Rust 才答得了的请求（凭据管理器里的 key）由 harness 代答「没有」；`start({ secrets })` 给了的照给的答。
- `send(消息)`、`waitFor(条件, 超时, 从第几条起)`、`mark()`、`since(第几条, 类型)`。
- `stop()`：关 stdin，像壳退出那样；用同一个文件夹再 `start` 就是「重启」，能测「存了以后重启还在」。
- **防线：** 每个测试文件跑完，比较 `sidecar/` 源码目录前后的文件列表（`repoSnapshot()`），有数据写进源码目录就失败。新加数据文件时忘了给它环境变量，这里会红。
- **假的 AI 接口：** 写一个本机 HTTP 的假 OpenAI 兼容接口，`reply({ chunks, hold })` 排一次回答，`hold` 是发完先不结束，用来测打断。聊天从头到尾不花钱、不联网。默认的聊天接口指到一个连不上的本机地址，不起真的 AI 进程。
- **分开跑：** 用 vitest 的 `projects`：单元测试先一起跑完，进程级的再一个文件一个文件地跑。混在一起时，几个 sidecar 同时启动把 CI 的 Windows 机器压慢，别的测试跟着超时（第一次上 CI 就碰到）。
- 一个文件里共用一个 sidecar（`beforeAll` 起），要干净状态的场景自己 `start` 一个。
- 不用固定的 `setTimeout` 等，用 `waitFor`、`expect.poll`。
- 值得写的场景：ready 之前先报坏文件；看不懂的消息回 error 后接着干活；stdin 关了自己退出；坏数据文件放一边、再存不盖掉；本机端口没 token、token 错、Host 错、不是 JSON 都不收；聊天的消息顺序、打断、出错分类；插件打开、关掉、重启还在。

## 3. 界面测试

- 文件第一行 `// @vitest-environment happy-dom`。
- happy-dom **没有排版**：位置、大小都是 0。只测「有没有、写了什么、点了交回什么、什么时候出现和消失」。好不好看、摆得对不对还是要人看。
- 计时用假时钟，要连 `requestAnimationFrame`、`performance`、`Date` 一起假掉：

```ts
vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"] });
vi.advanceTimersByTime(6000);
```

- 设置卡片这类由数据描述生成的界面，测试用真的描述，描述改了测试跟着测。
- 内容随机的（台词库挑的句子），断言写「包含哪些」，不写整句。

## 4. 打包后的版本也要测

- 打包脚本（例如 `scripts/stage-release.mjs`）把这些放进一个文件夹：
  - 现编的 sidecar：直接编进打包文件夹，不用平时的 `dist`，那里可能有已删文件编出来的旧东西；
  - 只装运行依赖的 `node_modules`：照 lockfile 在干净文件夹里 `npm ci --omit=dev --os <平台> --cpu <架构>`；
  - 固定版本的 `node.exe`：下载后核对 SHA256；
  - 只读配置。
- CI 每次多一步：打一份到**仓库外面**（`$RUNNER_TEMP/...`），设环境变量让 harness 用打包好的 node 起打包好的 sidecar，把进程级测试整个再跑一遍。漏打包了什么依赖、路径不对，这里就红。
- **一定要在仓库外面：** 放在仓库里的话，node 找依赖会一路往上找到仓库的 `node_modules`，漏打包也起得来。试过：故意删掉一个依赖（MCP SDK），放在仓库里照样全过。harness 检查打包文件夹往上有没有 `node_modules`，有就直接报错。
- 参考大小（2026-11，Windows x64）：Node 83 MB；依赖 330 MB，其中 Claude Agent SDK 带的 `claude.exe` 占 297 MB；sidecar 本身 1 MB。
- 安装包配置单独一份（例如 `tauri.release.conf.json`），只在出正式版时加上，平时的 `tauri dev` 不用先打包。用测试对着查它的 resources 路径和 Rust 找 sidecar 的路径一致。
