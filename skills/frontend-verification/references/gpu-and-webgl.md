# 显卡、WebGL 和性能量法

2026-11-24 收进，来自 lessons 里 11-23、11-24 的几条（棋枰光影、落子卡顿）。在 Chromium / Windows 11 上实测。

## 无头 Chromium 跑页面测试：本机先走显卡

- 无头 Chromium 能用显卡：`--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist`。起来后读一次 `WEBGL_debug_renderer_info` 判断是不是真显卡，不是就退回。
- **别给所有测试都加 swiftshader。** `--use-angle=swiftshader --enable-unsafe-swiftshader` 会让整页合成都走软件 GL，比不带参数贵几十倍：实测全套页面测试 CPU 从约 500 秒涨到 1.6 万秒，31 条超时。不要 WebGL 的页面照常不带参数起（无头默认没有 WebGL，走 2D 退路）。
- 做法：共用一个 `launchBrowser()`，先试显卡，退回时只给要 WebGL 的测试加 swiftshader；留一个环境变量强制软件渲染，给 CI 或要逐机器一致时用。实测光照页面测试从 249 秒 / 2213 CPU 秒降到 45–66 秒 / 216 CPU 秒。
- 显卡下同一 WebGL 画面算两次有 1–4 级浮点抖动：逐像素相等的断言只在软件渲染下用，显卡下用容差。
- 测试和截图脚本起浏览器前 `os.setPriority(0, os.constants.priority.PRIORITY_BELOW_NORMAL)`，Windows 下子进程继承，前台不卡。
- 量 CPU 按命令的进程树取样相加；按进程名会算进别的会话的浏览器。

## 认出软件渲染的 WebGL

只靠建 context 时带 `failIfMajorPerformanceCaveat: true` 认不全：开了 `--enable-unsafe-swiftshader`（无头测试常见）照样建得出 swiftshader 的 WebGL。再用 `WEBGL_debug_renderer_info` 读 `UNMASKED_RENDERER_WEBGL`，名字里有 SwiftShader、llvmpipe、Basic Render Driver、WARP 的都当软件渲染。两道检查都做；测试里真 WebGL 和软件退路两条路各测一遍。软件渲染算一次全屏光照要 160–290 ms，会卡住界面。

## 量 WebGL 一次画多久

- `drawArrays` 后 `gl.finish()` 再读 `performance.now()`，测出来接近 0（命令还在排队）。要在 `drawArrays` 后 `readPixels` 读回 1 个像素，逼 GPU 画完，取几次的中位数。
- 单次读回量到的大头是等显卡回话、显卡没升频：同一条着色器单次 6–10 ms，连画 N 次只读回一次的平均才 0.8 ms。**两个数都报**，用户感觉到的接近后者。
- 同时在 swiftshader 下量一次，决定要不要退回 2D（实测显卡 0.3–0.7 ms，swiftshader 160–290 ms）。
- Playwright 装了假时钟后 `performance.now()` 不走（`resume()` 后也只到整毫秒）。量耗时另开一页，不装假时钟。

## 第一次画某种东西卡几百毫秒，主线程却闲着

Windows 上新版 Chromium / Edge / WebView2（Skia Graphite → Dawn → D3D11）第一次碰到一种 2D 画法（带透明度的径向渐变圆、斜着的形状、某个合成器动画），或第一次链接一个 WebGL 着色器时，当场编管线，一条 100–300 ms，整个画面停住。页面主线程只忙不到 1 ms，所以长帧报告（LoAF）、页面自己的计时都看不到。编好的管线不留到下次启动，每次打开第一下都卡。

- **怎么查：** CDP trace 加 `disabled-by-default-skia`、`gpu.dawn` 两个类别，`CreatePipelineAsyncEvent` 的 label 给出管线名字和耗时（`CompileShaderFXC` 是大头）。比较「第一次」要每组新开浏览器；开始录后等一会儿再测（V8 取样器启动会在主线程插一件 78–225 ms 的事）。
- **怎么修：** 闲着时照真的样子在离屏画布上把这些画法各画一遍，贴 1 个像素到页面上的画布，定时器擦掉（别用 rAF，免得闲时多出帧）。
  - 要画完整的形状：裁到 1 像素里画圆会被当方块，编的是另一条管线；
  - 同一帧有斜着的形状时整块走 MSAA，要分开画；
  - 不透明度 0.999 合成器当不透明，用 0.98；
  - WebGL 着色器用 `KHR_parallel_shader_compile` 后台先编。

## 量无头浏览器占多少内存

Playwright 的 `Browser` 不给进程号。在 `chromium.launch()` 前后各列一次 `chrome-headless-shell`（或 chrome）进程号，相减得到这次起的那些，再读它们的工作集和专用内存。走显卡时「专用」很大是驱动提交的内存，看工作集；页面里自己的画布另用代码记（每张离屏画布宽 × 高 × 4）。
