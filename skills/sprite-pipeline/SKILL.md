---
name: sprite-pipeline
description: 按现有素材规划 Sprite 制作和交接。
---

# 按现有素材规划 Sprite 制作和交接

读取目标引擎、视角、角色参考与现有素材。复制 assets/sprite-spec.json，逐项用用户规格替换示例值；未知的帧时长与锚点写明待确认。

仅有文字时进入 concept-design；已有定稿图时进入 pixel-art；已有图集时先验证网格再拆帧。去背后重测包围盒。交接时列出原件、产物、规格版本、实测结果和下一步。

## 来源与维护

RedCarpG/redcarpg-skills 实验版。沿用 ChroniQ 的样稿对照、实测取证与交接方法。修改规则时重跑 evals 中的案例并更新 manifest 版本。
