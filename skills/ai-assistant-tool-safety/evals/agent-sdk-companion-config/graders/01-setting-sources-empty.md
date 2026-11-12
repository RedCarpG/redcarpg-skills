---
type: llm
focus: trace
weight: 1
---

session.ts passes settingSources: [] explicitly, and the response or a comment says why (otherwise the user's ~/.claude settings, CLAUDE.md and hooks get loaded).
