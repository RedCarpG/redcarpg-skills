---
name: immersive-cultural-ui
description: 做东方古典或神秘学气质的沉浸式网页：深色夜空、细金线、薄雾、宣纸纹理、竖排中文、书法批注、景深视差、逐层亮起。适用于命理、黄历节气、占星塔罗、典籍、展品页，用户要「古风、国风、沉浸、仪式感」时用。Immersive mystical / Chinese-classical page style.
---

# 沉浸式传统文化界面

这个 skill 管一种风格：**夜色里的一幕**。主体用发光的细金线画在深色上；四周是少量竖排的字；背后是压暗的星空、薄雾和宣纸纹理；最淡的一层是和主题相关、有真实出处的书法批注。来自一个已上线的命理历法应用，用户调过好几轮。

一句话原则：**主体清楚，氛围退后。** 哪一样和主体抢眼，就压暗、删掉或关掉它。

## 和 web-design-engineer 一起用

- 装了它时：它管通用流程（理解需求、Design Read、声明设计系统、浏览器验收），这里管风格。走到选配方那步读 `references/recipe-tianshu.md`，Design Decisions 写 `Anchor / recipe: tianshu（immersive-cultural-ui）`，不再混那边的配方。
- 不要改 web-design-engineer 本身（第三方 skill，更新会覆盖）。

## 什么时候不用

以表格、表单为主的天天用的工具页（只借「安静控件」）；用户要明亮、轻快、商务，或品牌已有视觉规范；内容和东方、古典、神秘学不沾边。

## 流程

1. **先出概念再实现：** 新页面或大改版先做两三个能看的静态概念（HTML + 1440×900 截图），主体形式真的不同（罗盘、卷轴、册页），让用户挑。小改或用户已说清就跳过。
2. **定两种看法：** 简洁（一幕，主体占第一屏，逐层亮起）和详细（完整表格，不播开场）。一幕上方不放表单。
3. **定配方：** `references/recipe-tianshu.md`，东方暖夜或西方星空，数值写成 CSS 变量（`references/code/tianshu.css` 第一节）。
4. **搭层次**（从后往前）：底色和星空 → 光雾、雾、光点、纸纤维、颗粒 → 一层暗纱 → 烛光、流星 → 内容 → 装饰。`references/code/` 都有现成的。
5. **加动效：** `references/motion.md`。
6. **加装饰：** 最后加，嫌多最先删。`references/decoration.md`。
7. **交付前过清单：** `references/checklist.md`，截图作证据（装了 `frontend-verification` 就用它的脚本）。

## 不看就会做错的几条

- **背景比你以为的要暗：** 所有背景层上盖一层暗纱（东方 `rgb(5 4 3 / .3)`，西方 `rgb(3 3 12 / .28)`），起点就比直觉暗一档，问用户「抢不抢内容」。
- **装饰很淡**（.06–.6）、`aria-hidden`、只在 1100px 以上的留白里、打印不出现；引文要有书名篇名，**不编古文**。
- **只动 transform 和 opacity**；`prefers-reduced-motion` 时全关；分段吸附不用 CSS scroll-snap；仪式感动画每天只播一次。
- **竖排只给东方主题**，数字写成汉字，英文界面一律横排。
- **字体：** 站酷小薇只一个字重、不加粗、不用于要细读的小字；繁體下批注整段改系统楷体。
- 给一组按钮调淡时 `opacity` 放按钮上，不放父元素上（否则弹出面板也半透明）。

## 什么情况读哪里

| 情况 | 读 |
|---|---|
| 流程的完整说明、两种看法、四角版和主体做大版、背景压暗的数值、交互细节（安静控件）、文案和英文界面 | `references/scene-and-layout.md` |
| 色板、字体、间距、标志性做法 | `references/recipe-tianshu.md` |
| 动效的时长、缓动、深度，视差、吸附、逐层亮起 | `references/motion.md` |
| 竖排、书法字体、按需加载、繁體、易误读字形 | `references/type-and-vertical.md` |
| 装饰选什么、出处怎么找、怎么写得够淡 | `references/decoration.md` |
| 交付前 | `references/checklist.md` |
| 现成代码（先看哪个文件管什么） | `references/code/README.md`；骨架页 `references/code/starter.html`（层次和动效都接好，从它开始最快，但主体图、四角的字、装饰都要换成自己的） |
| 完整来源、改法、更早的更新记录 | `references/maintenance.md` |

## 来源与维护

- **来源：** ChroniQ（星曆，[RedCarpG/ChroniQ](https://github.com/RedCarpG/ChroniQ)）的「天书」界面风格，2026-11，PR #160–#187；经验在私人 repo 的 [`lessons/immersive-web-design.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/immersive-web-design.md)。对应源码文件列表见 `references/maintenance.md`。
- **源头：** [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/immersive-cultural-ui/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills)。各 agent 的 skills 目录、公开仓、claude.ai 上的都是副本，不要直接改；ChroniQ 的代码是来源，两边不自动同步。
- **怎么改：** 先看 lessons 有没有新条目；改了 `references/code/` 在浏览器打开 `starter.html` 看桌面、手机宽度、减少动态效果；某条做法被别的项目推翻就改掉并写进记录；发版时 `manifest.json` 升版本；下面加一行更新记录。
- **更新记录：**（更早的完整记录见 `references/maintenance.md`）
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。
  - 2026-11-10 · ChroniQ · 初版、按测试提示修订、加「主体做大」版式（还没在真实项目验证）。
