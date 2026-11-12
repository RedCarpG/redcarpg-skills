---
name: frontend-verification
description: 改完网页/前端界面（CSS、布局、组件、动画、响应式、深色模式、打印）之后怎样验证并拿出证据：先用内置浏览器预览，覆盖不到时用无头 Chrome 截图或读 DOM（预览面板被隐藏、批量截多个视口、要先进入某个状态、要拿 DOM 结果），附可直接运行的 shot.sh / shot.mjs 脚本。还收录无头 Chrome 的坑（requestAnimationFrame 动画停在第一帧、375 宽被撑成 500、深色模式跟随系统）、字体不显示或像宋体的排查、整页截图里滚动动画区块空白、vitest 排除 .claude worktree，以及桌面/手机/英文/繁體/深浅色/打印的核对清单。只要改了界面、要截图、要查响应式或深色模式、动画不动，或者准备说“界面改好了”，就用这个 skill，哪怕用户只说“看看效果”。Use after any UI/CSS/layout/animation change to verify it, take screenshots at several viewports, check dark mode / mobile / print, or debug animations frozen in headless Chrome.
---

# 前端改动验证

界面改动的错误大多只有看到才发现：溢出、深色下看不清、动画没动、手机上挤在一起。所以改完不要凭代码推断“应该没问题”，要把页面真的渲染出来，看过，再把证据交给用户。

## 1. 先选工具

1. **优先用 Claude Code 自带的浏览器预览**（`preview_start` 起 dev server，再用 `read_page`、截图、`resize_window` 的 mobile 预设和 `colorScheme` 做手机、深浅色）。它是真浏览器，能点、能读控制台，开销最小。
2. **预览覆盖不到时，改用无头 Chrome**：
   - 预览面板被隐藏（`tabs_context` 会说 hidden）：隐藏页面里 `requestAnimationFrame` 不跑，动画停在第一帧，截图会骗人；
   - 要一次批量截多个视口、主题、语言；
   - 要先进入某个状态（写 localStorage、点开抽屉）再截；
   - 要拿 DOM 结果或文字，而不是只看图；
   - 要看打印效果；没有 dev server，只有一个 HTML 文件。

两个脚本都在 `scripts/` 下，按需要选：

| | `shot.sh` | `shot.mjs` |
|---|---|---|
| 依赖 | bash + Chrome，没有别的 | Node ≥ 22 + Chrome |
| 时间 | 虚拟时间（`--virtual-time-budget`，快进） | 真实时间 |
| 视口 | 窗口尺寸；<500 宽自动套 iframe；布局视口比窗口小一圈 | 精确的 W×H |
| rAF 动画 | **不跑**（要垫片，见 §3） | 正常跑 |
| 输出 | `.png` 截图、`.html` DOM、`.pdf` 打印 | PNG，可同时 `--dom`、`--text`、`--full` |
| 适合 | 快速截一张、读 DOM、导 PDF | 手机宽度、动画、先设状态再截、整页 |

拿不准就用 `shot.mjs`：它更接近真浏览器。`shot.sh` 的好处是一行命令、不依赖 Node。

调用方式（Bash 工具里用；PowerShell 里直接 `node` 调 `shot.mjs` 即可，PowerShell 里的 `bash` 可能是 WSL 的，不要用它跑 `shot.sh`）：

```bash
S=<这个 skill 的目录>/scripts   # 装在用户级时一般是 ~/.claude/skills/frontend-verification/scripts
bash $S/shot.sh  out.png 1440x900 http://localhost:5173/ 8000 --dark    # 虚拟时间 8 秒；省略预算默认 8000
bash $S/shot.sh  dom.html 1440x900 http://localhost:5173/ 12000          # 读渲染后的 DOM
bash $S/shot.sh  print.pdf 1000x700 http://localhost:5173/ 6000          # 打印媒体
node $S/shot.mjs out.png 375x812 http://localhost:5173/ --wait-for "#app .loaded" --dark
node $S/shot.mjs out.png 1440x900 URL --pre "localStorage.setItem('lang','en')" --eval "document.querySelector('#tab-2').click()" --text --dom dom.html
```

