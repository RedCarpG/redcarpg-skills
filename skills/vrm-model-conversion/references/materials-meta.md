# 材质、贴图、meta 和许可

原 SKILL.md 对应各节，2026-11-20 移来。`K` 是 `scripts/vrm_kit.py`，`S` 是 `K.Springs(arm)` 的实例（见 `scripts/build_template.py`）。

## 材质和贴图

`K.mtoon(material, image, alpha=..., ...)` 换成 MToon：
- `OPAQUE` 皮肤；`MASK` 蕾丝、镂空、首饰、鞋（`cutoff` 决定剪掉多少）；`BLEND` 眼影、玻璃。
- **发片（一片片带半透明发丝）**：只用 MASK 像毛刺、发灰；只用 BLEND+写深度，后面的发片被前面一块块挡住；只用 BLEND 不写深度，前后乱套（都实测过）。用 `K.alpha_two_pass(hair)`：原来的 MASK（cutoff .5，写深度），复制的那份 BLEND 不写深度补边。要在加完骨链之后做（复制品带着同样的权重）。
- 游戏贴图的通道要看清楚再用：RE Engine 的 `ALBM` 是 RGB 颜色 + A 金属度（不是透明度！），透明度在 `ATOS` 的 R，法线在 `NRMR`。拿 A 当透明会整片消失。`K.combine_alpha(rgb, alpha图, 'R')` 拼成一张；先用 PIL 看每个通道的分布（小于 128 的占多少）再判断哪个是透明度。附带的 README 常写着哪个材质用哪张图。
- 写实贴图（游戏、Daz）：`toony` .45–.5、`shade` .8–.86，不然像卡通；头发贴图偏灰时把 `color` 压到 .7。
- `K.downscale_images(2048)`：4K、8K 贴图缩掉（实测 13 万三角形、11 张贴图的模型 28 MB）。

## meta 和许可

`K.set_meta(..., personal_only=True)`：只许作者本人用、不商用、不再分发、不许改。**别人的模型、游戏提取的模型一律这样填**，作者写原作者（游戏角色写版权方，改装者不明就写不明）。转出来的 VRM、截图、GIF 都只在本机用：放进项目里不进 git 的地方，别进安装包、别公开。
