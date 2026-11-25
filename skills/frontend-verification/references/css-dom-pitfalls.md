# 截图里常见的 CSS、DOM 小坑

2026-11-24 收进，来自 lessons 里 11-22 到 11-24 的几条。都是「代码看着没错、渲染出来才露馅」的，验收时照着多截一张或多按一下。

## 样式

- **`[hidden]` 被 `display` 盖掉。** 只要有一条 `display` 规则命中元素（`img{display:block}`、某个 flex 类），就盖过浏览器默认的 `[hidden]{display:none}`，该藏的露出来。基础样式里加 `[hidden]{display:none !important}`。
- **横滑的东西把手机页撑宽。** 网格里放一条能横向滚动的导航，网格列按它的完整宽度变宽，375 宽被撑到 729。列宽写 `minmax(0,1fr)`，网格子元素加 `min-width:0`。grid 里 `text-overflow: ellipsis` 不生效也是这个原因。`shot.mjs` 打印的 `innerWidth`、`scrollWidth` 能看出来。
- **深色主题的规则盖掉禁用、悬停状态。** `:root[data-theme="dark"] .btn { color: … }` 的特异度比 `.btn:disabled` 高，禁用按钮的字色变成和底色一样，深色里按钮「消失」，浅色下没事。状态在深色里再写一遍，或深色规则只改变量、不直接写 `color`。验收时深色把禁用、悬停、选中各截一张。
- **通用的 `button::after` 会挪走按钮图标。** 全站的 `button::after { position: absolute; left: 18% }`（悬停下划线）会套到按钮的 `::after` 图标上；悬停规则里的 `transform: none` 还会把旋转的箭头转回去。加 `::after` 图标时把 position、transform 连悬停状态一起盖掉。
- **canvas 阴影不跟 dpr 缩放走。** `shadowBlur`、`shadowOffsetX/Y` 不受 `setTransform` 影响，按 dpr 缩放的画布上阴影大小随屏幕变。要各台屏幕一样，用径向渐变自己画影子。

## 弹窗

- **带输入框的弹窗要按一次回车。** `<form method="dialog">` 里「取消」写在「保存」前面、两个都是提交按钮时，回车触发的是「取消」：浏览器隐式提交用 DOM 顺序第一个提交按钮。弹窗关掉，什么都没存，也不报错，鼠标点测不出来。取消按钮写 `type="button"` 自己关弹窗；打开前清空 `dialog.returnValue`。验收时在输入框里回车，再确认数据真存上了。
- **预览面板隐藏时 `close` 事件不来。** `dialog.close()` 后 `returnValue` 已经是 `ok`，但 `close` 事件迟迟不触发，靠 `onclose` resolve 的 Promise 挂着，像按钮没反应；面板显示时正常（和隐藏面板里 rAF 不跑同类，`setTimeout` 照跑）。弹窗结果在 `submit` 事件里拿（`e.submitter.value` + `FormData`），`close` 只兜底处理取消，用一个 `settled` 标记防止 resolve 两次。`tabs_context` 说面板隐藏时，弹窗「没反应」先怀疑这条。
