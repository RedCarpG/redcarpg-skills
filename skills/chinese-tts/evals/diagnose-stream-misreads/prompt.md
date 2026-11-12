---
tags: [chinese-tts]
max_turns: 10
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我们语音助手的文本转换单元测试全过了，可是实际播出来有几个怪事：「80年代」念成「八零年代」，「下午14:30开会」被拆成两句念、中间停了一下，「大概3~5天」念成了「大概三十五天」。整句测都是对的。我们的流程是：模型流式输出 → 按标点切句 → 每句做文本转换 → TTS。是什么原因？怎么改？不用写代码，说清楚就行。
