---
name: tauri-sidecar-desktop
description: 做「桌面壳 + 网页前端 + 后台进程（sidecar）」的桌面应用（Tauri 2 + Node 为主，Electron 也适用）：透明窗口鼠标穿透、三方约定和架构测试、NDJSON 管道、JSON 原子写入和数据迁移、进程级和打包测试、插件宿主。问到 externalBin、set_ignore_cursor_events、sidecar 改了不生效时用。Also for Tauri/Electron apps with a Node sidecar.
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
| 新项目定结构、加架构测试和 lint、开工清单 | `references/architecture-rules.md`，再看 `references/testing.md` 第 1 节 |
| 写新功能（文件夹怎么分、接线怎么写、修接线 bug） | `references/architecture-rules.md` 第 2 节 |
| 透明窗口要点得穿、角色身上要点得到 | `references/click-through.md`，代码在 `references/code/` |
| 存数据文件、从旧位置搬数据 | `references/storage.md`，代码在 `references/code/` |
| 写进程级测试、测打包后的版本 | `references/testing.md` |
| 做插件系统、把内置功能搬成插件 | `references/plugin-host.md` |
| 碰到怪事：sidecar 改了不生效、两边卡死、菜单闪、自动播放没声音 | `references/pitfalls.md` |

**硬规则（细节和理由见 `references/architecture-rules.md`）：** 引用方向（前端只引 shared，shared 是纯的）、Rust 命令四处对齐、数据只走 `dataPath()` + `JsonStore`、文件长度上限只许往下调、不许漏接的 Promise 和漏分支的 `switch`。破例写在明面上，不为了让测试过把规则改松。

## 来源与维护

- **来源：** Cirra（AI 桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)），2026-10 至 2026-11。
  - 代码：`scripts/architecture.test.ts`、`eslint.config.js`、`src-tauri/src/click_through.rs`、`src-tauri/src/sidecar.rs`、`src/pet/hit-mask.ts`、`sidecar/src/core/json-store.ts`、`sidecar/src/core/write-file.ts`、`sidecar/src/core/data-dir.ts`、`sidecar/src/e2e/harness.ts`、`scripts/stage-release.mjs`、`sidecar/src/plugins/`、`sidecar/src/shared/plugin-api.ts`。
  - 文档：`docs/architecture.md`、`docs/storage-files.md`、`docs/data-dir.md`、`docs/testing.md`、`docs/release-build.md`、`docs/plugins.md`、`docs/custom-menu.md`、`docs/debug-mode.md`、`docs/characters.md`。
  - 经验：私人 repo 的 [`lessons/tauri-sidecar-desktop.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/tauri-sidecar-desktop.md)、`lessons/plugin-host-design.md`、`lessons/windows-dev-pitfalls.md`。
- **源头：** 开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/tauri-sidecar-desktop/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。`references/code/` 里的代码是从 Cirra 改写成不依赖 Cirra 的版本，两边不会自动同步。
- **怎么改：**
  - 在私人仓 `skills/tauri-sidecar-desktop/` 改，直接推 `main`（见私人仓 `AGENTS.md`）；发版时由维护会话升 `manifest.json` 版本、发到公开仓。先看上面三个 lessons 文件有没有新条目可以收进来。
  - 改了 `references/code/` 里的 TS 文件，至少用 `npx tsc --noEmit --strict` 过一遍。
  - Tauri 大版本升级后，对一遍 `set_ignore_cursor_events`、capabilities、sidecar 的写法。
  - 某条做法在别的项目上被推翻了，就改掉它，并在更新记录里写明。
- **更新记录：**
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，来源项目写成链接；内容不变。
  - 2026-11-10 · Cirra · 初版：结构和规则、开工清单；鼠标穿透、存储、测试、插件宿主、坑五篇参考；`json-store.ts`、`write-file-atomic.ts`、`hit-mask.ts`、`click-through.rs` 四份代码；`evals/` 里两个测试提示。
