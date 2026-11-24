---
name: frontend-verification
description: 改完网页界面（CSS、布局、响应式、深色模式、动画、打印）后渲染出来验证并拿出截图或 DOM 证据：内置预览优先，覆盖不到用无头 Chrome（附 shot.sh / shot.mjs）；含 rAF 动画停在第一帧、375 宽被撑成 500 等坑和多视口清单。Verify UI changes with screenshots, viewports, dark mode.
---

# 前端改动验证

界面改动的错误大多只有看到才发现：溢出、深色下看不清、动画没动、手机上挤在一起。改完不要凭代码推断「应该没问题」，要把页面真的渲染出来，看过，再把证据交给用户。

## 流程

1. **选工具。** 优先用 Claude Code 自带的浏览器预览（`preview_start`、`read_page`、截图、`resize_window` 的 mobile 预设、`colorScheme`）。覆盖不到时用无头 Chrome：预览面板被隐藏（rAF 不跑，截图会骗人）、批量截多个视口/主题/语言、要先进入某个状态再截、要拿 DOM 或文字、看打印、只有一个 HTML 文件。
2. **截。** 拿不准用 `scripts/shot.mjs`（真实时间、精确视口）；只要一行命令、不依赖 Node 时用 `scripts/shot.sh`（虚拟时间，rAF 不跑）。
   ```bash
   S=<这个 skill 的目录>/scripts
   node $S/shot.mjs out.png 375x812 http://localhost:5173/ --wait-for "#app .loaded" --dark
   bash $S/shot.sh  out.png 1440x900 http://localhost:5173/ 8000 --dark
   ```
   PowerShell 里直接 `node` 调 `shot.mjs`，不要用那里的 `bash` 跑 `shot.sh`（可能是 WSL 的）。
3. **读脚本打印的那一行**（实际尺寸、`innerWidth`、`scrollWidth`、配色、语言），确认截到的是你以为的环境；再自己看一遍图，确认不是白屏或加载中。
4. **过核对清单**：桌面 1440×900、手机 375 宽（看横向溢出）、英文、繁體（如有）、深色和浅色、打印。不适用的写明「不适用」，不要静默跳过。
5. **交证据**：截图或读出的 DOM/文字（贴具体数值），给完整路径；写清覆盖了什么、没覆盖什么；改动之后再截；临时测试页和产物清掉，`git status` 只剩真正的改动。

## 硬规则（常见的假阳性）

- 动画停在第一帧，多半是验证环境的问题（隐藏面板、`shot.sh` 的虚拟时间里 rAF 不跑），不是 bug。
- `headless=new` 把布局宽度钳到至少 500：要精确 375 宽用 `shot.mjs`。
- 深浅色默认跟系统：总是显式指定 `--dark` / `--light`。
- 整页截图里 `animation-timeline: view()` 区块是空白的：滚到那里截，或临时关动画。
- 中文变宋体多半是字体还没加载完，不是 CSS 错；先在真浏览器确认。
- vitest 要排除 `.claude/**`（别的会话的 worktree）。
- 页面上的数据（日期、金额、排盘）用独立确定的来源脚本比对，不靠眼睛。

## 什么情况读哪里

| 情况 | 读 |
|---|---|
| 两个脚本的完整对比、全部命令示例、临时根页面、Chrome 参数、时间预算、找 Chrome | `references/headless-chrome.md` |
| 截图和预期不符（rAF、375 宽、视口小一圈、深浅色取值、整页空白、localStorage），用 `assets/probe.html` 探测 | `references/headless-chrome.md`「无头 Chrome 的几个坑」 |
| 字体像宋体、不显示，按 `document.fonts` 状态分流 | `references/fonts.md` |
| 数据核对、vitest 排除和写法、负载下不稳定的测试、`textContent`、`page.click` 等页面测试的坑 | `references/tests-and-data.md` |
| `[hidden]` 露出来、手机页被撑宽、深色盖掉禁用态、弹窗回车或 close 不来 | `references/css-dom-pitfalls.md` |
| 量对比度、按钮宽度、拖动区；改前改后的像素对比 | `references/measure-dont-eyeball.md` |
| WebGL、显卡或 swiftshader、量画一帧多久、第一次画卡几百毫秒、量内存 | `references/gpu-and-webgl.md` |
| 核对清单每项怎么截、批量截的循环、取证要求 | `references/checklist.md` |
| 完整来源、改法、更早的更新记录 | `references/maintenance.md` |

录动画对比 GIF（假时钟逐帧）用 `animation-capture`。

## 来源与维护

- **来源：** [ChroniQ](https://github.com/RedCarpG/ChroniQ)（PWA，2026-11）反复做截图验证的经验，lessons 文件 [`lessons/frontend-verification.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/frontend-verification.md)；坑和 `shot.mjs` 在 Chrome 157 / Windows 11 上实测。细节见 `references/maintenance.md`。
- **源头：** [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/frontend-verification/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills)。各 agent 的 skills 目录、公开仓、claude.ai 上的都是副本，不要直接改。
- **怎么改：** 改了脚本，用 `assets/probe.html` 重跑（`shot.sh`、`shot.mjs` 各一次，看 `innerWidth`、配色、rAF 次数）；改了坑或做法同步 lessons；发版时 `manifest.json` 升版本；下面加一行更新记录。
- **更新记录：**（更早的完整记录见 `references/maintenance.md`）
  - 2026-11-24 · skill 管理会话 · 1.1.0，收进 11-20 之后的 25 条经验：新增 `css-dom-pitfalls.md`、`measure-dont-eyeball.md`、`gpu-and-webgl.md`，`headless-chrome.md`、`tests-and-data.md`、`checklist.md` 补坑（来源多为 cirra-game-qiping、xhs-creator、style-recipes）
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-12：1.0.0，搬进 redcarpg-skills 公开发布。
  - 2026-11-10，ChroniQ：初版（`shot.sh`、`shot.mjs`、`raf-shim.js`、`probe.html`）；并入字体排查和整页截图空白两条。
