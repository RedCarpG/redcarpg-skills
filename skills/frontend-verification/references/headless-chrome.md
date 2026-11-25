# 选工具、无头截图的做法和坑

原 SKILL.md §1–§3，2026-11-20 移来。脚本在 `scripts/`，垫片和探针页在 `assets/`（路径相对这个 skill 的目录）。

## 先选工具：内置预览还是无头 Chrome，shot.sh 还是 shot.mjs

1. **优先用 Claude Code 自带的浏览器预览**（`preview_start` 起 dev server，再用 `read_page`、截图、`resize_window` 的 mobile 预设和 `colorScheme` 做手机、深浅色）。它是真浏览器，能点、能读控制台，开销最小。
2. **预览覆盖不到时，改用无头 Chrome**：
   - 预览面板被隐藏（`tabs_context` 会说 hidden）：隐藏页面里 `requestAnimationFrame` 不跑，动画停在第一帧，截图会骗人；
   - 要一次批量截多个视口、主题、语言；
   - 要先进入某个状态（写 localStorage、点开抽屉）再截；
   - 要拿 DOM 结果或文字，而不是只看图；
   - 要看打印效果；没有 dev server，只有一个 HTML 文件。
   - 会话没有项目文件夹（「No folder」的临时工作区）：内置浏览器只给项目文件夹开本地文件访问，打不开 `file://`。用无头 Chrome，或 `preview_start` 起一个只绑 127.0.0.1 的静态服务再开。

两个脚本都在 `scripts/` 下，按需要选：

| | `shot.sh` | `shot.mjs` |
|---|---|---|
| 依赖 | bash + Chrome，没有别的 | Node ≥ 22 + Chrome |
| 时间 | 虚拟时间（`--virtual-time-budget`，快进） | 真实时间 |
| 视口 | 窗口尺寸；<500 宽自动套 iframe；布局视口比窗口小一圈 | 精确的 W×H |
| rAF 动画 | **不跑**（要垫片，见下面「无头 Chrome 的几个坑」） | 正常跑 |
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

## 无头截图的做法

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
5. **`shot.mjs --eval` 在 load 之后马上跑**，异步启动的页面可能还没渲染，点按钮会点到 null。包一层 `setTimeout`，或者先 `--wait` / `--wait-for`。要 canvas 画出来的图，用 `--dom` 存 HTML，再从里面解出 `data:` URI。
6. **自己拼 `chrome --headless --screenshot=` 时写绝对路径。** 相对路径会静默失败：退出码 0，文件没生成，只在 stderr 报 cannot find path。每次给一个临时 `--user-data-dir`，设超时并重试一次（偶尔卡住不退出，约 15 次 1 次）；清理临时目录时容忍出错（Python `ignore_cleanup_errors=True`），Chrome 子进程可能还占着。
7. **叠层改了布局高度，要逼页面重排。** 只在 `resize` 时重算的布局（按剩余空间算画布大小），截图脚本注入叠层改了某一行高度后不会自己重排。截前把视口高度来回改 1 像素；重排会整页重画、冲掉叠层改过的东西，所以重排之后再摆一次叠层，再截。
8. Chrome 路径脚本会自己找：环境变量 `CHROME`，Windows（Git Bash）的 `Program Files`、`Program Files (x86)`、`%LOCALAPPDATA%`，macOS 的 `/Applications/…`，Linux 的 `google-chrome`、`chromium` 等，找不到时退到 Edge。找不到就用 `--chrome PATH`。

## 无头 Chrome 的几个坑（都在 Chrome 157 / Windows 11 上实测过）

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
- **隐藏的预览面板里不只 rAF：** `<dialog>` 的 `close` 事件也会迟迟不来，见 `css-dom-pitfalls.md`「弹窗」。
- **要 WebGL 或量性能**（显卡、swiftshader、第一次画卡顿）见 `gpu-and-webgl.md`。

遇到截图和预期不符，先截一次 `assets/probe.html`（它把真实视口、配色、语言、rAF 次数印在页面上）：

```bash
node $S/shot.mjs probe.png 375x812 $S/../assets/probe.html --wait 3500
```