`shot.mjs -h` 列出全部选项（`--lang`、`--print`、`--full`、`--mobile`、`--scale` 等）。每次输出一行：实际图片尺寸、体积，`shot.mjs` 还打印页面里真实的 `innerWidth`、`scrollWidth`、配色、语言。**读这一行**：它告诉你截到的是不是你以为的那个环境。

## 2. 无头截图的做法

1. **写一个临时根页面，只挂要看的组件**，用固定的假数据。好处：不用走登录和路由，状态可复现，坏了也只影响这一页。以 Vite + React 为例：

   ```html
   <!-- shot-root.html（项目根目录，临时） -->
   <div id="root"></div><script type="module" src="/src/__shot.tsx"></script>
   ```
   ```tsx
   // src/__shot.tsx（临时）
   import { createRoot } from 'react-dom/client'
   import { Thing } from './components/Thing'
   createRoot(document.getElementById('root')!).render(<Thing {...fixedFakeProps} />)
   ```
   dev server 起着，截 `http://localhost:5173/shot-root.html`。
2. **截完删掉**这两个文件，再 `git status --short` 确认没留下，不提交进仓库。
3. 脚本里已经设好的参数（自己拼命令行时照用）：`--headless=new`、`--window-size=W,H`、`--virtual-time-budget=毫秒`、`--force-device-scale-factor=1`、单独的 `--user-data-dir`（不碰用户平时用的 Chrome 配置，也避免和已开的 Chrome 抢同一个配置目录）、`--hide-scrollbars`。
4. 时间预算：太短会截到加载中的页面（白屏、骨架屏），一般 6000–12000；有长动画就加大。拿到图一定要看一眼，确认不是白屏或加载中；`shot.mjs` 的 `--wait-for "选择器"` 比猜时间可靠。
5. Chrome 路径脚本会自己找：环境变量 `CHROME`，Windows（Git Bash）的 `Program Files`、`Program Files (x86)`、`%LOCALAPPDATA%`，macOS 的 `/Applications/…`，Linux 的 `google-chrome`、`chromium` 等，找不到时退到 Edge。找不到就用 `--chrome PATH`。

## 3. 无头 Chrome 的几个坑（都在 Chrome 157 / Windows 11 上实测过）

- **`requestAnimationFrame` 不跑。** 隐藏的预览面板、无头 iframe、虚拟时间（`shot.sh`）里它几乎不触发，所以逐层亮起、粒子、数字滚动之类的动画停在第一帧，看起来像 bug，其实是验证环境的问题。处理：
  - 用 `shot.mjs`（真实时间，rAF 正常，实测 3 秒约 180 次）；或者
  - 用 `shot.sh` 时，在**临时测试页**里引入 `assets/raf-shim.js`，把 rAF 换成 `setTimeout(cb, 16)`（实测从 1 次变成 188 次），再用 `.html` 输出（`--dump-dom`）读结果：数一数有多少元素已经带上“亮起”的 class 或样式，比盯着一张图可靠。垫片只放在测试页里，不进产品代码。
- **375 宽截不出 375。** `headless=new` 把布局宽度钳到至少 500，截图只是把 500 宽的布局裁成 375，图里内容被切掉，却看不出来。`shot.sh` 遇到 W<500 会把页面放进 W×H 的 iframe 里再截（右侧多出的灰条是正常的）；要精确视口用 `shot.mjs`。
- **布局视口比 `--window-size` 小。** Windows 上约小 18×96 像素（1440×900 的窗口里 `innerWidth` 是 1422），断点恰好卡在边界时会差一点。`shot.mjs` 没有这个问题。
- **深浅色默认跟着系统。** 不指定的话，机器是深色主题截出来就是深色，换一台机器结果不同。脚本总是显式指定：默认浅色，`--dark` 深色。自己拼命令行时注意 `--blink-settings=preferredColorScheme=` 的取值是 **0 = 深色，1 = 浅色**（和直觉相反）。
- **整页截图里，`animation-timeline: view()` 的区块是空白的。** 滚动驱动的动画在整页截图（`shot.mjs --full`）时不推进，没进入视野的区块停在 `opacity: 0`，看起来像页面坏了，其实是截图方式的问题（实测：3 个区块的页面，整页图里只有第一个有内容）。两种办法：
  - 滚到那里再截一屏：`shot.mjs out.png 1440x900 URL --eval "scrollTo(0, 1650)" --wait 800`，或用 `scrollIntoView()` 对准那个区块；
  - 截图前临时关掉动画：`--eval "document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'*{animation:none!important}'}))"`，再 `--full`（实测三个区块都出来了）。这样看到的是区块落定后的样子，滚动过程中的效果要另外滚着看。
