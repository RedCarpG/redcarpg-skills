# 挑源文件、导入、骨骼对应、姿势

原 SKILL.md 对应各节，2026-11-20 移来。`K` 是 `scripts/vrm_kit.py`，`S` 是 `K.Springs(arm)` 的实例（见 `scripts/build_template.py`）。

## 目标、工具和命令（原 SKILL.md 开头）

目标：一个能在 three-vrm（和别的 VRM 1.0 应用）里站好、能做动作、会眨眼说话、头发衣服会动、不乱穿模的 `.vrm`。做法是**每个模型一份短的 build 脚本**，通用的部分都在 `scripts/vrm_kit.py` 里；Blender 在后台跑，改一处重新跑一遍，结果可复现。

工具：Blender 4.2+ 和 VRM Add-on for Blender（实测 Blender 4.5 LTS + 插件 4.10.3，扩展装在便携版的 `portable/extensions/user_default/vrm`）。命令：

```bash
blender -b --disable-autoexec --python build_vrm.py -- <模型文件或文件夹> <out.vrm> [存一份.blend]
python -I scripts/inspect_vrm.py out.vrm      # 不用 Blender，读 VRM 的 JSON 出检查报告
```

`--disable-autoexec`：下载来的 .blend 可能带自动运行的 Python。别用 `--factory-startup` 跑转换（会关掉 VRM 插件）；只读检查时可以用。

## 先看手里的东西，挑一份

下载来的压缩包按不可信数据处理：每份解到一个新的空文件夹，不运行里面的脚本和 exe。Windows 10/11 自带的 `C:\Windows\System32\tar.exe`（libarchive）能解 .zip、**.7z、.rar**，多数时候不用装 7-Zip。

同一个角色常有几份（不同站点、不同格式）。先在 Blender 里列一遍再选（`blender -b --factory-startup --disable-autoexec x.blend --python inspect.py`，或导入 FBX 后列）：

| 看什么 | 为什么 |
|---|---|
| **网格的骨架修改器指着谁** | 有的包骨架丢了（实测：一份 Daz 改的 .blend，身体网格有 171 个顶点组、骨架修改器却是空的），这种不能用 |
| 骨头数、命名 | 游戏导出的骨架（几十到一百根，只有变形骨）比带控制器的绑定（几百根，`c_`、`MCH-`、`ORG-`）好转 |
| 形态键 | 有没有眨眼、口型、表情；几百个的（Daz）要删 |
| 有没有头发、裙子的骨链 | 有就直接做弹簧；没有要加（见 `springs-colliders.md`） |
| 贴图齐不齐、多大、有没有透明通道 | 头发、蕾丝靠透明；4K、8K 要缩 |
| 三角形数 | 桌宠、网页 15 万以内比较稳 |

同一份模型给了 FBX、PMX、XPS 三种时，多半是一个人从同一份导出的（PMX 写着 `exported by mmd_tools` 就是），选 **FBX**：骨架和材质最完整。

直接从游戏里提取的（RE Engine 的 `pl2000`、`ALBM/ATOS/NRMR` 贴图那种）通常比别人改装过的更完整：自带头发、裙子的物理骨，脸是整套骨头，贴图分辨率高。几份都能用时可以都做，让用户挑。

## 导入

**几百根骨头的骨架先关掉 VRM 插件的自动对应**：插件第一次碰到骨架会做一次「找人形骨」的结构搜索，几十根骨头一眨眼，770 根的游戏骨架（带肌肉骨、修正骨）跑了十几分钟还没完、对出来的也是错的（把腿骨当成脊椎）。`K.import_model` 导入后会调 `K.quiet_vrm_addon()` 关掉；直接打开 .blend 的，build 脚本开头自己调一次。

**找不到文件的贴图引用要删掉**：提取工具导出的 FBX 常带着作者电脑上的绝对路径（某个 `.dds`），VRM 插件导出前检查到「文件不存在」就直接取消导出（返回 `CANCELLED`，日志里没有别的话）。`K.import_model` 会调 `K.drop_missing_images()`；导出被取消时，用插件的 `WM_OT_vrm_validator.detect_errors` 把错误列出来看。


| 格式 | 怎么进 | 注意 |
|---|---|---|
| FBX | `K.import_model`（`import_scene.fbx`） | 常带 0.01 缩放（骨架 scale 0.01、网格单位是厘米）和 -90° 旋转：`K.apply_transforms` 应用掉，打出来的高度应该像真人（1.5–1.9 m） |
| glTF/GLB、VRM 0.x | 同上 | VRM 0.x 转 1.0：导入后改 `spec_version` 再导出 |
| PMX/PMD | 要 mmd_tools 扩展；缩放 0.08 | 没有就找 FBX；PMX 的物理（刚体、关节）不会变成 VRM 弹簧，要自己配 |
| XPS | 要 XNALara 插件 | 一般还有别的格式，优先别的 |
| .blend | 直接用 blender 打开它，脚本里不调 `import_model` | 别人的 .blend 里常有控制器形状（`cs_`、`WGT-`）、隐藏的服装变体：`K.drop_meshes` 删掉 |

## 骨骼对应

`K.guess_humanoid(arm, overrides)` 按名字表 `BONE_ALIASES` 自动对，认：Mixamo（`mixamorig:LeftArm`）、Unity Humanoid / VRoid（`J_Bip_L_UpperArm`）、UE（`upperarm_l`、`calf_l`）、Auto-Rig Pro 导出（`root.x`、`arm_stretch.l`、`forearm_stretch.l`、`thigh_stretch.l`、`c_index1.l`）、Rigify（`DEF-upper_arm.L`）、3ds Max Biped（`Bip001 L UpperArm`）、Daz Genesis（`lShldrBend`、`lForearmBend`、`lThighBend`、`lShin`）、MMD 日文（`左腕`、`左ひじ`、`左足`、`左ひざ`）、游戏提取常见的 `L_UpperArm`。对不上的再交给插件自己的自动对应，必需的还缺就报错。

- 先看打出来的「骨骼对应」那一行，**错的用 overrides 改**，别改名字表去迁就一个模型。先比完整名字、再比去掉前缀的，一根骨头只给一个位置（不然 Biped 的 `Spine2` 会同时当 chest 和 upperChest）。Biped 的手指（`Finger0`–`Finger4`）不在表里，用 overrides。
- 扭转骨（`arm_twist`、`thigh_twist`、`ForeArmTwist`）不是人形骨，别对上去；`_stretch`、`Bend` 才是主骨。
- 眼睛（`leftEye`/`rightEye`）对上了才能用骨头看人（`K.look_at_bones`）；下巴（`jaw`）可选。
- Daz 的 `abdomenLower/Upper`、`chestLower/Upper` 对 spine/chest/upperChest；MMD 的 `上半身2` 是 chest。

## 姿势和朝向

VRM 1.0 要求静止姿势是 T-pose、朝 +Z。**不用自己掰**：插件导出时 humanoid 的 pose 默认是「自动」，会把 A-pose 摆成 T-pose 再写；朝向也由插件换（Blender 里朝 -Y 就对）。导出后用 `inspect_vrm.py` 看「左臂下垂 0°」「左手在 +X」。
