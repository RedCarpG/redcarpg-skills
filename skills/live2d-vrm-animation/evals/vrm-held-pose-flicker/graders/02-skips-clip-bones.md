---
type: llm
focus: trace
weight: 1
---

avatar.ts skips the procedural pose for bones that currently playing clips have tracks for (derived from the clips' track names), instead of writing them every frame.
