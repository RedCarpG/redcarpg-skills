---
type: llm
focus: trace
weight: 1
---

settings-store.ts now writes to a temporary file in the same directory and renames it over the original (ideally with fsync, and a retry on Windows EPERM/EACCES/EBUSY).
