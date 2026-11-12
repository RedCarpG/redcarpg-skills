# frontend-verification

> 改完界面，拿出证据，而不是说「应该没问题」。

界面上的错大多只有看到才会发现：溢出、深色下看不清、动画没动、手机上挤成一团。这个 skill 让 agent 改完前端后真的把页面渲染出来，按清单逐项核对，最后交出截图或读出来的 DOM。

## 包含什么

| | |
|---|---|
| `scripts/shot.mjs` | 用 CDP 驱动无头 Chrome，真实时间、精确视口。可以先设状态再截图，同时输出 DOM 和文字，打印实际的 `innerWidth`、配色和语言 |
| `scripts/shot.sh` | 只依赖 bash 和 Chrome，一行命令截 PNG、导出 DOM 或打印成 PDF |
| `assets/probe.html` | 探针页：把真实视口、配色、语言、rAF 次数印在页面上，截图结果不对时先截它 |
| `assets/raf-shim.js` | 虚拟时间下 rAF 不触发时用的垫片，只放在测试页里 |
| `evals/` | 3 个测试用例：无头环境下动画冻住、手机加深色检查、改了默认值后跑 vitest |

## 实测过的坑

都是在 Chrome 157 / Windows 11 上一项项量出来的：

- `headless=new` 会把布局宽度钳到至少 500，375 宽的截图其实是把 500 宽的布局裁了一块；
- 隐藏的预览面板和虚拟时间里 `requestAnimationFrame` 几乎不触发，动画停在第一帧；
- `--blink-settings=preferredColorScheme=` 的取值 0 是深色、1 是浅色；
- 整页截图时，`animation-timeline: view()` 控制的区块停在 `opacity: 0`。

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s frontend-verification
```

或者在 Claude Code 里：`/plugin marketplace add RedCarpG/redcarpg-skills`，再 `/plugin install frontend-skills@redcarpg-skills`。

依赖：Chrome（找不到时退到 Edge）；用 `shot.mjs` 需要 Node ≥ 22。

## 来源

来自 [ChroniQ](https://github.com/RedCarpG/ChroniQ) 开发过程中反复做截图验证积累下来的经验。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
