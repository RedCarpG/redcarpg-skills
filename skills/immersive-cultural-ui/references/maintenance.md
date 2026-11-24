# 来源与维护（完整版）

SKILL.md 末尾是精简版；完整的来源、改法和历次更新记录在这里。新的更新记录照旧加在 SKILL.md。

## 来源与维护

- **来源：** ChroniQ（星曆，[RedCarpG/ChroniQ](https://github.com/RedCarpG/ChroniQ)）的「天书」界面风格，2026-11，PR #160–#187。
  - 样式：`src/tianshu.css`，`src/styles.css` 的「静」一节（安静控件）。
  - 组件：`src/components/TianshuAtmosphere.tsx`、`useParallax.ts`、`useSectionSnap.ts`、`useCasting.ts`、`CastLine.tsx`、`smoothUpdate.ts`。
  - 一幕：`BaziHero.tsx`、`ZiweiScene.tsx`、`TodayScene.tsx`。
  - 其他：`src/lib/hanNumber.ts`、`src/lib/ditiansui.ts`、`scripts/pwa.ts`（字体不进预缓存）。
  - 文档：`docs/development.md` 的「命理页：简洁与详细」，`docs/features.md` 的「界面风格：天书」。
  - 经验：私人 repo 的 [`lessons/immersive-web-design.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/immersive-web-design.md)、`lessons/frontend-verification.md`。
- **源头：** 开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/immersive-cultural-ui/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。ChroniQ 里的代码是它的来源，两边不会自动同步。
- **怎么改：**
  - 在 redcarpg-skills 里改，走 PR；`manifest.json` 版本加一，`node scripts/validate.mjs` 通过后发版（tag `immersive-cultural-ui-v<版本>`），再重装本机副本。
  - 先看 `lessons/immersive-web-design.md` 有没有新条目可以收进来。
  - 改了 `references/code/` 之后，在浏览器里打开 `starter.html` 检查一遍：桌面、手机宽度、减少动态效果。
  - 某条做法在别的项目上被推翻了，就改掉它，并在更新记录里写明。
- **更新记录：**
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，来源项目写成链接；内容不变。
  - 2026-11-10 · ChroniQ · 初版：天书配方；两种看法、背景压暗、装饰、动效、竖排、字体、交互细节的做法；交付前检查清单；可复用代码（氛围层、景深视差、分段吸附、逐层亮起、View Transition、汉字数字）和骨架页；`evals/` 里三个测试提示。
  - 2026-11-10 · ChroniQ · 按三个测试提示的结果修订：
    - `immersive.js` 注释里去掉结束 script 标签的原文，它会让内联后的脚本被截断；清单加一条。
    - 西方主题四角横排，竖排只给东方主题。
    - 站酷小薇的小字规则改成按用途分：一幕里的短标签可以用，要细读的小字不用。原来写的「14px 以下」不是来源项目的做法。
    - 写明主体背后的极淡大字在手机上可以保留。
    - `motion.md` 加上整页截图时滚动驱动区块空白的坑。
    - `.ts-scene` 加 `box-sizing: border-box`。
  - 2026-11-10 · ChroniQ · 加「主体做大」版式（`tianshu.css` ④b：`.ts-hero`、`.ts-spot`、`.ts-floor`），标明还没在真实项目里验证，实物类页面两种版式各出概念让用户挑。效果图用后母戊鼎做，在 1440×900、1280×720、1100×760、375 宽和打印下看过。清单加两条：主体做大版的尺寸和装饰；页面样式里不写死浅色。
