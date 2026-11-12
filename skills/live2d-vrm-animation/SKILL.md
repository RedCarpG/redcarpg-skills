---
name: live2d-vrm-animation
description: 在网页或桌面应用里让 Live2D（Cubism，PixiJS）和 VRM（three.js + @pixiv/three-vrm）角色动起来：加载顺序、程序姿势和动作片段互相覆盖、在物理之前叠加、VTube Studio 模型补齐（没有 Idle、没眨眼、头角度是物理输出、8K 贴图、包围盒被特效带偏）、动作通道和定住、表情存取和道具冲突、three.js AnimationMixer 的坑（不写没变的值、LoopOnce 提前关掉）、程序「带动层」让手 K 和 AI 动作不僵、动捕片段只取上半身、弹簧骨骼延迟和跟节拍、裙子穿模、让 AI 生成表情和动作的数据格式与校验规则，以及逐帧记录的验证方法。只要用户在做虚拟形象、桌宠、VTuber 工具、数字人，提到 Live2D、Cubism、model3.json、motion3、exp3、physics3、VTube Studio、VRM、VRMA、three-vrm、Mixamo、动捕、SpringBone，或者抱怨「动作一顿一顿的」「动作僵」「手放下又抬起来闪一下」「头不跟着动」「定不住」「表情看不出来」「做动作脸上没表情」「手指僵、直板手」「托腮够不到下巴」「眼睛呆、一直盯着」「腿站不稳、脚滑」，就用这个 skill。Also use for English requests about animating Live2D or VRM avatars, procedural idle motion, physics, expressions, or AI-generated character motions.
---

# Live2D / VRM 角色动画

这个 skill 来自一个同时支持 Live2D 和 VRM 角色的桌宠（见文末「来源与维护」）。用过的模型有官方示例、VTube Studio 用的模型、VRChat 转来的 VRM。下面的做法都试过、量过，或者用户看过、改过。

## 三条贯穿两种角色的原则

1. **程序层和动作片段会互相盖。** 每帧先算谁、后写谁，决定了用户看到什么。几乎所有「闪一下」「手放下了」「头不动」都出在这里：
   - Live2D：程序叠加的值放在 `beforeModelUpdate` 里，进不了物理，头发、身体不跟着动。要包住 `physics.evaluate`，在物理**之前**叠加。
   - VRM：three.js 的 `AnimationMixer` 一帧里混出来的值和上一帧一样时，不往骨头上写。每帧先由程序摆的站姿、呼吸，会从片段「停住」的那段里露出来。要跳过正在播的片段写着的骨头（按 `clip.tracks` 的节点名）。暂停时也一样，要停掉程序重写站姿。
2. **不改动作文件，在后面加一层程序。** 手 K、AI 做的动作往往只动几根骨头（挥手只动手臂），像木偶。在片段之后加一层程序算的「带动」（肩膀跟着抬、躯干让、手腕落后、头晚半拍），片段自己写了的骨头不叠。一次做好，所有动作都受益，还能开关对比。
3. **验证靠逐帧记数，不靠看。** 动画的问题只有一两帧，肉眼很难确认修好了没有。逐帧记下那根骨头（参数）**画上去时**的值（在 render 之后，或 Live2D 的 `beforeModelUpdate` 里读），修之前、修之后各记一遍对比；再在两个不同的模型上截图看。

## 什么时候读哪里

| 要做的事 | 读 |
|---|---|
| Live2D：加载、写参数、物理、待机、动作、定住、表情 | `references/live2d.md` |
| VRM：程序姿势和片段、带动层、动捕片段、表情、弹簧骨骼、透明窗口 | `references/vrm.md` |
| VRM：动作配表情、手型和手腕、手碰身上的 IK、打断不掉手、腿的上限、眼睛跟头、关键帧插值和分段 | `references/vrm.md` 第 19–31 条 |
| 让 AI 生成或修改表情、动作 | `references/ai-motion.md` |
| 跟着音乐点头、说话时头动 | `references/live2d.md` 第 16 条、`references/vrm.md`「跟节拍」 |

## 最常见的坑（先查这几条）

