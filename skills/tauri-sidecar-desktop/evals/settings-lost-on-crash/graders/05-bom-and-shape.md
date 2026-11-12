---
type: llm
focus: trace
weight: 1
---

settings-store.ts strips a leading BOM before parsing and treats JSON of the wrong shape (for example an array or null) as unreadable rather than merging it into defaults.
