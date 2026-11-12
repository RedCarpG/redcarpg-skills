# live2d-vrm-animation

> 程序层和动作片段会互相覆盖。几乎所有「闪一下」「手放下了」「头不动」，都出在每帧先算谁、后写谁上。

用来在网页或桌面应用里让 Live2D 和 VRM 角色自然地动起来，适合桌宠、VTuber 工具、数字人。

## 三条原则

1. **弄清每帧的写入顺序。** Live2D 里程序叠加的值要放在物理计算之前；VRM 里 `AnimationMixer` 不会写没变的值，要跳过片段正在控制的骨头。
2. **不改动作文件，在后面加一层程序。** 加一个「带动」层：肩膀跟着抬、躯干让开、手腕落后、头晚半拍。手 K 和 AI 生成的动作都不再像木偶。
3. **靠逐帧记数验证，不靠肉眼看。** 动画的问题往往只出现在一两帧里。

## 包含什么

| | |
|---|---|
| `references/live2d.md` | Live2D：加载顺序、物理前叠加、VTube Studio 模型补齐、动作通道、表情存取 |
| `references/vrm.md` | VRM：31 条做法，包括 AnimationMixer 的坑、动捕片段只取上半身、弹簧骨延迟、裙子穿模、手型和 IK、眼睛跟头 |
| `references/ai-motion.md` | 让 AI 生成表情和动作的数据格式和校验规则 |
| `evals/` | 2 个测试用例：VRM 定住的姿势闪一下、VTube Studio 模型头不动 |

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s live2d-vrm-animation
```

配合使用：模型还不是 VRM 的话，用 [`vrm-model-conversion`](../vrm-model-conversion) 转换；要录前后对比 GIF，用 [`animation-capture`](../animation-capture)。

## 来源

来自同时支持 Live2D 和 VRM 的桌宠 [Cirra](https://github.com/RedCarpG/cirra-deskpet)，2026-10 至 2026-11。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
