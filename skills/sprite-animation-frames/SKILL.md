---
name: sprite-animation-frames
description: 拆分规则图集或时间轴，保留帧序、时长及锚点。
---

# 拆分规则图集或时间轴，保留帧序、时长及锚点

先核对图集尺寸及行列顺序。使用 Pillow crop 按规格逐格切出完整画布，保留透明留白；对 GIF/APNG 逐帧 seek 后转 RGBA，并读取该帧 duration。Aseprite 优先使用导出 JSON 的 frame、duration、spriteSourceSize 与 frameTags。

按播放顺序写编号 PNG 和含源坐标、时长、锚点的清单。回拼图集比较每格像素；按原时长循环播放检查最后一帧到首帧。

## 来源与维护

RedCarpG/redcarpg-skills 实验版。沿用 ChroniQ 的样稿对照、实测取证与交接方法。修改规则时重跑 evals 中的案例并更新 manifest 版本。
