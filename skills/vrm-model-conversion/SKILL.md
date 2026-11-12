---
name: vrm-model-conversion
description: 把带骨架的 3D 人物模型（FBX、PMX/MMD、XPS、glTF/GLB、.blend；来自 Mixamo、MMD、Unity/VRChat、Daz Genesis、Auto-Rig Pro、Rigify、3ds Max Biped、游戏提取）在 Blender 后台转成 VRM 1.0，给 three-vrm 网页、桌宠、VTuber 软件、VRChat 外的应用用。管：解压和挑哪份源文件、各格式怎么导入、骨头名自动对应到 VRM 标准骨骼、A-pose 转 T-pose、表情（已有形态键直接绑；只有脸部骨头的烘成形态键）、头发和衣服的弹簧骨骼（没有物理骨的就加骨链、按位置重新分权重）、碰撞体、MToon 材质和发片透明、贴图缩小、VRM meta 和许可，以及一份检查清单。附可复用的 Blender 脚本 vrm_kit.py（参数化，不写死文件名）、模板 build_template.py、不用 Blender 的检查脚本 inspect_vrm.py。只要用户想「把这个模型转成 VRM」「这个 FBX/PMX 能不能给 three-vrm 用」「给模型加表情、加头发物理、加弹簧骨」「VRM 的表情不动、头发不飘、裙子穿模、碰撞体没用」「下载了个模型想当桌宠/虚拟形象」，就用这个 skill，即使没说 VRM。Also use for English requests to convert FBX/PMX/glTF/blend avatars to VRM, set up VRM expressions, spring bones or colliders, or debug a VRM export from Blender.
---

# 把 3D 模型转成 VRM 1.0

目标：一个能在 three-vrm（和别的 VRM 1.0 应用）里站好、能做动作、会眨眼说话、头发衣服会动、不乱穿模的 `.vrm`。做法是**每个模型一份短的 build 脚本**，通用的部分都在 `scripts/vrm_kit.py` 里；Blender 在后台跑，改一处重新跑一遍，结果可复现。

工具：Blender 4.2+ 和 VRM Add-on for Blender（实测 Blender 4.5 LTS + 插件 4.10.3，扩展装在便携版的 `portable/extensions/user_default/vrm`）。命令：

```bash
blender -b --disable-autoexec --python build_vrm.py -- <模型文件或文件夹> <out.vrm> [存一份.blend]
python -I scripts/inspect_vrm.py out.vrm      # 不用 Blender，读 VRM 的 JSON 出检查报告
```

`--disable-autoexec`：下载来的 .blend 可能带自动运行的 Python。别用 `--factory-startup` 跑转换（会关掉 VRM 插件）；只读检查时可以用。

## 1. 先看手里的东西，挑一份

下载来的压缩包按不可信数据处理：每份解到一个新的空文件夹，不运行里面的脚本和 exe。Windows 10/11 自带的 `C:\Windows\System32\tar.exe`（libarchive）能解 .zip、**.7z、.rar**，多数时候不用装 7-Zip。

同一个角色常有几份（不同站点、不同格式）。先在 Blender 里列一遍再选（`blender -b --factory-startup --disable-autoexec x.blend --python inspect.py`，或导入 FBX 后列）：

| 看什么 | 为什么 |
|---|---|
| **网格的骨架修改器指着谁** | 有的包骨架丢了（实测：一份 Daz 改的 .blend，身体网格有 171 个顶点组、骨架修改器却是空的），这种不能用 |
| 骨头数、命名 | 游戏导出的骨架（几十到一百根，只有变形骨）比带控制器的绑定（几百根，`c_`、`MCH-`、`ORG-`）好转 |
| 形态键 | 有没有眨眼、口型、表情；几百个的（Daz）要删 |
| 有没有头发、裙子的骨链 | 有就直接做弹簧；没有要加（§6） |
| 贴图齐不齐、多大、有没有透明通道 | 头发、蕾丝靠透明；4K、8K 要缩 |
| 三角形数 | 桌宠、网页 15 万以内比较稳 |

