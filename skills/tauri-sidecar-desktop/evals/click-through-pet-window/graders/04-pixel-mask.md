---
type: llm
focus: trace
weight: 1
---

hit-mask.ts derives regions from the character's rendered alpha (periodically, not every frame) and turns them into rectangles, so gaps between hair and arms are click-through; it does not read pixels belonging to other things drawn on the same canvas, or it explains rendering the character separately.
