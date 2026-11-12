---
type: llm
focus: trace
weight: 1
---

settings-store.ts renames or copies an unreadable settings.json aside (for example settings.json.bad-<timestamp>) and reports it, instead of letting the next save overwrite it.