同一份模型给了 FBX、PMX、XPS 三种时，多半是一个人从同一份导出的（PMX 写着 `exported by mmd_tools` 就是），选 **FBX**：骨架和材质最完整。

直接从游戏里提取的（RE Engine 的 `pl2000`、`ALBM/ATOS/NRMR` 贴图那种）通常比别人改装过的更完整：自带头发、裙子的物理骨，脸是整套骨头，贴图分辨率高。几份都能用时可以都做，让用户挑。

## 2. 导入

**几百根骨头的骨架先关掉 VRM 插件的自动对应**：插件第一次碰到骨架会做一次「找人形骨」的结构搜索，几十根骨头一眨眼，770 根的游戏骨架（带肌肉骨、修正骨）跑了十几分钟还没完、对出来的也是错的（把腿骨当成脊椎）。`K.import_model` 导入后会调 `K.quiet_vrm_addon()` 关掉；直接打开 .blend 的，build 脚本开头自己调一次。

**找不到文件的贴图引用要删掉**：提取工具导出的 FBX 常带着作者电脑上的绝对路径（某个 `.dds`），VRM 插件导出前检查到「文件不存在」就直接取消导出（返回 `CANCELLED`，日志里没有别的话）。`K.import_model` 会调 `K.drop_missing_images()`；导出被取消时，用插件的 `WM_OT_vrm_validator.detect_errors` 把错误列出来看。


| 格式 | 怎么进 | 注意 |
|---|---|---|
| FBX | `K.import_model`（`import_scene.fbx`） | 常带 0.01 缩放（骨架 scale 0.01、网格单位是厘米）和 -90° 旋转：`K.apply_transforms` 应用掉，打出来的高度应该像真人（1.5–1.9 m） |
| glTF/GLB、VRM 0.x | 同上 | VRM 0.x 转 1.0：导入后改 `spec_version` 再导出 |
| PMX/PMD | 要 mmd_tools 扩展；缩放 0.08 | 没有就找 FBX；PMX 的物理（刚体、关节）不会变成 VRM 弹簧，要自己配 |
| XPS | 要 XNALara 插件 | 一般还有别的格式，优先别的 |
| .blend | 直接用 blender 打开它，脚本里不调 `import_model` | 别人的 .blend 里常有控制器形状（`cs_`、`WGT-`）、隐藏的服装变体：`K.drop_meshes` 删掉 |

## 3. 骨骼对应

`K.guess_humanoid(arm, overrides)` 按名字表 `BONE_ALIASES` 自动对，认：Mixamo（`mixamorig:LeftArm`）、Unity Humanoid / VRoid（`J_Bip_L_UpperArm`）、UE（`upperarm_l`、`calf_l`）、Auto-Rig Pro 导出（`root.x`、`arm_stretch.l`、`forearm_stretch.l`、`thigh_stretch.l`、`c_index1.l`）、Rigify（`DEF-upper_arm.L`）、3ds Max Biped（`Bip001 L UpperArm`）、Daz Genesis（`lShldrBend`、`lForearmBend`、`lThighBend`、`lShin`）、MMD 日文（`左腕`、`左ひじ`、`左足`、`左ひざ`）、游戏提取常见的 `L_UpperArm`。对不上的再交给插件自己的自动对应，必需的还缺就报错。

- 先看打出来的「骨骼对应」那一行，**错的用 overrides 改**，别改名字表去迁就一个模型。先比完整名字、再比去掉前缀的，一根骨头只给一个位置（不然 Biped 的 `Spine2` 会同时当 chest 和 upperChest）。Biped 的手指（`Finger0`–`Finger4`）不在表里，用 overrides。
- 扭转骨（`arm_twist`、`thigh_twist`、`ForeArmTwist`）不是人形骨，别对上去；`_stretch`、`Bend` 才是主骨。
- 眼睛（`leftEye`/`rightEye`）对上了才能用骨头看人（`K.look_at_bones`）；下巴（`jaw`）可选。
- Daz 的 `abdomenLower/Upper`、`chestLower/Upper` 对 spine/chest/upperChest；MMD 的 `上半身2` 是 chest。

