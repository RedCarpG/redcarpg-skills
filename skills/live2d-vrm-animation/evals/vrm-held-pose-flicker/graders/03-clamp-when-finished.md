---
type: llm
focus: trace
weight: 1
---

avatar.ts sets clampWhenFinished = true for LoopOnce actions (so the finished event's fadeOut works instead of snapping back), and the response explains why.
