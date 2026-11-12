---
tags: [chinese-tts]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我在做一个中文语音助手，大模型的回复是一个字一个字流式过来的，我要在交给 TTS 之前把数字、时间、电话、单位、年份这些转成汉字念法。帮我用纯 JavaScript（不要依赖）写一个 tn.mjs，导出 normalize(text) 处理整段文字，再导出 createStream()，返回 { push(chunk), flush() }，push 进来的字转好了就吐出去。写完自己测一下常见情况。