## 4. 姿势和朝向

VRM 1.0 要求静止姿势是 T-pose、朝 +Z。**不用自己掰**：插件导出时 humanoid 的 pose 默认是「自动」，会把 A-pose 摆成 T-pose 再写；朝向也由插件换（Blender 里朝 -Y 就对）。导出后用 `inspect_vrm.py` 看「左臂下垂 0°」「左手在 +X」。

## 5. 表情

VRM 1.0 的表情只能绑形态键（还有材质颜色、贴图偏移），**不能绑骨头姿势**。三种情况：

1. **已有形态键**：`K.bind_expressions(arm, {'blink': {'まばたき': 1}, ...})`，形态键在哪些网格上自动找。常见命名：MMD（まばたき、あ、い、う、え、お、笑い、怒り、困る）、VRChat（`vrc.blink`、`vrc.v_aa`…）、ARKit（eyeBlinkLeft、jawOpen、mouthSmileLeft…）、Daz（`eJCMSmileFullFace` 一类）。插件也有 `assign_vrm1_expressions_from_mmd/vrchat/arkit`。作者在 Unity 里配好的表情（`*.anim`）可以照着写成配方（几个形态键加权）。
2. **脸是骨头带的**（游戏模型常见：眼皮、下巴、嘴角、眉毛都是骨头）：`K.bake_bone_expressions` 摆姿势、和静止比、把差写成形态键，只写在动了的网格上（脸、睫毛、眉毛、眼影、口腔各是一个网格时都要传进去）。姿势用**世界方向**写（`rx` 正 = 往下转），换算到每根骨头由 kit 做；只写左边，`K.mirror` 镜像右边。
   - 角度要看截图调：一样的角度左右眼可能合不上一样多（蒙皮不对称，实测 50° 左眼全合、右眼露一条，右边要 60°）。
   - 口型：aa 下巴开 13° 左右，ou/oh 嘴角往里收，ih/ee 往外拉。
   - **平铺的脸**（RE Engine 这类：一百多根小骨头都直接挂在 head 下，没有下巴骨）：姿势的键可以写 `'re:正则'` 一次选一组（`'re:^eyelid_0\d_L$'`），`K.mirror(spec, '_L', '_R')` 镜像；张嘴用 `{'rx': 9, 'pivot': 铰链点}` 让下半张脸那圈骨头绕下巴铰链一起转。找铰链：下牙跟着哪根骨头（RE 是 `Teeth`），它的头部就在耳前。
   - **眨眼别整排一起挪**：中间刚好合上时两头已经穿过下眼睑，闭上的线是折的。每根上眼皮骨头按自己的 x 去下眼睑那排骨头里插值出高度、落到它上面 1 mm，往前的量按往下走的比例给；半闭用同一条曲线乘比例。配方写成接收骨架的函数，从骨头位置算。
   - **一根骨头别挪太远，位移按 1 → .7 → .4 → .35 → .15 分给周围一圈**：游戏脸部骨头的影响范围小、边缘硬，笑时只挪嘴角那两根 1 cm，皮肤在边上折出一道棱（带贴图是一圈发亮的边）。Workbench 的 STUDIO 光最容易看出来。
   - **下唇转得比下巴少，而且中间多、往嘴角收**：转一样多时下唇掉得比下牙低、露出牙床；整圈同一个比例时下唇是底平的 U、嘴角张开露后槽牙。按离嘴中线的距离 d 转 0.6 × (1 − (d / 嘴半宽)²) 倍，下唇是圆弧、嘴角基本合着。
   - 先用 Workbench 渲染脸部特写调（不用每次完整导出），合适了再烘。
3. **什么都没有**：至少做 blink（必须）和 aa（说话），其他在报告里写清楚缺哪些。

还要注意：
- 说话时一直挂着的表情（开心、担心）要**睁着眼**：作者的「开心」常是眯眼笑，挂久了像一直闭眼。另做一个睁眼的（比如 `smile`）给应用用。
- 自己管眼睛的表情设 `override_blink='block'`，管嘴的设 `override_mouth='blend'`，不然和眨眼、口型叠在一起。
- 形态键几百个时 `K.prune_shape_keys` 只留用到的（VRM 体积大半是它们）。

