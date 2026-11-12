---
type: llm
focus: trace
weight: 1
---

碰撞体的 offset/tail 是按骨头自己的坐标算的（或从世界方向换算到骨头坐标），并且每加一个碰撞体就马上记下它的 uuid 再放进碰撞组
