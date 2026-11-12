# vrm-model-conversion

> 每个模型一份短的 build 脚本，通用部分都在 `vrm_kit.py` 里。Blender 在后台跑，改一处就重跑一遍。

把带骨架的 3D 人物模型转成 VRM 1.0，给 three-vrm 网页、桌宠、VTuber 软件用。目标是一个能站好、能做动作、会眨眼说话、头发衣服会动、不乱穿模的 `.vrm`。

## 能处理什么

- **来源：** FBX、PMX/MMD、XPS、glTF/GLB、.blend；骨架来自 Mixamo、Unity/VRChat、VRoid、Daz Genesis、Auto-Rig Pro、Rigify、3ds Max Biped、RE Engine 等。
- **骨骼：** 骨头名自动对应到 VRM 标准骨骼（已在 9 种命名习惯上测过），A-pose 转 T-pose。
- **表情：** 已有形态键的直接绑定；只有脸部骨头的，烘焙成形态键。
- **物理：** 头发和衣服的弹簧骨骼；没有物理骨的，自动加骨链并重新分配权重；碰撞体按骨头坐标放置。
- **材质：** MToon、发片两遍绘制、贴图缩小。
- **许可：** 填写 VRM meta。别人做的模型一律标成「仅作者本人使用、不可再分发」。

## 包含什么

| | |
|---|---|
| `scripts/vrm_kit.py` | 参数化的 Blender 工具库，不写死任何文件名 |
| `scripts/build_template.py` | 每个模型复制一份来改的 build 模板 |
| `scripts/inspect_vrm.py` | 不需要 Blender 的 VRM 检查脚本，直接读 JSON 出报告 |
| `scripts/test_bone_names.py` | 骨骼名字表的测试，用假骨架跑 |
| `evals/` | 2 个测试用例：碰撞组丢失、骨头驱动脸的游戏 FBX |

## 安装

```bash
npx skills add RedCarpG/redcarpg-skills -s vrm-model-conversion
```

依赖：Blender 4.2+ 和 [VRM Add-on for Blender](https://vrm-addon-for-blender.info/)（实测 Blender 4.5 LTS + 插件 4.10.3）；`inspect_vrm.py` 只需要 Python 3。

## 关于模型许可

这个 skill 只提供转换方法，不附带任何模型。转换别人做的模型之前，先看清作者的许可。转出来的文件不要公开发布或再分发，除非许可明确允许。

## 来源

来自桌宠 [Cirra](https://github.com/RedCarpG/cirra-deskpet)：先给几个模型各写了一份写死的转换脚本，后来整理成了通用工具。详见 [SKILL.md](./SKILL.md) 末尾的「来源与维护」。
