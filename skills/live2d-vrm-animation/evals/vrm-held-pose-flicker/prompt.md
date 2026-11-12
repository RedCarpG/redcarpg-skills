---
tags: [live2d-vrm-animation]
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我用 three.js + three-vrm 做桌宠。avatar.ts 里每帧先摆一个自然站姿（手放下）和呼吸，再播动作。动捕的动作都正常，但我自己手 K 的「举手停 1 秒再放下」那个动作，举着停住的那一秒手会掉回站姿，开始停和结束停的时候还各闪一下。另外一次性动作播完会一帧跳回去。帮我找原因并改 avatar.ts，再告诉我怎么确认修好了。
Input files: avatar.ts
