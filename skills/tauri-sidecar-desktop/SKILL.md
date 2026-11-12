---
name: tauri-sidecar-desktop
description: 做「桌面壳 + 网页前端 + 一个后台进程（sidecar）」结构的桌面应用时的架构做法和坑，以 Tauri 2 + Node sidecar 为主，Electron 加子进程也适用。管这些：透明置顶窗口的鼠标穿透（按像素算可点区域）、前端/Rust/sidecar 三方约定只放一份并用架构测试卡住、文件长度和入口文件上限、一行一个 JSON 的 stdin/stdout 协议、JSON 数据文件的原子写入和坏文件处理、把数据从源码目录搬到 AppData、真起进程的集成测试、打包后的 sidecar 测试、插件宿主（接口版本、按需加载、关掉全收回、内置功能搬成插件）、自己画右键菜单。只要用户在做或者在改这类应用：桌宠、悬浮助手、托盘工具、带 AI 后台的桌面程序，或者问到 Tauri sidecar、externalBin、set_ignore_cursor_events、透明窗口点不穿、sidecar 改了不生效、数据文件写坏、给应用加插件系统，就用这个 skill，即使用户没提「架构」。Also use for English requests about Tauri/Electron apps with a Node sidecar, click-through transparent windows, NDJSON IPC, atomic JSON storage, sidecar e2e tests or a plugin host.
---

# Tauri + sidecar 桌面应用

这个 skill 来自一个天天在用的 Windows 桌宠（见文末「来源与维护」）：Tauri 2 的 Rust 壳，Vite/TS/PixiJS 前端，Node sidecar 跑 AI 和数据，插件放在另一个仓库。下面的做法都实现过、测过，或者在真机上踩过。

一句话原则：**约定只放一份，能用工具卡的都卡住。** 只改一边的话编译都能过，用的时候才坏。规则不写成「大家注意」，写成 CI 会红的测试，红的那条告诉人为什么、怎么改。

## 结构

```
 前端窗口（浏览器里跑）
   │ ① IPC 命令（ipc.ts 包一层 → Rust 命令）   ② 事件（Rust → 窗口、窗口 ↔ 窗口）
 Rust 壳：窗口、托盘、鼠标穿透、读系统、转发
   │ ③ 一行一个 JSON（stdin / stdout），Rust 只按 type 转发，不解析业务字段
 sidecar（Node）：AI、通知、数据
   │ ④ 本机 HTTP 端口（只绑 127.0.0.1，带 token）← 外部程序的 hook
 外部服务
```

前端和 sidecar 共用的消息类型、设置描述、常量放在一个**纯 TS 文件夹**（例如 `sidecar/src/shared/`）：不引 Node、不引包，两边都直接 import。Rust 那边没法共用的，用测试把两边读出来对比。

## 什么时候读哪里

| 要做的事 | 读 |
|---|---|
| 新项目定结构、加架构测试和 lint | 本文「规则」，再看 `references/testing.md` 第 1 节 |
| 透明窗口要点得穿、角色身上要点得到 | `references/click-through.md`，代码在 `references/code/` |
| 存数据文件、从旧位置搬数据 | `references/storage.md`，代码在 `references/code/` |
| 写进程级测试、测打包后的版本 | `references/testing.md` |
| 做插件系统、把内置功能搬成插件 | `references/plugin-host.md` |
| 碰到怪事：sidecar 改了不生效、两边卡死、菜单闪、自动播放没声音 | `references/pitfalls.md` |

## 规则（都用测试或 lint 卡住）

| 规则 | 为什么 |
|---|---|
| 前端只能从 sidecar 引 shared；shared 是纯的；sidecar 不引前端 | 前端跑在浏览器，引了别的就把 Node 代码拖进来 |
| 入口文件谁都不能引；入口只接线，行数上限写在 eslint 里，只许往下调 | 引了入口就是把一整个窗口拖进来；入口一长就没人敢拆 |
| Rust 命令四处对齐：`build.rs` 声明、`main.rs` 注册、capabilities 给了窗口、前端 `ipc.ts` 包了一层 | 少一处，编译过、运行时报「命令不存在」或「没权限」 |
| Rust 转发、接住的消息类型在协议里都有；跨语言常量值一样 | 同上 |
| 数据文件只用 `dataPath()` + `JsonStore`，不用相对源码目录的路径 | 不然数据写回源码目录，`git clean`、换 worktree 就丢 |
| TS 文件 ≤ 600 行，Rust ≤ 800 行；超了的老文件进名单，只许变短 | 文件太长一次读不完（AI 助手尤其吃亏），合并老冲突 |
| 不许没接住的 Promise、漏分支的 `switch`、应用代码里的 `any` | Node 里没接住的 Promise 会让 sidecar 整个退出；新消息类型漏处理不会报错 |

