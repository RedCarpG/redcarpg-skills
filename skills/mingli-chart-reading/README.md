# mingli-chart-reading

> 排盘交给脚本，解读照着盘来。

给出生日期时间，agent 先用自带脚本排出命盘，再根据排出的盘解读，或者回答「今年适合换工作吗」「明天适合签约吗」这类问题。脚本做计算，模型只负责解读，不会凭记忆编干支和星曜。

## 能排什么

- **八字：** 四柱（也支持只有三柱）、大运、流年、流月。交节按实际时刻对照，并提示夏令时、交节、真太阳时换柱、时辰交界和晚子时。
- **紫微斗数：** 命盘、大限、流年。
- **西洋星盘：** 本命、行运、推运、合盘。
- **七政四余**、**黄历宜忌**、**天象**。

## 包含什么

| | |
|---|---|
| `scripts/chart.mjs` | 排盘脚本。由 chroniq-core 打包成单个文件，Node ≥ 20 直接运行，不联网，不写文件 |
| `references/schools.md` | 各流派的分歧和可信度，解读时怎么说明 |
| `references/glossary-en.md` | 英文术语对照，用英文回答时使用 |
| `LICENSE` | chroniq-core 的 MIT 许可 |
| `THIRD_PARTY_NOTICES.md` | 脚本里打包的 7 个开源库（都是 MIT）及其版权声明，构建时自动生成 |

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s mingli-chart-reading
```

## 来源

这里放的是构建出来的副本。源头在 [ChroniQ](https://github.com/RedCarpG/ChroniQ) 的 `core/skill/`，版本号跟着 chroniq-core 走，要改请去那里。chroniq-core（ChroniQ 的 `core/` 和 `src/lib/`）以 MIT 发布；ChroniQ 的界面和 AI 解读部分不在 MIT 范围内。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
