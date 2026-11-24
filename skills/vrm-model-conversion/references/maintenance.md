# 来源与维护（完整版）

SKILL.md 末尾是精简版；完整的来源、改法和历次更新记录在这里。新的更新记录照旧加在 SKILL.md。

## 来源与维护

- **来源**：Cirra（桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）2026-11-10 把一个游戏角色模型（FBX，Auto-Rig Pro 导出的骨架、脸是骨头带的、头发和衣服没有物理骨）转成 VRM 时整理出来的；之前转 NeoBit（FBX）和 Yumeka（VRChat 的 .blend）各写过一份写死的脚本。对应文件在那个项目不进 git 的 `packs-src/` 里：第一个用 kit 的模型的 `build_vrm.py`、`packs-src/neobit-build/`、`packs-src/yumeka-build/`（碰撞组 uuid 的 bug 就是在这里发现、修的），说明在 `docs/local/yumeka.md`、`docs/vrm-skirt.md` §4.2。经验记在私人 repo 的 [`lessons/vrm-model-conversion.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/vrm-model-conversion.md)。
- **源头**：开发源在 [RedCarpG/redcarpg-skills-private](https://github.com/RedCarpG/redcarpg-skills-private) 的 `skills/vrm-model-conversion/`，每周发版到 [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的同名目录。各 agent 的 skills 目录里是 bootstrap 建的链接，公开仓和 claude.ai 上的是发布出来的副本，都不要直接改。各模型 build 文件夹里的 `vrm_kit.py` 也是复制品。
- **怎么改**：
  - 在 redcarpg-skills 里改，走 PR；`manifest.json` 版本加一，`node scripts/validate.mjs` 通过后发版（tag `vrm-model-conversion-v<版本>`），再重装本机副本。
  - 改了 `vrm_kit.py`：`KIT_VERSION` 加一；至少拿一个模型从头跑一遍 build，`inspect_vrm.py` 没问题、截图看过再算改好。
  - 名字表 `BONE_ALIASES` 加新的命名习惯时，写清楚是哪种骨架，在 `scripts/test_bone_names.py` 里加一组假骨架，跑 `blender -b --factory-startup --python scripts/test_bone_names.py` 要打出 `RESULT PASS`；别为一个模型的怪名字改表（用 overrides）。
  - 改了做法或坑，同步改 lessons 文件；测试用例在 `evals/`。
  - 下面加一行更新记录。
- **更新记录**：
  - 2026-11-12 · 1.1.0（kit 版本不变），搬进 redcarpg-skills 公开发布。改掉本机绝对路径，来源项目写成链接；内容不变。
  - 2026-11-11，Cirra：1.1.0。转第二个游戏角色模型（RE Engine 骨架，770 根骨、平铺的骨头脸）时加了：`quiet_vrm_addon`（关掉插件对大骨架的结构搜索）、`drop_missing_images`（找不到的贴图让导出被取消）、姿势键支持 `re:` 正则和 `pivot` 绕点转、`mirror` 支持 `_L/_R` 和正则、`combine_alpha`、`fix_hips`（胯和脊椎是兄弟时换成父骨头）、名字表加 RE Engine（`test_bone_names.py` 9 组全过）。
  - 2026-11-10，Cirra：初版。`vrm_kit.py` 1.0.0（导入、骨骼名字表（`test_bone_names.py` 在 8 种命名的假骨架上全过）、骨头烘表情、加骨链和重新分权重、碰撞体按骨头坐标、两遍画的发片、MToon、meta）、`inspect_vrm.py`、`build_template.py`。在一个游戏角色模型（FBX）上从头跑通，Cirra 的 VrmPet 里看过站姿、四个动作、15 个表情、面纱和袖子的摆动；`inspect_vrm.py` 也在 Yumeka（修 bug 前后）上对过。
