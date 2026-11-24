# 录制细节：时钟、步骤、参数、各种页面、许可

SKILL.md 只留流程和索引；这里是每一步的具体做法和实测过的坑（原 SKILL.md §2–§6，2026-11-20 移来）。

## 选时钟

| 时钟 | 什么时候用 | 页面要不要改 |
|---|---|---|
| `shim`（默认） | 几乎都用它：CSS 过渡、CSS 动画、`element.animate()`、rAF 写的 JS 动画、canvas、three.js、PixiJS、Live2D | 不用改。`clock-shim.js` 在页面脚本之前注入，接管 `performance.now`、`Date.now`、`requestAnimationFrame`、`setTimeout`/`setInterval`，`Math.random` 用固定种子；CSS / WAAPI 动画每帧停住、拨到同一时刻 |
| `hook` | 要一边录一边从模型里读数（逐帧数值），或者应用自己有一个能按固定步长推的循环、想绕开浏览器截图 | 要在页面上写 `window.__capture(...)`，见 `references/hook.md` |

**不要用** Chrome 自带的虚拟时间（`Emulation.setVirtualTimePolicy`）：试过，rAF 拿到的时间和 `performance.now` 对不上（计数器出现负数），动画也不按给的步长走。

假时钟管不到的：Web Worker 里的动画、`OffscreenCanvas` 在 worker 里画的、`<video>`、`new Date()`（只接管了 `Date.now`）、`crypto.getRandomValues`、`AudioContext.currentTime`。碰到了改用 `hook`，或者在测试页里把它们换掉。

反过来，页面里假设时间自己会走的代码（只按时间切片的循环、按时间限时的 AI 搜索、在页面里 `await` rAF）在假时钟下会卡死，见 `references/fake-clock-pitfalls.md`。

## 步骤和参数说明

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
   - 第 0 帧（触发之后、还没走时钟）也要看：分层的效果（底层先藏起东西、上层下一帧才画）在这一帧会空掉，见 `references/fake-clock-pitfalls.md`「画面不对」。
   - Pillow 存 GIF 用了 `optimize=True`，相邻的相同帧会被合并，GIF 的帧数比录下的少。逐帧检查看原始 PNG，别按 GIF 的帧号对时间。
5. **交给用户**：GIF 用能发文件的工具发过去（一次发几张代表性的，其余说放在哪个文件夹）；说清楚每张左边、右边是什么，录的是哪个版本，哪些没验（比如「用的是软件渲染，边缘比显卡渲染略粗」）。

## 参数怎么定

- 25 帧每秒、每张 2–4 秒；单格 300 像素宽。两格并排的一张大约 0.6–3 MB（角色、渐变多的大一些）。
- 动作长度按动作本身来：`hook` 里可以用片段长度加一点尾巴（停下以后的余势也要录到）。
- **取景按包围盒**：三维角色用 `Box3.setFromObject(scene)` 算到头顶，只按头骨算会把大头盔、呆毛裁掉（实测过）；脚下也留一点。
- 每个变体除了要比的那一处，其他都一样：同一个模型、同一个相机、同一个动作、同样的等待。随机的部分假时钟已经用固定种子，但页面在不同变体里如果多调了几次 `Math.random`，后面的序列会错开，要心里有数。

## 各种页面的做法

- **网页（CSS、WAAPI、rAF）**：页面不用改。要录交互（点开菜单、悬停），在 `--setup` 里触发（加 class、`dispatchEvent`）。实测：rAF 计数器、50 毫秒后才触发的 CSS 过渡、CSS 关键帧动画、`element.animate()` 在假时钟下都准，两个缓动曲线的变体逐帧对得上。
- **PixiJS / Live2D**：页面不用改，Pixi 的 ticker 用的是 rAF 和 `performance.now`，跟着假时钟走；物理也按这个时间算。Live2D 的 Cubism 运行库（`live2dcubismcore.min.js`）要用普通 `<script>` 放在模块前面先加载，引擎在被 import 时就检查它，晚了直接报「Could not find Cubism runtime」。实测 Hiyori 的物理开、关两个变体，两次录 75 帧逐字节相同。
- **three.js / VRM**：页面不用改，自己的 rAF 循环跟着假时钟走（实测 VRM 桌宠类的页面直接能录，开关前后的差别都在）。要逐帧读骨头角度时改用 `hook`，见 `references/hook.md`。
- **游戏、别的 canvas 应用**：同上。如果应用用 `setTimeout` 驱动游戏循环，也在假时钟管辖里。

## 许可和隐私

- 别人做的模型、素材录出来的 GIF，要看它的许可：禁止再分发的（如 VN3 的一些条款）只能自己看、给人看效果，不要放进公开仓库或公开发布；允许使用但要署名的，公开时写上作者。
- GIF 和帧放在不进 git 的地方（项目里专门的本机文件夹，或临时目录），用完把测试页删掉。
