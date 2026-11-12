---
tags: [frontend-verification]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

layers.html 里的 8 层应该每 400 毫秒亮一层，但我用无头 Chrome 截图，永远只有第一层是亮的，是不是我的动画代码有 bug？帮我查清楚，需要的话给个能证明它是好的办法。
Input files: layers.html
