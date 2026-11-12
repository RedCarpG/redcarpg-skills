# immersive-cultural-ui

> 夜色里的一幕：主体清楚，氛围退后。

用来做有东方古典或神秘学气质的沉浸式网页：深色夜空、发光的细金线、薄雾、宣纸纹理、竖排中文、有真实出处的书法批注、景深视差、开场时逐层亮起。适合命理排盘、黄历节气、星图、典籍诗词、博物馆展品、节庆页面。

它只负责这一种风格。通用的设计流程交给 [web-design-engineer](https://github.com/ConardLi/garden-skills/tree/main/skills/web-design-engineer)，这个 skill 的配方可以直接放进那边的配方步骤里用。

## 包含什么

| | |
|---|---|
| `references/recipe-tianshu.md` | 「天书」配方：配色、字体、间距、动效，都写了具体数值 |
| `references/decoration.md`、`motion.md`、`type-and-vertical.md` | 装饰、动效、竖排和字体的做法 |
| `references/code/` | 可复用代码：氛围层、景深视差、分段吸附、逐层亮起、View Transition、汉字数字，以及一个骨架页 `starter.html` |
| `references/checklist.md` | 交付前检查清单 |
| `evals/` | 3 个测试用例：博物馆青铜器展品、二十四节气介绍、塔罗每日一抽 |

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s immersive-cultural-ui
```

## 来源

来自 [ChroniQ](https://github.com/RedCarpG/ChroniQ)（星曆）的「天书」界面风格，经过 PR #160–#187 的多轮调整。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
