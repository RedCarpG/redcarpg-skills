---
name: live2d-vrm-animation
description: 在网页或桌面应用里让 Live2D（Cubism/PixiJS）和 VRM（three.js + three-vrm）角色动起来：程序姿势和动作片段互相覆盖、物理、表情、弹簧骨骼、AI 生成动作。用户提到 model3.json、VRMA、SpringBone，或抱怨「动作一顿一顿」「手放下又抬起闪一下」「头不跟着动」时用。Animate Live2D/VRM avatars.
---

# Live2D / VRM 角色动画

来自一个同时支持 Live2D 和 VRM 角色的桌宠（见「来源与维护」）。用过官方示例、VTube Studio 模型、VRChat 转来的 VRM。下面的做法都试过、量过，或用户看过、改过。

## 三条贯穿两种角色的原则

1. **程序层和动作片段会互相盖。** 每帧先算谁、后写谁，决定用户看到什么。几乎所有「闪一下」「手放下了」「头不动」都出在这里：
   - Live2D：程序叠加的值放在 `beforeModelUpdate` 里进不了物理，头发、身体不跟着动。要包住 `physics.evaluate`，在物理**之前**叠加。
   - VRM：three.js 的 `AnimationMixer` 一帧混出的值和上一帧一样时不往骨头上写，程序摆的站姿、呼吸会从片段「停住」的那段露出来。程序姿势要跳过正在播的片段写着的骨头（按 `clip.tracks` 的节点名）；暂停时也要停掉程序重写站姿。
2. **不改动作文件，在后面加一层程序。** 手 K、AI 做的动作往往只动几根骨头，像木偶。在片段之后加一层「带动」（肩膀跟着抬、躯干让、手腕落后、头晚半拍），片段自己写了的骨头不叠。一次做好，所有动作受益，还能开关对比。
3. **验证靠逐帧记数，不靠看。** 逐帧记下那根骨头（参数）**画上去时**的值（render 之后，或 Live2D 的 `beforeModelUpdate` 里读），修前修后各记一遍对比；再在两个不同的模型上截图看。录对比 GIF 用 `animation-capture`。

## 什么时候读哪里

| 要做的事 / 现象 | 读 |
|---|---|
| 先按现象查：报错、怪值、头不动、站着不动、闪一下、跳回、穿模、表情看不到、眼睛死盯、一顿一顿…… | `references/pitfalls.md` |
| Live2D：加载顺序、写参数（`getIdSafe`）、物理、待机、动作、定住、表情 | `references/live2d.md` |
| VRM：程序姿势和片段、带动层、动捕片段、表情、弹簧骨骼、透明窗口 | `references/vrm.md` |
| VRM：动作配表情、手型和手腕、手碰身上的 IK、打断不掉手、腿的上限、眼睛跟头、关键帧插值和分段 | `references/vrm.md` 第 19–31 条 |
| 让 AI 生成或修改表情、动作（数据格式和校验） | `references/ai-motion.md` |
| 跟着音乐点头、说话时头动 | `references/live2d.md` 第 16 条、`references/vrm.md`「跟节拍」 |
| 完整来源（代码文件、文档、提交）、改法、更早的更新记录 | `references/maintenance.md` |

把模型转成 VRM、加表情和弹簧骨用 `vrm-model-conversion`。

## 来源与维护

- **来源：** Cirra（AI 桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)），2026-10 至 2026-11，`src/pet/live2d*.ts`、`src/pet/vrm*.ts` 和 `docs/` 下的动作文档；经验在私人 repo 的 [`lessons/live2d-motion.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/live2d-motion.md)、`lessons/threejs-vrm-animation.md`。完整文件列表见 `references/maintenance.md`。
- **源头：** [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/live2d-vrm-animation/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills)。各 agent 的 skills 目录、公开仓、claude.ai 上的都是副本，不要直接改；Cirra 的代码是来源，两边不自动同步。
- **怎么改：** 先看两个 lessons 文件有没有新条目；three.js、three-vrm、Live2D 渲染库升级后，重新确认 `references/pitfalls.md` 里和库内部行为有关的几条（mixer 不写没变的值、`clampWhenFinished`、`shouldRequestIdleMotion`、加载顺序）；只在一个模型上看到的现象标明是哪类模型；发版时 `manifest.json` 升版本；下面加一行更新记录。
- **更新记录：**（更早的完整记录见 `references/maintenance.md`）
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。
  - 2026-11-10 至 2026-11-11 · Cirra · 初版；裙子穿模、VRM 0.x 朝向、vrm.md 第 19–31 条、live2d.md 第 21 条的 VTube Studio 排除。
