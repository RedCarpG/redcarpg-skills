# 数据核对和跑测试

原 SKILL.md §5–§6，2026-11-20 移来。

## 数据用确定的来源核对

页面上的数字、日期、排盘结果，不能凭“看起来对”。找一个独立且确定的来源逐项比对：成熟的库、官方数据集、已知的测试向量。例如某天的宜忌、节气、干支，用一个公认的历法库算一遍再和页面对；金额、时区转换、排序结果同理。比对用脚本做，把差异列出来，不要靠眼睛扫。

## 跑测试

- **vitest 要排除 `.claude/**`**：那里是别的会话的 worktree，里面有一份份仓库副本，不排除就会把它们的测试一起跑，既慢又互相干扰。`npx vitest run --exclude ".claude/**"`（CLI 的 `--exclude` 是在默认排除之上追加）；写进配置要保留默认值：`exclude: [...configDefaults.exclude, '.claude/**']`，否则 `node_modules` 也会被扫进去。
- **负载下不稳定的测试，单独再跑一次再下结论**：比如构建类测试（PWA 构建）在机器忙、多个会话同时在跑时容易超时。单独跑 `npx vitest run 那个文件`，通过就报告“整套跑时超时，单独跑通过”，失败才是真问题。不要为了让它变绿而加大超时或改断言。
- **Vitest 4 起选项放第二个参数：** `it(name, fn, { timeout })` 直接抛错，整个文件显示 `no tests`，汇总行像「没跑」不像「失败」。写成 `it(name, { timeout: 30_000 }, fn)`；改完单跑那个文件，看到通过的条数才算数。
- **页面直接加载的 `.js` 要另查语法。** typecheck 只管 `.ts` 时，`<script type="module">` 加载的 `.js` 里一个 `const` 重名就整页加载失败，页面测试全部超时，像时序问题。跑页面测试前对改过的文件 `node --check <文件>.js`。
- **vitest 会改写 `page.evaluate` 里的 `import()`。** 它把测试文件里所有 `import()` 换成 `__vite_ssr_dynamic_import__`，连传给 Playwright 的函数也换，到页面里报未定义。传字符串：`page.evaluate("import('./x.js').then(m => window.__m = m)")`。
- **`textContent` 会读到藏着的子元素。** 容器里有个 `hidden` 的按钮，`textContent(容器)` 连它的字一起读。只读要的那个子元素，或用 `innerText`（按可见性算）。
- **扫「界面文字」的测试会把着色器字符串里的注释当界面文字**（GLSL 在 JS 字符串里，去 JS 注释去不掉），写了中文就报缺字。着色器里的注释写英文，或挪到字符串外。
- **`page.click()` 被遮罩挡住会一直等。** 元素上压着 `pointer-events: none` 的遮罩层时，可点检查等到超时。只测「按下去」时在 `page.evaluate` 里 `dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))`；tsconfig 不带 DOM 库时测试文件里要 `declare const PointerEvent: any`，不然 typecheck 报错。
- **不开浏览器测前端的降级逻辑：** 每个脚本写成挂在 `window` 上的立即执行函数，用 `node -e` 调 Node 的 `vm`，传入桩 `window` / `document` 和各种假接口（缺失、版本太低、永远不返回），打印 JSON 再断言（Python 项目在 unittest 里调，没装 Node 就跳过）。
- **改了默认值之后**（比如把默认风格换掉），依赖旧默认值的测试改成**显式传入旧值**，不去改断言。原因：断言记录的是旧行为的约定，显式传入旧值，这条路径仍然有测试守着；改断言等于悄悄把约定改了。
