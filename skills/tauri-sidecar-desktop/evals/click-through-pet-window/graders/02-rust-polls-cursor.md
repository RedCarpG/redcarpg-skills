---
type: llm
focus: trace
weight: 1
---

click_through.rs polls the global cursor position on a background thread, hit-tests it against regions the front end sent (converting physical pixels to logical with the window origin and scale factor), and only calls set_ignore_cursor_events when the result changes.
