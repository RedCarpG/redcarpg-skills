# 来源与维护（完整版）

SKILL.md 末尾是精简版；完整的来源、改法和历次更新记录在这里。新的更新记录照旧加在 SKILL.md。

## 来源与维护

- **来源：** Cirra（AI 桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)），2026-10 至 2026-11。
  - Live2D 代码：`src/pet/live2d.ts`、`src/pet/live2d-physics.ts`、`src/pet/cubism-core.ts`；渲染库 `untitled-pixi-live2d-engine` 1.4.0（PixiJS 8）。
  - VRM 代码：`src/pet/vrm.ts`、`src/pet/vrm-motion.ts`，2026-11-11 起还有 `vrm-face.ts`、`vrm-hands.ts`、`vrm-blend.ts`、`vrm-reach.ts`、`vrm-gaze.ts`；提交 2b6ab57（clampWhenFinished）、e5e8687（不用 combineSkeletons）。
  - 文档：`docs/stage5.md`、`docs/live2d-motions.md`、`docs/live2d-common-motions.md`、`docs/live2d-studio.md`、`docs/loop-motions.md`、`docs/expression-outfit-split.md`、`docs/music.md`、`docs/vrm.md`、`docs/vrm-motion.md`、`docs/vrm-motion-library.md`、`docs/vrm-studio.md`、`docs/vrm-toon.md`、`docs/beat-tracking.md`、`docs/vrm-skirt.md`、`docs/vrm-motion-polish.md`。
  - 经验：私人 repo 的 [`lessons/live2d-motion.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/live2d-motion.md)、`lessons/threejs-vrm-animation.md`。
- **源头：** 开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/live2d-vrm-animation/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。Cirra 里的代码是它的来源，两边不会自动同步。
- **怎么改：**
  - 在 redcarpg-skills 里改，走 PR；`manifest.json` 版本加一，`node scripts/validate.mjs` 通过后发版（tag `live2d-vrm-animation-v<版本>`），再重装本机副本。先看上面两个 lessons 文件有没有新条目可以收进来。
  - three.js、three-vrm、Live2D 渲染库升级后，「最常见的坑」那张表里和库内部行为有关的几条（mixer 不写没变的值、`clampWhenFinished`、`shouldRequestIdleMotion`、加载顺序）要重新确认。
  - 只在一个模型上看到的现象，标明是哪类模型，不要写成通用规律。
- **更新记录：**
  - 2026-11-12 · 1.0.0，搬进 redcarpg-skills 公开发布。改掉本机绝对路径，来源项目写成链接；内容不变。
  - 2026-11-10 · Cirra · 初版：三条原则、坑速查表；Live2D、VRM、AI 生成动作三篇参考；`evals/` 里两个测试提示。
  - 2026-11-10 · Cirra · 改 VRM 第 15 条（裙子穿模）：原来写的「改成胶囊就好了」没起作用，换成碰撞组登记、通用腿胶囊、胯跳三条（`docs/vrm-skirt.md`）；坑速查表加一行。
  - 2026-11-10 · Cirra · 第 15 条加长发进袖子（手臂胶囊不能往回收）、衣服顶出来是蒙皮问题。
  - 2026-11-10 · Cirra · references/vrm.md 加「VRM 0.x 的规范化骨骼面朝 -Z」（程序姿势换朝向、转身别抵掉 rotateVRM0；提交 e2e6c0c，`src/pet/vrm-basis.ts`）。
  - 2026-11-11 · Cirra · references/vrm.md 加第 19–28 条（打断不掉手、带腿片段淡出时 IK 接管、膝盖上限和抬脚跟、动捕手指换手型、手型和手腕、手碰身上的 IK、动作配表情、override 挡 beats、空的单眼眨、眼睛跟头），第 11 条改成指向第 25 条；ai-motion.md 加 face、hands、reach 的格式和校验；坑速查表加 9 行。来源：`docs/vrm-motion-polish.md` §10、§11，`src/pet/vrm-face.ts`、`vrm-hands.ts`、`vrm-blend.ts`、`vrm-reach.ts`、`vrm-gaze.ts`、`vrm-clip-extras.ts`、`vrm-pose.ts`，`sidecar/src/shared/motion-face.ts`、`motion-hands.ts`（合并提交 b2f115d、ea3be9e）。
  - 2026-11-11 · Cirra · references/vrm.md 加第 29–31 条（关键帧每段两头慢导致一顿一顿 → 单调三次样条和错开关键帧；伸懒腰的分段和上臂扭转；膝盖上限缩胯的歪导致上半身斜），坑速查表加 3 行。来源：`docs/vrm-motion-polish.md` §12，`src/vrm-studio/motion-spec.ts` 的 `smoothAt`、`src/pet/vrm-pose.ts`（合并提交 c5b4728）。
  - 2026-11-11 · Cirra · references/live2d.md 第 21 条加 VTube Studio 模型的两类排除（物理输入、不带 Param 的脸部参数），不然脸部表情遇到点头就让开。来源：`src/pet/clash.ts` 的 `standardInputs`、`isStandardParam`，`docs/expression-clash.md`（提交 7721742）。
