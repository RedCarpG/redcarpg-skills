---
tags: [frontend-verification]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我把默认主题从 classic 换成了 ink，之后跑 npx vitest run 有 3 个测试挂了：2 个是因为它们默认主题时断言了 classic 的配色，另一个是 pwa-build.test.ts，我之前跑过一次是好的，这次又超时了。另外 vitest 还把 .claude/worktrees 里的一堆别的会话的测试也跑进来了，很慢。你来处理。
