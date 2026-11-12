# 可复用代码

| 文件 | 管什么 | 用在哪 |
|---|---|---|
| `tianshu.css` | 全部样式，分 12 节：①色板 ②字体 ③氛围层 ④一幕的版式（④b 主体做大，未验证） ⑤主体的画法 ⑥竖排 ⑦安静控件 ⑧区块与标题 ⑨逐层亮起 ⑩动效 ⑪装饰 ⑫减少动态效果和打印 | 任何项目。拷过去，删掉用不到的节 |
| `immersive.js` | 不依赖框架的脚本：景深视差、分段吸附、逐层亮起、每天一次、流星、星空和光点、滑动指示、View Transition、汉字数字 | 单个 HTML 文件，或不用 React 的项目 |
| `react.tsx` | 同样的东西写成 React 组件和 hook：`<Atmosphere>`、`useParallax`、`useSectionSnap`、`useCasting` 和 `<CastLine>`、`useOncePerDay`、`smoothUpdate` | React 18+ 项目 |
| `starter.html` | 一页能直接打开的骨架，上面三样都接好了 | 新做一页时从它开始 |

`immersive.js` 和 `react.tsx` 是同一套逻辑的两种写法。改一边时，另一边也要改。

## 怎么接

### 单个 HTML 文件

1. 从 `starter.html` 开始，把 `tianshu.css` 和 `immersive.js` 内联进去。
   - 用的是经典脚本（`window.Immersive`），不是 ES module，因为双击打开（`file://`）的页面加载不了 module 脚本。
2. `<html>` 上设 `lang` 和 `data-realm="east"` 或 `"west"`。
3. 换掉所有【】：主体图、四角的字、立着的要素、说明行、装饰、往下的完整内容。

### React 项目

1. `tianshu.css` 在入口 import 一次。
2. `react.tsx` 拷进项目，按需拆成几个文件。
3. 在应用最外层放 `<Atmosphere realm="east" />`，它顺带启动景深视差。
4. 一幕里：

   ```tsx
   const cast = useCasting(chartKey, 3, view === 'simple')
   return (
     <div className="ts-scene" data-stage={cast.stageAttr}>
       …标了 .cast-l1 / .cast-l2 / .cast-l3 的元素…
       <CastLine cast={cast} captions={['第一重 · …', '第二重 · …', '第三重 · …']} />
     </div>
   )
   ```

5. 切换简洁和详细：`smoothUpdate('view', () => setView('full'))`。
6. 区块吸附：在页面组件里调 `useSectionSnap(true)`。

### 景深分层

给要动的层加 `data-depth`，数值是 `reach`（默认 16px）的倍数，负数逆着鼠标：

| 层 | `data-depth` |
|---|---|
| `.ts-sky`（星空） | `-1` |
| `.ts-atmos`（光雾、光点、纸纹） | `-0.45` |
| `.ts-fog`（在 `.ts-atmos` 里） | `0.8`（叠加后约 `+0.35`） |
| `.ts-scene-main`（主体） | `0.22` |

可以滚动的容器（`overflow: auto`）里的东西，把 `data-depth` 标在容器外面的包装上。否则会多出滚动条。

## 要换什么

- **颜色：** 只改 `tianshu.css` 第 ① 节的变量。换主色的做法见 `../recipe-tianshu.md`。
- **主体：** `starter.html` 里那面圆盘只是示范怎么画细金线。换成这一页自己的图：罗盘、星图、器物线描、节气环。用 ⑤ 节的类：`ts-plate`、`ts-ring`、`ts-tick`、`ts-label`、`ts-thread`、`ts-heart`、`ts-center-char`。
- **字体：** `starter.html` 用 Google Fonts。项目里换成 `@fontsource`，见 `../type-and-vertical.md`。
- **文案：** 「跳过」「重看」可以用 `labels` 或 `skipLabel` / `againLabel` 换掉，例如「重看起盘」。英文界面要翻译。

## 已知的限制

- 星空是随机星点，不是真实星图。要真实星空（按日期、地点算出的那片天），得另写。
- 手机倾斜的景深在 iOS 上要先申请权限（`DeviceOrientationEvent.requestPermission()`，必须在用户点按时调用）。这里没有做，iOS 上就没有倾斜景深。
- 「换页」的 View Transition 需要给内容区设 `view-transition-name: ts-page`，并在路由切换时调 `smoothUpdate('page', …)`。这一步跟路由库有关，这里没有接。