| 现象 | 原因 | 改法 |
|---|---|---|
| Live2D 报「Could not find Cubism runtime」或画不出来 | 加载顺序错了 | Cubism Core → 注册 render pipe 的模块 → PixiJS `Application.init()` → 模型 |
| Live2D 写参数读出 58、null 这种怪值 | 直接传了字符串 ID | 先 `internalModel.getIdSafe(name)` 换成句柄 |
| Live2D 头不跟着动（VTube Studio 模型） | `ParamAngle*` 是物理的输出，写了被盖掉 | 读 `physics3.json`，改写到它的输入参数 |
| Live2D 只有头在晃，头发、身体不动 | 叠加放在物理之后 | 包住 `physics.evaluate`，在它之前加 |
| Live2D 站着一动不动 | VTube Studio 模型没有像样的 Idle | 程序待机：头、身体三个慢正弦 + 呼吸，只写标准参数 |
| Live2D `stopAllMotions` 后又自己动起来 | 引擎发现没动作就再播 Idle | 把 `motionManager.groups.idle` 指到不存在的组，再停 `breath` |
| VRM 手 K 动作停住的那段手放下、首尾闪一下 | mixer 不写没变的值，程序站姿露出来 | 程序姿势跳过片段写着的骨头 |
| VRM 一次性动作结束时一帧跳回 | `clampWhenFinished=false` 时 mixer 在 `finished` 之前就关了 action | `clampWhenFinished = true`，再 `fadeOut` |
| VRM 动捕动作站得很宽、开头挪一下、裙子甩起来 | 片段自带胯和腿 | 转换时删掉胯、腿的轨道，只用上半身 |
| VRM 裙子穿进大腿，碰撞辅助线只看到一两个球 | 碰撞体没登记进弹簧链的碰撞组（three-vrm 只认登记了的） | 按标准骨骼给胯下面的链补腿的胶囊；胯别一帧跳过去（`references/vrm.md` 第 15 条） |
| VRM 片段里写的表情看不到 | 每帧的状态表情、眨眼、口型盖掉了 | 片段只写骨头 |
| 表情在小尺寸下看不出来 | 表情文件只改了一小块 | 每个情绪再叠一层参数（眯眼、脸红、歪头、嘴角） |
| VRM 做动作时脸上没表情 | 表情只跟着状态走，动作没带 | 动作旁边写 mood + beats，按动作权重混进去（`references/vrm.md` 第 25 条） |
| 动作要闭眼、张嘴，模型自己的「困」「笑」挡住了 | 表情的 `overrideBlink` / `overrideMouth` 是 block | 那一下把这些表情压下去（第 26 条） |
| VRM 单眼眨看不到 | `blinkLeft`/`blinkRight` 没绑形态键 | 两只眼一起眯代替（第 27 条） |
| VRM 一个动作打断另一个，手掉下去再抬起来 | 新动作从站姿开始，交叉淡入经过站姿 | 从新动作里最像现在的那一刻开始 + 从打断那一刻过渡（第 19 条） |
| VRM 动捕手指直板或攥拳；手 K 动作手指一直半握 | 重定向的手指 / 动作不写手指 | 去掉动捕手指，动作里写手型（第 22、23 条） |
| 托腮、捂嘴、比心换个身材就落不到地方 | 只写角度 | 按骨头和网格现算目标，两节 IK（第 24 条） |
| 跳舞结束脚一帧跳回去 | 腿 IK 在淡出开始就当帧接管 | IK 按带腿动作的权重慢慢接过来（第 20 条） |
| 膝盖半蹲、放松的腿弯太多 | 几层胯的偏移叠在一起 | 膝盖上限，二分缩胯；抬脚跟反而多弯（第 21 条） |
| VRM 眼睛一直死盯着镜头 | lookAt 对着镜头，转头时眼睛反着转 | 动作转头时视线跟头、转头眨眼、小眼动（第 28 条） |
| 手 K 动作一顿一顿的、不连贯 | 每段关键帧都两头慢，每个关键帧速度为 0 | 单调三次样条 + 各节关键帧错开（第 29 条） |
| 伸懒腰、举手手臂直直从两边扫上去 / 往两边平伸 | 没有收拳、前臂折起这些段；扭转和抬臂没分开 | 分段重做，扭转只在门框那一下（第 30 条） |
| 闲置换重心时上半身整个歪向一边 | 膝盖上限缩了胯的歪，腰胸还按完整的反着转 | 胯少歪的部分加到腰上（第 31 条） |

## 来源与维护

- **来源：** Cirra（AI 桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)），2026-10 至 2026-11。
  - Live2D 代码：`src/pet/live2d.ts`、`src/pet/live2d-physics.ts`、`src/pet/cubism-core.ts`；渲染库 `untitled-pixi-live2d-engine` 1.4.0（PixiJS 8）。
  - VRM 代码：`src/pet/vrm.ts`、`src/pet/vrm-motion.ts`，2026-11-11 起还有 `vrm-face.ts`、`vrm-hands.ts`、`vrm-blend.ts`、`vrm-reach.ts`、`vrm-gaze.ts`；提交 2b6ab57（clampWhenFinished）、e5e8687（不用 combineSkeletons）。
  - 文档：`docs/stage5.md`、`docs/live2d-motions.md`、`docs/live2d-common-motions.md`、`docs/live2d-studio.md`、`docs/loop-motions.md`、`docs/expression-outfit-split.md`、`docs/music.md`、`docs/vrm.md`、`docs/vrm-motion.md`、`docs/vrm-motion-library.md`、`docs/vrm-studio.md`、`docs/vrm-toon.md`、`docs/beat-tracking.md`、`docs/vrm-skirt.md`、`docs/vrm-motion-polish.md`。
  - 经验：私人 repo 的 [`lessons/live2d-motion.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/live2d-motion.md)、`lessons/threejs-vrm-animation.md`。
- **源头：** [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的 `skills/live2d-vrm-animation/`。`~/.claude/skills/` 里的是安装出来的副本，不要直接改。Cirra 里的代码是它的来源，两边不会自动同步。
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
