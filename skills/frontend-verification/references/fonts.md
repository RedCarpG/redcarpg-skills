# 字体像宋体、不显示：怎么排查

原 SKILL.md §4，2026-11-20 移来。

## 字体像宋体，不一定是 bug

截图里中文突然变成宋体/明体，多半是网页字体还没加载完（或这台机器没有那个字体），不是 CSS 写错。先在真浏览器（内置预览）里确认，或用 `shot.mjs --eval "document.fonts.ready.then(() => document.fonts.status)"` 等字体就绪后再截；确认真浏览器里也是宋体，才去查 `font-family` 和 `@font-face`。

真浏览器里也不对时，**按字体状态分流**，不要凭感觉先猜缓存。在出问题的那个浏览器的控制台里，统计 `document.fonts` 中这个字体各状态的个数：

```js
[...document.fonts].filter(f => f.family.includes('字体名')).reduce((a, f) => (a[f.status] = (a[f.status] || 0) + 1, a), {})
```

- **有 `error`：去查下载。** 开发服务器返回 403（例如 worktree 里的 `node_modules` 是指向工作区外的 junction，要给 Vite 配 `server.fs.allow`）、404、缓存过期。看 Network 里这个字体文件的状态码。
- **全是 `unloaded`：浏览器根本没去请求，说明 CSS 没用到这个字体。** 去查覆盖它的规则（比如按 `:root[lang]` 换字体）和用户在设置里选的语言；界面语言换了，字体按设计换掉，是正常行为，不是加载失败。
- **隐私窗口（InPrivate/无痕）正常、平时的窗口不正常：** 先比较两边的应用设置（localStorage），再怀疑 service worker 缓存。

为什么这样排：一次“毛笔字没加载”的报告，原因其实是用户把界面设成了繁體，按设计换成了楷体；先按缓存方向查，绕了远路。
