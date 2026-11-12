---
name: animation-capture
description: 把会动的东西按固定时间一帧一帧录下来，做成左右对比的 GIF 或逐帧对照图，给人验收、对比改动前后、放进说明或 PR：网页的 CSS 过渡和动画、element.animate()、requestAnimationFrame 写的 JS 动画、canvas 游戏、three.js / VRM 角色、PixiJS / Live2D 角色都适用。附脚本：record.mjs（无头 Chrome + 假时钟，页面不用改，渲染多慢时间轴都准，两次录的逐帧一样）、make_gif.py（几个变体并排、标签、共用调色板）、clock-shim.js。还讲先逐帧记数值再录 GIF、开关前后怎么做变体、怎么取景，以及实测过的坑（Chrome 虚拟时间不可靠、等加载时别推时钟、Vite 首次打开会刷新页面、Live2D 运行库要先加载、无头 Chrome 用完要关、别人模型的许可）。只要用户想「录个 GIF」「做个动图给我看」「对比一下改之前和改之后的动画」「把动作录下来」「验收一下动画效果」，或者要给动画、动效、角色动作拿出能看的证据，就用这个 skill，即使没提 GIF。Also use for English requests to record an animation as frames or a GIF, make a before/after comparison of motion, or capture deterministic frames from a web page, canvas, three.js, VRM or Live2D scene.
---

# 把动画录成对比 GIF

动画的毛病和改进，靠一张截图看不出来，靠嘴说用户也没法判断。要把它录下来：同一段动画，改之前、改之后（或者开关关、开）按同一条时间轴一帧一帧录，并排放成 GIF，用户一眼就能拍板。

这里的核心只有一条：**时间由我们推，不由真实时钟走。** 无头浏览器画得慢（软件渲染时尤其慢），一秒可能只画十几帧；用真实时间录，每次停在的位置都不一样，左右两边永远对不上。所以录的时候让页面里的时间只在我们说「往前走 40 毫秒」时才走，然后截一张，再走，再截。这样不管机器多慢，第 n 帧永远是第 n × 40 毫秒，两个变体逐帧对得上，同一个变体录两次也一模一样（实测 75 帧全部逐字节相同）。

## 1. 先想清楚：GIF 给人看，数给检查用

GIF 适合验收、对比、放进说明里，**不适合找毛病**。实际碰到过：慢慢举手时膝盖一直弯着 18° 撑了一秒，这是逐帧记角度查出来的，GIF 上看不出来。所以：

1. 先**逐帧记关键数值**（角度、位置、高度、透明度、脚有没有滑），开关前后各一遍，看数对不对；
2. 数对了，再**录 GIF** 给人拍板。

记数值的方法见 `references/hook.md`（页面里写一个录制函数，录画面的同时把每帧的数一起交回来）。

## 2. 选时钟

| 时钟 | 什么时候用 | 页面要不要改 |
|---|---|---|
| `shim`（默认） | 几乎都用它：CSS 过渡、CSS 动画、`element.animate()`、rAF 写的 JS 动画、canvas、three.js、PixiJS、Live2D | 不用改。`clock-shim.js` 在页面脚本之前注入，接管 `performance.now`、`Date.now`、`requestAnimationFrame`、`setTimeout`/`setInterval`，`Math.random` 用固定种子；CSS / WAAPI 动画每帧停住、拨到同一时刻 |
| `hook` | 要一边录一边从模型里读数（逐帧数值），或者应用自己有一个能按固定步长推的循环、想绕开浏览器截图 | 要在页面上写 `window.__capture(...)`，见 `references/hook.md` |

**不要用** Chrome 自带的虚拟时间（`Emulation.setVirtualTimePolicy`）：试过，rAF 拿到的时间和 `performance.now` 对不上（计数器出现负数），动画也不按给的步长走。

假时钟管不到的：Web Worker 里的动画、`OffscreenCanvas` 在 worker 里画的、`<video>`、`new Date()`（只接管了 `Date.now`）、`crypto.getRandomValues`。碰到了改用 `hook`，或者在测试页里把它们换掉。

## 3. 步骤

