# tauri-sidecar-desktop

> 约定只放一份，能用工具卡住的都卡住。

「桌面壳 + 网页前端 + 一个后台进程（sidecar）」结构的桌面应用，主要是 Tauri 2 加 Node sidecar，Electron 加子进程也适用。这类应用最容易坏在三方约定只改了一边：编译都能通过，用的时候才出错。这个 skill 把这些约定写成 CI 会报红的测试，报错信息会告诉人为什么错、怎么改。

## 结构

```
 前端窗口
   │ IPC 命令 / 事件
 Rust 壳：窗口、托盘、鼠标穿透、转发
   │ 一行一个 JSON（stdin / stdout），只按 type 转发
 sidecar（Node）：AI、通知、数据
   │ 本机 HTTP 端口（只绑 127.0.0.1，带 token）← 外部程序的 hook
```

## 包含什么

| | |
|---|---|
| `references/click-through.md` | 透明置顶窗口按像素算可点区域，做到鼠标穿透 |
| `references/storage.md` | JSON 数据文件的原子写入、坏文件处理、把数据从源码目录搬到 AppData |
| `references/testing.md` | 架构测试、真起进程的集成测试、打包后的 sidecar 测试 |
| `references/plugin-host.md` | 插件宿主：接口版本、按需加载、关掉时全部收回、把内置功能搬成插件 |
| `references/pitfalls.md` | 在真机上踩过的坑 |
| `references/code/` | 可直接复制的实现：`json-store.ts`、`write-file-atomic.ts`、`hit-mask.ts`、`click-through.rs` |
| `evals/` | 2 个测试用例：桌宠窗口的鼠标穿透、崩溃后设置丢失 |

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s tauri-sidecar-desktop
```

## 来源

来自每天都在用的 Windows 桌宠 [Cirra](https://github.com/RedCarpG/cirra-deskpet)：Tauri 2 的 Rust 壳，Vite/TS/PixiJS 前端，Node sidecar 跑 AI 和数据，插件放在另一个仓库。`references/code/` 是从它改写成不依赖 Cirra 的版本。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
