---
name: sprite-grid-validation
description: 测量规则 Sprite 图集尺寸、空帧及逐格包围盒。
---

# 测量规则 Sprite 图集尺寸、空帧及逐格包围盒

在含 Pillow 的 Python 环境运行 `python scripts/check_grid.py sheet.png sprite-spec.json`（路径相对本技能）。读 JSON 和退出状态。bbox 是格内坐标，右、下边界不含端点。对贴边帧进行视觉复核；锚点来自规格或引擎数据，不能用包围盒推定。

仅支持等尺寸规则图集、四边相同 margin、横纵相同 spacing。打包器旋转或裁边时改读其元数据。

## 来源与维护

RedCarpG/redcarpg-skills 实验版。沿用 ChroniQ 的样稿对照、实测取证与交接方法。修改规则时重跑 evals 中的案例并更新 manifest 版本。