1. **准备页面和变体。** 变体最好用 URL 参数切（`?v=off`、`?v=on`），页面读参数决定开关；或者用 `--setup` 在开始录前执行一段 JS 切换。只能在本机用的东西（别人做的模型、测试页）放在不进 git 的地方，用完删掉。
2. **起页面。** 本地文件直接用 `file:///…`；要打包的（Vite 等）起一个开发服务器，端口挑空闲的（同一台机器上别的会话可能占着测试端口，别动人家的窗口）。**Vite 第一次打开新页面会优化依赖、然后自己刷新一次**，录到一半页面被刷掉会报「window.xxx 是 undefined」：先用浏览器打开一次预热，或者报错后重跑一次。
3. **录。**
   ```bash
   node <skill>/scripts/record.mjs --out frames --fps 25 --seconds 3 --clip "#stage" \
     --ready "window.model != null" --setup "window.model.motion('TapBody', 0)" \
     --variant "关=http://127.0.0.1:5173/lab.html?v=off" --variant "开=http://127.0.0.1:5173/lab.html"
   ```
   - `--clip` 只截那一块（CSS 选择器）；不写就截整个窗口（`--width`、`--height` 定大小）。
   - `--ready`：模型、贴图是异步读的，写一个「读好了」的表达式。等的时候假时钟**不走**：走了的话每次读得快慢不同，开始录的时刻和随机数用到哪都不一样，两次录的对不上（实测过）。读的过程要靠 `setTimeout` 的页面才加 `--ready-advance 1`。
   - `--wait`：读好以后先走多少假时间（毫秒），让入场动画、弹簧停稳；`--setup` 在它之后执行，执行完马上开始录。`--setup` 里可以 `await`，返回值会被丢掉（three.js 的对象太大，CDP 传不回来）。
   - 脚本自己起无头 Chrome（单独的配置目录），录完自己关，别留着。
   - 默认用显卡渲染（`--render gpu`），开头会打出「WebGL 渲染：…」。如果打出来的是 SwiftShader，说明没用上显卡，CPU 会被吃满好几个核，录 three.js / VRM 时用户会看到 Chrome 一直占 CPU。没有显卡的机器，或者要和以前用软件渲染录的逐帧比较时，加 `--render cpu`。
   - 显卡和软件渲染画出来的边缘不一样，逐帧比较只在同一种渲染里做。
4. **先看对照图，再出 GIF。**
   ```bash
   python <skill>/scripts/make_gif.py frames --variants 关,开 --fps 25 --width 300 --title "Hiyori · 摸头" --sheet sheet.png --out compare.gif
   ```
   `--sheet` 把几帧（默认均匀取 4 帧，`--pick 0,10,20` 指定）排成一张 PNG：自己先读这张图，确认动起来了、左右对得上、取景没裁掉东西，再把 GIF 给用户。GIF 里所有帧共用一个调色板，不会一帧一帧闪色；标签写在画面上方的白条里，不压在内容上。
5. **交给用户**：GIF 用能发文件的工具发过去（一次发几张代表性的，其余说放在哪个文件夹）；说清楚每张左边、右边是什么，录的是哪个版本，哪些没验（比如「用的是软件渲染，边缘比显卡渲染略粗」）。

## 4. 参数怎么定

- 25 帧每秒、每张 2–4 秒；单格 300 像素宽。两格并排的一张大约 0.6–3 MB（角色、渐变多的大一些）。
- 动作长度按动作本身来：`hook` 里可以用片段长度加一点尾巴（停下以后的余势也要录到）。
- **取景按包围盒**：三维角色用 `Box3.setFromObject(scene)` 算到头顶，只按头骨算会把大头盔、呆毛裁掉（实测过）；脚下也留一点。
- 每个变体除了要比的那一处，其他都一样：同一个模型、同一个相机、同一个动作、同样的等待。随机的部分假时钟已经用固定种子，但页面在不同变体里如果多调了几次 `Math.random`，后面的序列会错开，要心里有数。

## 5. 各种页面的做法

- **网页（CSS、WAAPI、rAF）**：页面不用改。要录交互（点开菜单、悬停），在 `--setup` 里触发（加 class、`dispatchEvent`）。实测：rAF 计数器、50 毫秒后才触发的 CSS 过渡、CSS 关键帧动画、`element.animate()` 在假时钟下都准，两个缓动曲线的变体逐帧对得上。
- **PixiJS / Live2D**：页面不用改，Pixi 的 ticker 用的是 rAF 和 `performance.now`，跟着假时钟走；物理也按这个时间算。Live2D 的 Cubism 运行库（`live2dcubismcore.min.js`）要用普通 `<script>` 放在模块前面先加载，引擎在被 import 时就检查它，晚了直接报「Could not find Cubism runtime」。实测 Hiyori 的物理开、关两个变体，两次录 75 帧逐字节相同。
- **three.js / VRM**：页面不用改，自己的 rAF 循环跟着假时钟走（实测 VRM 桌宠类的页面直接能录，开关前后的差别都在）。要逐帧读骨头角度时改用 `hook`，见 `references/hook.md`。
- **游戏、别的 canvas 应用**：同上。如果应用用 `setTimeout` 驱动游戏循环，也在假时钟管辖里。

