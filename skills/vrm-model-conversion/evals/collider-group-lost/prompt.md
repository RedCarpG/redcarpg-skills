---
tags: [skill-creator]
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

我用 Blender 的 VRM 插件写脚本导出 VRM 1.0，脚本里一个函数 bpy.ops.vrm.add_spring_bone1_collider 之后 c = sb.colliders[-1] 设好再 return c，最后把十几个 c 的 c.uuid 加进碰撞组。导出来以后裙子还是穿进腿里，three-vrm 里看碰撞组只有一个球，head 那个组都没了。另外大腿的胶囊我写的 tail=(0,-0.4,0)，好像跑到肚子上了。为什么？怎么改？
