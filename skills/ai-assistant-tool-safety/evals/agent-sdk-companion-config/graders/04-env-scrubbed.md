---
type: llm
focus: trace
weight: 1
---

session.ts removes CLAUDE*-prefixed environment variables (keeping CLAUDE_CONFIG_DIR) before passing env to the SDK, and the response ties this to launching from a Claude Code terminal.