## 6. 许可和隐私

- 别人做的模型、素材录出来的 GIF，要看它的许可：禁止再分发的（如 VN3 的一些条款）只能自己看、给人看效果，不要放进公开仓库或公开发布；允许使用但要署名的，公开时写上作者。
- GIF 和帧放在不进 git 的地方（项目里专门的本机文件夹，或临时目录），用完把测试页删掉。

## 7. 和别的 skill 的关系

- 静态界面截图、多视口、深色模式：`frontend-verification`（它的 `shot.mjs` 是真实时间截图；要录动画用这里）。
- 做给观众看的宣传片、带配乐的 MP4：`motion-showreel`。
- 角色动画本身怎么做得自然（带动层、物理、动作片段）：`live2d-vrm-animation`。

## 8. 来源与维护

- **来源**：Cirra（桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）2026-11-10 做 3D 人物的带动层、胯和腿、头发甩动时，为了给用户看开关前后的对比而摸索出来的；当时的做法在那个仓库的 `docs/vrm-motion.md` §11–§12、`docs/vrm-spring-force.md` §8（「怎么验」）。经验记在私人 repo 的 [`lessons/animation-capture.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/animation-capture.md)（三维角色那部分也在 `lessons/threejs-vrm-animation.md`）。
- **源头**：[RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的 `skills/animation-capture/`。`~/.claude/skills/` 里的是安装出来的副本，不要直接改。
- **怎么改**：
  - 在 redcarpg-skills 里改，走 PR；`manifest.json` 版本加一，`node scripts/validate.mjs` 通过后发版（tag `animation-capture-v<版本>`），再重装本机副本。
  - 改了脚本，在一个 CSS 页面、一个 Live2D 或 three.js 页面上各录一次，确认两个变体逐帧对得上；同一个变体录两次逐帧相同（用 Pillow 的 `ImageChops.difference` 比）。
  - 改了做法或坑，同步改 lessons 文件；测试用例在 `evals/`。
  - 下面加一行更新记录。
- **更新记录**：
  - 2026-11-12：1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，内容不变。
  - 2026-11-10，Cirra：初版。`record.mjs`（shim、hook 两种时钟）、`clock-shim.js`、`make_gif.py`。在网页（CSS 过渡、CSS 动画、WAAPI、rAF）、Live2D（Hiyori，物理开关）、three.js VRM（带动层开关）上实测过。
  - 2026-11-10，Cirra：测试时查出，页面加载时开始的 CSS / WAAPI 动画在假时钟接住前已按真实时间跑了几毫秒，两个变体差 16.6 ms；定时器触发的过渡要等这一步走完才被接住（50 ms 变 80 ms）。改成：第一次看到的动画从 0 算，每次跑完定时器、rAF 和每步开始时都看一遍。修后实测：50 ms 触发的 600 ms 过渡在 80 ms 时正好 8.0 px，两个变体第 0 帧相同。两个测试用例（网页缓动对比、弹球挤压变形）有、无 skill 都全过：这类任务模型本来会做，skill 省的是每次重写录制脚本的工夫，以及上面这些已经踩过的坑。
  - 2026-11-10，Cirra：录头发甩动（离心力、被拖着）的对比 GIF，Yumeka、千駄ヶ谷篠；三维角色用转盘（把人放进一个能转的 Group）和假时钟里的 `setInterval` 驱动，页面里不写录制代码。
  - 2026-11-10：按新的写法规矩，「维护」一节改成「来源与维护」。
  - 2026-11-10，Cirra：用户发现录 3D 时 Chrome 一直占很多 CPU。`record.mjs` 改成默认用显卡渲染（`--render gpu`；`--render cpu` 还是 SwiftShader），开头打出用的是哪个渲染器；Chrome 退出前删配置目录会 EPERM，现在删不掉就算了，不报错。实测：RTX 3060 Ti 上一帧着色器负载从 154 毫秒降到 8 毫秒；显卡渲染录两次，10 帧逐字节相同；显卡和软件渲染逐帧不同（边缘），不能混着比。
