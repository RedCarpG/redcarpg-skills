---
tags: [tauri-sidecar-desktop]
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我在用 Tauri 2 做一个 Windows 桌宠，窗口全透明、置顶。想要透明的地方点击能穿到下面的窗口，角色身上能点能拖。我试了 window.set_ignore_cursor_events(true)，结果一开就再也收不到鼠标事件，关不回来了。角色是 Live2D 半身像，头发和胳膊之间空隙挺大，希望那里也能点穿。给我一个方案，Rust 那边的代码写到 click_through.rs，前端算区域的代码写到 hit-mask.ts。