- **页面的 localStorage 不在你这边。** 无头 Chrome 用全新配置，没有用户的设置和登录。要某个状态就自己设（`shot.mjs --pre`）。

遇到截图和预期不符，先截一次 `assets/probe.html`（它把真实视口、配色、语言、rAF 次数印在页面上）：

```bash
node $S/shot.mjs probe.png 375x812 $S/../assets/probe.html --wait 3500
```

## 4. 字体像宋体，不一定是 bug

截图里中文突然变成宋体/明体，多半是网页字体还没加载完（或这台机器没有那个字体），不是 CSS 写错。先在真浏览器（内置预览）里确认，或用 `shot.mjs --eval "document.fonts.ready.then(() => document.fonts.status)"` 等字体就绪后再截；确认真浏览器里也是宋体，才去查 `font-family` 和 `@font-face`。

真浏览器里也不对时，**按字体状态分流**，不要凭感觉先猜缓存。在出问题的那个浏览器的控制台里，统计 `document.fonts` 中这个字体各状态的个数：

```js
[...document.fonts].filter(f => f.family.includes('字体名')).reduce((a, f) => (a[f.status] = (a[f.status] || 0) + 1, a), {})
```

- **有 `error`：去查下载。** 开发服务器返回 403（例如 worktree 里的 `node_modules` 是指向工作区外的 junction，要给 Vite 配 `server.fs.allow`）、404、缓存过期。看 Network 里这个字体文件的状态码。
- **全是 `unloaded`：浏览器根本没去请求，说明 CSS 没用到这个字体。** 去查覆盖它的规则（比如按 `:root[lang]` 换字体）和用户在设置里选的语言；界面语言换了，字体按设计换掉，是正常行为，不是加载失败。
- **隐私窗口（InPrivate/无痕）正常、平时的窗口不正常：** 先比较两边的应用设置（localStorage），再怀疑 service worker 缓存。

为什么这样排：一次“毛笔字没加载”的报告，原因其实是用户把界面设成了繁體，按设计换成了楷体；先按缓存方向查，绕了远路。

## 5. 数据用确定的来源核对

页面上的数字、日期、排盘结果，不能凭“看起来对”。找一个独立且确定的来源逐项比对：成熟的库、官方数据集、已知的测试向量。例如某天的宜忌、节气、干支，用一个公认的历法库算一遍再和页面对；金额、时区转换、排序结果同理。比对用脚本做，把差异列出来，不要靠眼睛扫。

## 6. 跑测试

- **vitest 要排除 `.claude/**`**：那里是别的会话的 worktree，里面有一份份仓库副本，不排除就会把它们的测试一起跑，既慢又互相干扰。`npx vitest run --exclude ".claude/**"`（CLI 的 `--exclude` 是在默认排除之上追加）；写进配置要保留默认值：`exclude: [...configDefaults.exclude, '.claude/**']`，否则 `node_modules` 也会被扫进去。
- **负载下不稳定的测试，单独再跑一次再下结论**：比如构建类测试（PWA 构建）在机器忙、多个会话同时在跑时容易超时。单独跑 `npx vitest run 那个文件`，通过就报告“整套跑时超时，单独跑通过”，失败才是真问题。不要为了让它变绿而加大超时或改断言。
- **改了默认值之后**（比如把默认风格换掉），依赖旧默认值的测试改成**显式传入旧值**，不去改断言。原因：断言记录的是旧行为的约定，显式传入旧值，这条路径仍然有测试守着；改断言等于悄悄把约定改了。

