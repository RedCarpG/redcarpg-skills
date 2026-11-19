---
name: sprite-alpha-cleanup
description: 去除 Sprite 纯色背景、检测杂边与误删。
---

# 去除 Sprite 纯色背景、检测杂边与误删

读原图 alpha 直方图。已有透明度时先检查边缘；纯色底从四边做连通背景选择，保护角色内部同色块。抠图写新 RGBA 文件，保留原画布。只有明确要求硬边像素时才二值化 alpha。

分别叠到黑、白和饱和底色，检查银发、半透明特效和脚下阴影。报告修改范围、残留色边及需要人工修补的位置。

## 来源与维护

RedCarpG/redcarpg-skills 实验版。沿用 ChroniQ 的样稿对照、实测取证与交接方法。修改规则时重跑 evals 中的案例并更新 manifest 版本。