## 6. 弹簧骨骼

**已有骨链**（VRChat、VRoid、MMD 模型的头发、裙子骨）：按名字把每条链从根到梢列出来，`S.spring(name, bones, ...)`。

**没有骨链**（游戏提取、很多 FBX：头发整块蒙在头上，长布蒙在手臂和腿上）：`K.rig_cloth` 一步做完——
1. `K.select_verts(mesh, lambda p: ...)` 用世界坐标挑顶点（比如「脖子以下、在身体前面、左边」）；先打印每组的范围（x、y、z 的最小最大）再定条件。
2. 从上到下按高度分段取中心，估出骨链；`split=('x', 3)` 把一块宽的（面纱、披风）切成几条。
3. 加骨头挂在 parent 下，顶点按离哪条链、哪一节近重新分权重：离根 `start` 米内保留原权重，往下 `ramp` 米内过渡（接头不撕开），几条链之间按距离软分配，每个顶点最多 4 个骨头。

挑什么加：
- 头发量一下再加：「长头发」可能只是前面两缕（实测一个盘发模型，背后垂下来的只有 28 个顶点，不值得加）。
- 长裙蒙在两条腿上的，**别加弹簧**：跟着腿走最稳，加了反而会被腿顶穿；三维应用一般也会给裙子补腿的碰撞。
- 挂在手臂上的长袖、披帛可以加，但手一抬它会跟着整片抬起来（物理上就是这样），告诉用户。
- 参数：根硬梢软（stiffness 列表如 `[1.5, 1.0, .8, .6, .5]`），gravity .3–.4，drag .45–.5；裙子要硬、几乎没重力（3 / .02），软了会往里收贴到腿上。

## 7. 碰撞体

两个实测的坑，`K.Springs` 已经避开：
- **加完马上记 uuid**。插件的集合会重排，存 `sb.colliders[-1]` 这一项、之后再加，引用就失效：最后组里只剩一个碰撞体、别的组整个丢掉（实测一个导出的 VRM 里碰撞组只剩右膝盖一个球，`head` 组没了）。组也一样，记 `g.uuid`。
- **offset、tail 在骨头自己的坐标里**（插件导出的骨头节点带朝向，Y 沿骨头）：大腿的 Y 朝下，写 `(0,-0.4,0)` 会朝上跑到肚子里。kit 让你写 Blender 世界方向（静止姿势下），自己换算；导出后 `inspect_vrm.py` 打出每个碰撞体在 T-pose 世界里的位置，一眼看出朝向错没错。

放哪：头（球，往上 7–9 cm）、脖子、胸（胶囊）、胸部（前面的头发会搭在上面）、腰、胯、大腿（胶囊，长度量骨头）。半径量网格：蒙到这根骨头的顶点离骨头多远。每条链只挂它可能碰到的组（前面的头发挂胸那组，背后的挂背那组）。用的应用自己还会补（比如按标准骨骼补手臂、腿的胶囊）时，就别重复放。

## 8. 材质和贴图

`K.mtoon(material, image, alpha=..., ...)` 换成 MToon：
- `OPAQUE` 皮肤；`MASK` 蕾丝、镂空、首饰、鞋（`cutoff` 决定剪掉多少）；`BLEND` 眼影、玻璃。
- **发片（一片片带半透明发丝）**：只用 MASK 像毛刺、发灰；只用 BLEND+写深度，后面的发片被前面一块块挡住；只用 BLEND 不写深度，前后乱套（都实测过）。用 `K.alpha_two_pass(hair)`：原来的 MASK（cutoff .5，写深度），复制的那份 BLEND 不写深度补边。要在加完骨链之后做（复制品带着同样的权重）。
- 游戏贴图的通道要看清楚再用：RE Engine 的 `ALBM` 是 RGB 颜色 + A 金属度（不是透明度！），透明度在 `ATOS` 的 R，法线在 `NRMR`。拿 A 当透明会整片消失。`K.combine_alpha(rgb, alpha图, 'R')` 拼成一张；先用 PIL 看每个通道的分布（小于 128 的占多少）再判断哪个是透明度。附带的 README 常写着哪个材质用哪张图。
- 写实贴图（游戏、Daz）：`toony` .45–.5、`shade` .8–.86，不然像卡通；头发贴图偏灰时把 `color` 压到 .7。
- `K.downscale_images(2048)`：4K、8K 贴图缩掉（实测 13 万三角形、11 张贴图的模型 28 MB）。