**破例写在明面上：** 改测试里的名单，旁边写一句为什么。不要为了让测试过把规则改松。

**写新功能时：**
- 一个功能一个文件夹；入口里只接一两行。
- 算东西的（不碰 DOM、不碰文件）单独一个文件，好测；接线的写成 `wireX(deps)` 或一个类，依赖从参数传，不放模块级全局变量。
- 文件快到上限就拆，别等。
- 修「接线」类 bug（消息没转、存了没读回来），先写一个能复现的进程级测试再修。

## 开工检查清单

- [ ] shared 文件夹建好，前后端的消息类型都在里面；sidecar 的消息路由用联合类型 + 穷尽 `switch`。
- [ ] 架构测试：引用方向、Rust 命令四处对齐、消息类型、跨语言常量、文件长度名单。
- [ ] eslint：`no-floating-promises`、`no-misused-promises`、`switch-exhaustiveness-check`、`no-explicit-any`、入口文件 `max-lines`。
- [ ] 数据目录用系统的应用数据目录；所有数据路径能用环境变量改（测试要用）。
- [ ] 数据文件走原子写入 + 坏文件放一边（`references/code/json-store.ts`）。
- [ ] 本机端口只绑 127.0.0.1，带 token，校验 Host。
- [ ] 进程级测试 harness：真起 sidecar，数据指到临时文件夹，测完检查源码目录没被写。
- [ ] 打包脚本把 sidecar 打到仓库外面，CI 用打包好的 node 再跑一遍进程级测试。
- [ ] 应用里有「重启后台」的菜单项（只重启 sidecar、重载窗口），开发时省得整个重启。
- [ ] 调试面板放在单独的小窗里，显示穿透区域、窗口尺寸、缩放这些「只能靠猜」的数。

## 来源与维护

- **来源：** Cirra（AI 桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)），2026-10 至 2026-11。
  - 代码：`scripts/architecture.test.ts`、`eslint.config.js`、`src-tauri/src/click_through.rs`、`src-tauri/src/sidecar.rs`、`src/pet/hit-mask.ts`、`sidecar/src/core/json-store.ts`、`sidecar/src/core/write-file.ts`、`sidecar/src/core/data-dir.ts`、`sidecar/src/e2e/harness.ts`、`scripts/stage-release.mjs`、`sidecar/src/plugins/`、`sidecar/src/shared/plugin-api.ts`。
  - 文档：`docs/architecture.md`、`docs/storage-files.md`、`docs/data-dir.md`、`docs/testing.md`、`docs/release-build.md`、`docs/plugins.md`、`docs/custom-menu.md`、`docs/debug-mode.md`、`docs/characters.md`。
  - 经验：私人 repo 的 [`lessons/tauri-sidecar-desktop.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/tauri-sidecar-desktop.md)、`lessons/plugin-host-design.md`、`lessons/windows-dev-pitfalls.md`。
- **源头：** [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的 `skills/tauri-sidecar-desktop/`。`~/.claude/skills/` 里的是安装出来的副本，不要直接改。`references/code/` 里的代码是从 Cirra 改写成不依赖 Cirra 的版本，两边不会自动同步。
- **怎么改：**
  - 在 redcarpg-skills 里改，走 PR；`manifest.json` 版本加一，`node scripts/validate.mjs` 通过后发版（tag `tauri-sidecar-desktop-v<版本>`），再重装本机副本。先看上面三个 lessons 文件有没有新条目可以收进来。
  - 改了 `references/code/` 里的 TS 文件，至少用 `npx tsc --noEmit --strict` 过一遍。
  - Tauri 大版本升级后，对一遍 `set_ignore_cursor_events`、capabilities、sidecar 的写法。
  - 某条做法在别的项目上被推翻了，就改掉它，并在更新记录里写明。
- **更新记录：**
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，来源项目写成链接；内容不变。
  - 2026-11-10 · Cirra · 初版：结构和规则、开工清单；鼠标穿透、存储、测试、插件宿主、坑五篇参考；`json-store.ts`、`write-file-atomic.ts`、`hit-mask.ts`、`click-through.rs` 四份代码；`evals/` 里两个测试提示。
