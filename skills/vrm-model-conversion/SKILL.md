---
name: vrm-model-conversion
description: 在 Blender 后台把带骨架的 3D 人物模型（FBX、PMX/MMD、glTF、.blend 等）转成 VRM 1.0：骨骼对应、表情、头发衣服的弹簧骨和碰撞体、MToon、meta 许可。附 vrm_kit.py、inspect_vrm.py。用户想「把模型转成 VRM」或 VRM 表情不动、头发不飘时用。Convert avatars to VRM 1.0 in Blender.
---

# 把 3D 模型转成 VRM 1.0

目标：一个能在 three-vrm（和别的 VRM 1.0 应用）里站好、能做动作、会眨眼说话、头发衣服会动、不乱穿模的 `.vrm`。做法是**每个模型一份短的 build 脚本**，通用部分都在 `scripts/vrm_kit.py`（下文 `K`）；Blender 后台跑，改一处重跑一遍，结果可复现。

工具：Blender 4.2+ 和 VRM Add-on for Blender（实测 Blender 4.5 LTS + 插件 4.10.3）。

```bash
blender -b --disable-autoexec --python build_vrm.py -- <模型文件或文件夹> <out.vrm> [存一份.blend]
python -I scripts/inspect_vrm.py out.vrm      # 不用 Blender，读 VRM 的 JSON 出检查报告
```

从 `scripts/build_template.py` 复制一份开始写 build 脚本。`--disable-autoexec`：下载来的 .blend 可能带自动运行的 Python。别用 `--factory-startup` 跑转换（会关掉 VRM 插件），只读检查时可以用。

## 流程

1. **挑源文件：** 压缩包按不可信数据，每份解到新的空文件夹，不运行里面的东西。几份都有时看骨架修改器、骨头数、形态键、骨链、贴图、三角形数再挑；同一作者的 FBX/PMX/XPS 选 FBX。
2. **导入：** `K.import_model`（会应用缩放旋转、关掉大骨架的自动对应、删找不到的贴图）；.blend 直接打开。
3. **骨骼对应：** `K.guess_humanoid(arm, overrides)`，看打出的「骨骼对应」，错的用 overrides 改。
4. **姿势和朝向：** 不用自己掰，插件导出时自动摆 T-pose、换朝向。
5. **表情：** 已有形态键就绑；脸是骨头带的就 `K.bake_bone_expressions` 烘成形态键；至少做 blink 和 aa。
6. **弹簧骨骼：** 已有骨链就列链；没有就 `K.rig_cloth` 加骨链重新分权重。
7. **碰撞体：** 头、颈、胸、腰、胯、大腿；半径量网格。
8. **材质：** `K.mtoon`，发片用 `K.alpha_two_pass`，`K.downscale_images(2048)`。
9. **meta：** `K.set_meta(..., personal_only=True)`。
10. **检查：** 过检查清单，每项有证据。

## 不看就会做错的几条

- 几百根骨头的骨架先关掉插件的自动对应（`K.quiet_vrm_addon()`），否则跑十几分钟还对错。
- 导出被取消（`CANCELLED`、无日志）多半是找不到文件的贴图引用：`K.drop_missing_images()`。
- 错的骨骼对应用 overrides 改，**别改名字表迁就一个模型**；扭转骨不是人形骨。
- VRM 1.0 表情**只能绑形态键，不能绑骨头姿势**。说话时挂着的表情要睁眼；管眼睛的表情 `override_blink='block'`。
- 碰撞体和组**加完马上记 uuid**（插件集合会重排）；offset 在骨头自己的坐标里（kit 让你写世界方向）。
- 长裙蒙在两条腿上的别加弹簧。
- 游戏贴图先看通道：RE Engine 的 `ALBM` 的 A 是金属度不是透明度。
- 别人的、游戏提取的模型一律 `personal_only`，产物只在本机、不进 git、不公开。
- 每次从源文件重跑，不在上次结果上改；跑一次 3–4 分钟，后台跑。

## 什么情况读哪里

| 情况 | 读 |
|---|---|
| 挑哪份源文件、各格式导入（FBX 缩放、PMX、XPS、.blend）、骨骼名字表认哪些、Daz/MMD/Biped 的对应、T-pose | `references/source-and-import.md` |
| 绑形态键、骨头脸烘表情（世界方向、正则键、pivot、眨眼曲线、位移分给一圈、下唇）、override | `references/expressions.md` |
| 已有骨链、`K.rig_cloth` 加骨链、挑什么加、弹簧参数、碰撞体的坑和放哪 | `references/springs-colliders.md` |
| MToon 的三种 alpha、发片两遍画、游戏贴图通道、写实贴图参数、缩贴图、meta 和许可 | `references/materials-meta.md` |
| 导出后的检查清单（inspect、站姿、动作、表情图、头发 GIF、真应用里加载）、kit 版本和复制品 | `references/checklist.md` |
| 完整来源、改法（`KIT_VERSION`、`test_bone_names.py`）、更早的更新记录 | `references/maintenance.md` |

角色在应用里怎么动得自然：`live2d-vrm-animation`；录头发摆动 GIF：`animation-capture`。

## 来源与维护

- **来源：** Cirra（桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）2026-11-10 把一个游戏角色模型转成 VRM 时整理出来，之前转 NeoBit 和 Yumeka 各写过写死的脚本；经验在私人 repo 的 [`lessons/vrm-model-conversion.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/vrm-model-conversion.md)。对应文件见 `references/maintenance.md`。
- **源头：** [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/vrm-model-conversion/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills)。各 agent 的 skills 目录、公开仓、claude.ai 上的都是副本，各模型 build 文件夹里的 `vrm_kit.py` 也是复制品，都不要直接改。
- **怎么改：** 改了 `vrm_kit.py`：`KIT_VERSION` 加一，至少拿一个模型从头跑 build，`inspect_vrm.py` 没问题、截图看过；名字表加新命名习惯时在 `scripts/test_bone_names.py` 加假骨架，`blender -b --factory-startup --python scripts/test_bone_names.py` 打出 `RESULT PASS`；改了做法同步 lessons；发版时 `manifest.json` 升版本；下面加一行更新记录。
- **更新记录：**（更早的完整记录见 `references/maintenance.md`）
  - 2026-11-20 · skill 管理会话 · description 收短，正文细节移到 references/，SKILL.md 只留流程和索引（省 token）
  - 2026-11-12 · 1.1.0（kit 版本不变），搬进 redcarpg-skills 公开发布。
  - 2026-11-11，Cirra：1.1.0，RE Engine 模型（`quiet_vrm_addon`、`drop_missing_images`、正则键和 pivot、`combine_alpha`、`fix_hips`）。
  - 2026-11-10，Cirra：初版，`vrm_kit.py` 1.0.0、`inspect_vrm.py`、`build_template.py`。
