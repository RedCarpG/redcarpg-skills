---
type: llm
focus: trace
weight: 1
---

The polling avoids querying the main thread every tick, for example by caching window position and scale updated from Moved / ScaleFactorChanged events, or the response explicitly addresses polling cost.
