---
tags: [live2d-vrm-animation]
max_turns: 10
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我用 PixiJS 加载了一个从 VTube Studio 拿来的 Live2D 模型做桌宠。问题：1）她站着完全不动，也不眨眼；2）我在 beforeModelUpdate 里写 ParamAngleX 让她点头，头一点都不动；3）我写身体晃动，只有头在晃，头发和衣服不跟着飘。分别是什么原因、怎么改？