## 9. meta 和许可

`K.set_meta(..., personal_only=True)`：只许作者本人用、不商用、不再分发、不许改。**别人的模型、游戏提取的模型一律这样填**，作者写原作者（游戏角色写版权方，改装者不明就写不明）。转出来的 VRM、截图、GIF 都只在本机用：放进项目里不进 git 的地方，别进安装包、别公开。

## 10. 检查清单

导出后依次过一遍，每一项都要有证据（打印、截图或 GIF），别只看「导出成功」：

1. `python -I scripts/inspect_vrm.py out.vrm`：「问题：没发现」；必需骨骼齐；左臂 0°、左手在 +X；每个表情绑了形态键；碰撞组不空、每条链挂了组、碰撞体位置在身上该在的地方；meta 的许可是对的；三角形和大小可以接受。
2. 站姿（正、侧、斜）：没有朝后、没有躺倒、脚踩在地上、没有飘在空中的配件（控制器形状、别的服装）。
3. 几个常用动作（挥手、伸懒腰、跳舞、转身）：手臂、肩膀没有撕开，袖子和裙子跟得上。
4. 表情一张图（每个表情一格，脸部特写）：眨眼两只眼都合上、口型张得开、开心和生气看得出来、没有顶点飞出去。
5. 头发和衣服：动起来录 GIF（侧面、斜面），看甩不甩、停不停得下来、有没有穿进身体或腿。动画录制用 animation-capture skill（假时钟、逐帧可复现）。
6. 在真正要用它的应用里加载一次（它可能自己再改材质、补碰撞体、换光照）。

## 11. 其他

- 每次改脚本都从源文件重跑，不在上一次的结果上改；`build_vrm.py` 的第三个参数存一份 .blend，查问题时打开看。
- 跑一次 3–4 分钟（导入、烘表情、导出），后台跑、别干等。
- kit 有新改动时把它复制到各模型的 build 文件夹（那边是固定的复制品，版本见 `KIT_VERSION`），老模型想用新功能再换。
- 3D 角色在应用里怎么动得自然（程序姿势、动作片段、弹簧延迟）：live2d-vrm-animation skill。

## 来源与维护

- **来源**：Cirra（桌宠，[RedCarpG/cirra-deskpet](https://github.com/RedCarpG/cirra-deskpet)）2026-11-10 把一个游戏角色模型（FBX，Auto-Rig Pro 导出的骨架、脸是骨头带的、头发和衣服没有物理骨）转成 VRM 时整理出来的；之前转 NeoBit（FBX）和 Yumeka（VRChat 的 .blend）各写过一份写死的脚本。对应文件在那个项目不进 git 的 `packs-src/` 里：第一个用 kit 的模型的 `build_vrm.py`、`packs-src/neobit-build/`、`packs-src/yumeka-build/`（碰撞组 uuid 的 bug 就是在这里发现、修的），说明在 `docs/local/yumeka.md`、`docs/vrm-skirt.md` §4.2。经验记在私人 repo 的 [`lessons/vrm-model-conversion.md`](https://github.com/RedCarpG/redcarpg-skills-private/blob/main/lessons/vrm-model-conversion.md)。
- **源头**： [RedCarpG/redcarpg-skills](https://github.com/RedCarpG/redcarpg-skills) 的 `skills/vrm-model-conversion/`。`~/.claude/skills/` 里的是安装出来的副本，不要直接改。各模型 build 文件夹里的 `vrm_kit.py` 也是复制品。
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
