# 踩过的坑

都在一个 Tauri 2 + Node sidecar 的 Windows 桌宠上碰到过。

## sidecar 改了不生效：`tauri dev` 只在开头编一次

- **现象：** 新功能「一半能用」：Rust 那边的托盘菜单出来了，但是灰的，因为 sidecar 那边的处理还是旧的。
- **原因：** 应用跑的是编译好的 `sidecar/dist/index.js`。`npm run tauri dev` 只在 `beforeDevCommand` 里编一次 sidecar；之后改 Rust，它只重编、重启 Rust，旧的 sidecar 照跑。
- **怎么办：** 改了 sidecar 先重新编 dist。应用里做一个「重启后台」菜单项：关掉 sidecar 的 stdin 让它自己退出，监管线程马上起一个新的，再重载窗口。功能半好不好时，先看 `dist` 的时间。

## 一行一个 JSON 的管道互相卡死

- **协议：** Rust 和 sidecar 之间一行一个 JSON。Rust 不解析业务字段，只按 `type` 转发。退出时 Rust 先关 stdin，sidecar 读到 EOF 自己收尾退出，等一会儿还没退再强杀。启动和关闭撞在一起时，刚放进去的 stdin 也要关掉。
- **卡死（2026-11-10 碰到）：** 前端往 sidecar 写一条几 MB 的大消息，写的时候占着 stdin 的锁；Rust 读线程要回一个值（比如凭据）也要这把锁；这时 sidecar 正好也在往 stdout 写大量输出、等 Rust 读走。三方互相等，整个卡住。
- **当时的解法：** 把那条大消息改小。
- **怎么防：** 消息保持小，大的东西传文件路径；读 stdout 的线程里不要去拿写 stdin 的锁，要回消息就交给单独的写线程或队列。（结构上的改法还没在原项目里验证。）

## sidecar 里一个没接住的 Promise 就整个退出

Node 默认遇到没处理的 rejection 会退出进程。开 eslint 的 `no-floating-promises`、`no-misused-promises`（不许把 async 函数当普通回调交出去），所有 `void` 掉的 Promise 都要 `.catch`。

## 自己画的右键菜单（透明置顶窗口）

都是真机上碰到后改的：

- **子菜单开合会闪：** 窗口大小和面板不是同一帧变。改成菜单窗口一开始就盖满工作区，之后不再改大小；点菜单外面只关菜单，这一下不会点到下面的窗口。
- **菜单抢焦点，别的弹层被关掉：** 输入框、轮盘收到失焦会自己关。改成「菜单收了、焦点没回来才关」。
- **全屏判断被打乱：** 用「前台窗口盖满显示器」判断全屏的逻辑，前台是自己的菜单、设置窗口时照上一次的答案，不要当成全屏结束了。
- **留退路：**
  - 等 300 毫秒没回音，就退回系统菜单；
  - 一显示就失焦（250 毫秒内）也退回系统菜单，连着两次就本次运行都用系统菜单；
  - 按住 Shift 右键托盘，一定是系统菜单；
  - Esc、选中以后，把焦点还给弹菜单之前的窗口。
- **还没解决、要知道的：** Windows 不让抢前台时，菜单拿不到焦点，既没有失焦、Esc 也没用；`set_focus` 失败时 tao 会模拟按一下 Alt，可能激活前台程序的菜单栏；在不同缩放的显示器之间第一次弹，位置可能不对。

## WebView2 默认不让自动出声

页面没被点过就播放音频会被拦。给 WebView2 加启动参数 `--autoplay-policy=no-user-gesture-required`，写在 Tauri 2 窗口配置的 `additionalBrowserArgs`。这一项会替换 Tauri 自己的默认参数，所以要把默认的那段也写上。原项目的写法：

```json
"additionalBrowserArgs": "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required"
```

## 多开一个 WebView 窗口很贵

单独开一个工具窗口、加载一份 Live2D 模型，WebView2 内存多 270–330 MB。调试小窗、工作台这类窗口用完就关，别常驻。

## 从 Claude 桌面应用的终端里看到的 `%APPDATA%` 是假的

MSIX 打包的应用开的 shell，`%APPDATA%` 被重定向到别处。排查应用的设置文件时，看到的值和程序实际用的不一样。要读真实数据，就在用户自己开的终端里跑，或者先比对两边的路径。

## 低端口被系统占了

Hyper-V / WSL 会一段一段预留 TCP 端口，开发服务器报端口被占但没有进程在用。用 `netsh int ipv4 show excludedportrange protocol=tcp` 查，本机服务端口放在 15000–49151 之间，先查过再定。

## 开发端口只有一个

同一台机器上同时只能开一个 `tauri dev`（Vite 端口固定）。多个会话或 worktree 同时开发时，别替别人关掉正在跑的那个，先问。