## 7. 核对清单

每次界面改动都过一遍，哪一项不适用就写明“不适用”，不要静默跳过：

| 项 | 怎么做 |
|---|---|
| 桌面 1440×900 | `shot.mjs out.png 1440x900 URL`，或预览里默认尺寸 |
| 手机 375 宽 | `shot.mjs m.png 375x812 URL`，看 `scrollWidth` 是否大于 `innerWidth`（横向溢出）；加 `--mobile` 可模拟触屏，溢出时 `innerWidth` 会被撑大 |
| 英文界面 | 应用有语言开关就用 `--pre` 设它的 localStorage；没有就 `--lang en-US` |
| 繁體（如有） | 同上，`--lang zh-TW` 或应用自己的设置 |
| 深色、浅色 | `--dark`、`--light` 各一张，看对比度、边框、阴影 |
| 打印 | `shot.sh print.pdf 1000x700 URL` 然后读 PDF，或 `shot.mjs --print`；装饰性的层、背景、动画不应出现，正文不被截断 |

要批量截，用循环，每个组合一张，文件名带上组合：

```bash
for s in 1440x900 375x812; do for t in light dark; do
  node $S/shot.mjs "$OUT/home-$s-$t.png" $s "$URL" --$t --wait 2500
done; done
```

## 8. 取证

交给用户的证据，是**截图，或者读出来的 DOM 和文字**，不是一句“我看过了”。

- 截完先自己看一遍图（读取 PNG），并看脚本打印的尺寸、配色是不是你要的那组；
- 给出文件的完整路径，让用户能点开；能用工具把图发给用户就发；
- 用 DOM 当证据时，贴出具体的数值或片段（“12 个格子里 12 个带 `lit` class”），不要只写“已确认”；
- 写清楚覆盖了什么、没覆盖什么（“没有在 Safari 上看过”“动画只验证了最终状态”）；
- 改动之后再截，不要拿改动前的旧图当证据；
- 临时文件（测试页、截图脚本的产物）清理掉，`git status` 里只剩真正的改动。

## 来源与维护

- **来源：** [ChroniQ](https://github.com/RedCarpG/ChroniQ)（PWA，2026-11）里反复做截图验证的经验：lessons 文件 [`lessons/frontend-verification.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/frontend-verification.md)（私人 repo）；旧脚本 `appshot.sh`（路径写死，已改写为通用的 `scripts/shot.sh`）。§3 里的坑和 `shot.mjs` 是 2026-11-10 做这个 skill 时在 Chrome 157 / Windows 11 上逐项实测得到的。
- **源头：** [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的 `skills/frontend-verification/`。`~/.claude/skills/` 里的是安装出来的副本，不要直接改。
- **怎么改：** 在 redcarpg-skills 里改，走 PR。改了脚本，用 `assets/probe.html` 重跑一遍（`shot.sh` 和 `shot.mjs` 各一次，看 `innerWidth`、配色、rAF 次数是否符合预期）；改了坑或做法，同步改 lessons 文件；`manifest.json` 版本加一，在下面加一行更新记录，`node scripts/validate.mjs` 通过后发版（tag `frontend-verification-v<版本>`），再重装本机副本。
- **更新记录：**
  - 2026-11-12：1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，脚本路径改成相对这个 skill 的目录；内容不变。
  - 2026-11-10，ChroniQ：并入两条新经验：字体不显示时按 `document.fonts` 状态分流（§4，来自 lessons/frontend-verification.md 第 3 条）；整页截图里 `animation-timeline: view()` 区块空白（§3，来自 lessons/immersive-web-design.md 第 16 条，两种办法都用样例页实测过）。
  - 2026-11-10，ChroniQ：初版。`shot.sh`（无头 Chrome，PNG/DOM/PDF）、`shot.mjs`（CDP，真实时间、精确视口）、`assets/raf-shim.js`、`assets/probe.html`。
