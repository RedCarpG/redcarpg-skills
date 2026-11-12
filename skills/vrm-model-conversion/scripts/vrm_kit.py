# vrm_kit.py — 在 Blender（4.2+，装了 VRM Add-on for Blender 3.x/4.x）里把一个带骨架的模型转成 VRM 1.0 的工具函数。
# 用法：自己写一个很短的 build 脚本，把这个文件放在旁边（或者 sys.path 里），import 进来按顺序调用；
#   blender -b --disable-autoexec --python build_vrm.py -- <模型文件> <输出.vrm>
# 不写死任何文件名、骨头名：骨头名靠 BONE_ALIASES 自动对应，对不上的在 build 脚本里用 overrides 补。
# 版本：见 KIT_VERSION；改了这个文件把版本号加一，build 脚本旁边那份复制品也一起换。
import bpy, math, os, re, sys
from mathutils import Matrix, Quaternion, Vector

try:  # 输出重定向到文件时 print 会攒到最后才写，卡住时看不出卡在哪
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

KIT_VERSION = '1.1.0'  # 名字表在 Mixamo、Biped、UE、VRoid、MMD、Daz、Rigify、L_/R_ 游戏命名的假骨架上测过（必需骨全对上、没有重复）

# ---------------------------------------------------------------------------------------------
# 场景、导入
# ---------------------------------------------------------------------------------------------

def clear_scene():
    """清掉启动场景里的东西。不用 read_factory_settings：它会把 VRM 插件也关掉。"""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)


def import_model(path):
    """按扩展名导入。PMX 要装 mmd_tools（没装就报错说清楚）；.blend 请直接用 blender 打开，不走这里。"""
    ext = os.path.splitext(path)[1].lower()
    if ext == '.fbx':
        # 游戏提取、Unity 导出的 FBX 常带 0.01 缩放和 -90° 旋转，后面 apply_transforms 摆正
        bpy.ops.import_scene.fbx(filepath=path, use_anim=False, ignore_leaf_bones=True)
    elif ext in ('.glb', '.gltf', '.vrm'):
        if ext == '.vrm':
            bpy.ops.import_scene.vrm(filepath=path)
        else:
            bpy.ops.import_scene.gltf(filepath=path)
    elif ext == '.obj':
        raise SystemExit('OBJ 没有骨架，先在别处绑好骨再转')
    elif ext == '.pmx' or ext == '.pmd':
        if not hasattr(bpy.ops, 'mmd_tools') or not hasattr(bpy.ops.mmd_tools, 'import_model'):
            raise SystemExit('PMX 要先装 mmd_tools 扩展；或者找同一个模型的 FBX')
        bpy.ops.mmd_tools.import_model(filepath=path, scale=0.08)
    else:
        raise SystemExit(f'不认识的格式：{ext}（能直接转的：fbx、glb/gltf、vrm、pmx+mmd_tools、blend）')
    quiet_vrm_addon()
    drop_missing_images()


def drop_missing_images():
    """删掉找不到文件的贴图引用。提取工具导出的 FBX 常带着作者电脑上的绝对路径（别人电脑上 C 盘里的 .dds），
    VRM 插件导出前检查到「文件不存在」直接取消导出（实测）。贴图我们自己按文件名重新挂。"""
    for i in list(bpy.data.images):
        if i.packed_file or i.source != 'FILE' or not i.filepath:
            continue
        if not os.path.exists(bpy.path.abspath(i.filepath)):
            print(f'[kit] 贴图找不到，去掉引用：{i.name} ({i.filepath})')
            bpy.data.images.remove(i)


def quiet_vrm_addon():
    """关掉 VRM 插件对新骨架的「自动找人形骨、自动配表情」。它在第一次碰到骨架时做一次结构搜索：
    几十根骨头一眨眼，几百根（游戏提取的，带肌肉、修正骨）要跑十几分钟还会对错（实测 770 根的 RE Engine 骨架）。
    骨头我们自己对，所以导入后马上关掉。"""
    for a in bpy.data.armatures:
        ext = getattr(a, 'vrm_addon_extension', None)
        if not ext:
            continue
        ext.vrm1.humanoid.human_bones.initial_automatic_bone_assignment = False
        ext.vrm1.expressions.initial_automatic_expression_assignment = False
        ext.vrm0.humanoid.initial_automatic_bone_assignment = False


def the_armature():
    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not arms:
        raise SystemExit('场景里没有骨架：这个模型没绑骨，或者骨架没跟着导出（见检查清单「骨架」）')
    # 有好几个（比如头发单独一个骨架）时取骨头最多的
    return max(arms, key=lambda a: len(a.data.bones))


def skinned_meshes(arm):
    return [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)]


def apply_transforms(arm):
    """把骨架和网格的旋转、缩放应用掉（VRM 要求骨架和网格都是单位变换），名字两头的空格去掉。"""
    objs = [arm] + skinned_meshes(arm)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        o.name = o.name.strip()
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    h = height(arm)
    print(f'[kit] 高度 {h:.3f} m')
    if not 0.3 < h < 3:
        print('[kit] 警告：高度不像真人比例，缩放可能不对（FBX 的单位、PMX 的 0.08）')


def height(arm):
    zs = []
    for o in skinned_meshes(arm):
        zs += [(o.matrix_world @ Vector(c)).z for c in o.bound_box]
    return max(zs) - min(zs) if zs else 0


def drop_meshes(names):
    """删掉不要的网格（控制器形状、碰撞用的代理、别的服装变体）。"""
    for n in names:
        o = bpy.data.objects.get(n)
        if o:
            bpy.data.objects.remove(o)


# ---------------------------------------------------------------------------------------------
# 骨骼对应
# ---------------------------------------------------------------------------------------------

# 每个 VRM 骨头的候选名（去掉大小写、空格、下划线、点、冒号以后比）。
# {s} 的地方会换成左右的各种写法：left/l/左（前缀或后缀都试）。
# 覆盖：Mixamo、Unity Humanoid / VRoid（J_Bip_）、UE（pelvis/upperarm_l）、Auto-Rig Pro（.x/.l 和 _stretch）、
# Rigify（DEF-）、3ds Max Biped（Bip001）、Daz Genesis 8/9、MMD（日文）、RE Engine（l_arm_humerus、l_leg_femur、jointEyeLeft）、
# 别的游戏提取常见的 L_UpperArm、Source（ValveBiped）。手指各家从 0 还是 1 数不一样，RE Engine 这类要用 overrides。
BONE_ALIASES = {
    'hips': ['hips', 'hip', 'pelvis', 'root.x', 'jbipchips', 'defspine', 'cog', 'センター', '下半身', 'bip01pelvis', 'bip001pelvis'],
    'spine': ['spine', 'spine01', 'spine0', 'spine01.x', 'abdomenlower', 'abdomen', '上半身', 'jbipcspine', 'bip01spine', 'bip001spine', 'defspine001', 'spine1'],
    'chest': ['chest', 'spine02', 'spine02.x', 'chestlower', 'abdomenupper', '上半身2', 'jbipcchest', 'bip01spine1', 'bip001spine1', 'defspine002', 'spine1', 'spine2'],
    'upperChest': ['upperchest', 'spine03', 'spine3', 'spine03.x', 'chestupper', 'jbipcupperchest', 'bip01spine2', 'bip001spine2', 'defspine003', 'spine2'],
    'neck': ['neck', 'neck01', 'neck0', 'neck.x', 'necklower', '首', 'jbipcneck', 'bip01neck', 'bip001neck', 'defspine004'],
    'head': ['head', 'head.x', '頭', 'jbipchead', 'bip01head', 'bip001head', 'defspine006'],
    'jaw': ['jaw', 'cjawbone.x', 'lowerjaw', 'defjaw'],
    '{s}Eye': ['{s}eye', 'jointeye{s}', 'ceye{s}', 'eye{s}', '{s}目', 'jadjust{s}faceeye', 'defeye{s}'],
    '{s}Shoulder': ['{s}shoulder', '{s}armclavicle', 'shoulder{s}', 'clavicle{s}', '{s}collar', '{s}clavicle', '{s}肩', 'jbip{s}shoulder', 'bip01{s}clavicle', 'bip001{s}clavicle', 'defshoulder{s}'],
    '{s}UpperArm': ['{s}armhumerus', '{s}arm', '{s}upperarm', 'upperarm{s}', 'armstretch{s}', '{s}shldrbend', '{s}shldr', '{s}腕', 'jbip{s}upperarm', 'bip01{s}upperarm', 'bip001{s}upperarm', 'defupperarm{s}'],
    '{s}LowerArm': ['{s}armradius', '{s}forearm', '{s}lowerarm', 'lowerarm{s}', 'forearm{s}', 'forearmstretch{s}', '{s}forearmbend', '{s}elbow', '{s}ひじ', 'jbip{s}lowerarm', 'bip01{s}forearm', 'bip001{s}forearm', 'defforearm{s}'],
    '{s}Hand': ['{s}armwrist', '{s}hand', 'hand{s}', '{s}wrist', '{s}手首', 'jbip{s}hand', 'bip01{s}hand', 'bip001{s}hand', 'defhand{s}'],
    '{s}UpperLeg': ['{s}legfemur', '{s}upleg', '{s}upperleg', '{s}thigh', 'thigh{s}', 'thighstretch{s}', '{s}thighbend', '{s}足', 'jbip{s}upperleg', 'bip01{s}thigh', 'bip001{s}thigh', 'defthigh{s}'],
    '{s}LowerLeg': ['{s}legtibia', '{s}lowerleg', '{s}knee', 'calf{s}', '{s}calf', 'legstretch{s}', '{s}shin', '{s}ひざ', 'jbip{s}lowerleg', 'bip01{s}calf', 'bip001{s}calf', 'defshin{s}', '{s}leg'],  # Mixamo 的 LeftLeg 是小腿
    '{s}Foot': ['{s}legankle', '{s}foot', 'foot{s}', '{s}ankle', '{s}足首', 'jbip{s}foot', 'bip01{s}foot', 'bip001{s}foot', 'deffoot{s}'],
    '{s}Toes': ['{s}legball', '{s}toebase', '{s}toes', '{s}toe', 'toes01{s}', 'ball{s}', '{s}ball', 'toe{s}', '{s}つま先', '{s}足先ex', 'jbip{s}toebase', 'bip01{s}toe0', 'bip001{s}toe0', 'deftoe{s}'],
}
# 手指：VRM 名、Mixamo 风格名、Unity/UE 风格名、ARP 名、Daz 名、MMD 名
FINGERS = {
    'Thumb': (['thumb', 'thumb0'], '親指', ('metacarpal', 'proximal', 'distal')),
    'Index': (['index', 'indexfinger', 'pointer'], '人指', ('proximal', 'intermediate', 'distal')),
    'Middle': (['middle', 'middlefinger', 'mid'], '中指', ('proximal', 'intermediate', 'distal')),
    'Ring': (['ring', 'ringfinger'], '薬指', ('proximal', 'intermediate', 'distal')),
    'Little': (['pinky', 'little', 'littlefinger', 'pinkie'], '小指', ('proximal', 'intermediate', 'distal')),
}
for vrm, (bases, mmd, segs) in FINGERS.items():
    for i, seg in enumerate(segs):
        names = []
        for b in bases:
            for n in (i + 1, f'0{i + 1}'):  # thumb1 / thumb_01（Biped 的 Finger0..4 不在这里：在 build 脚本里用 overrides）
                names += [f'{{s}}hand{b}{n}', f'{{s}}{b}{n}', f'{b}{n}{{s}}', f'c{b}{n}{{s}}', f'{b}{n}{{s}}', f'jbip{{s}}{b}{n}']
        mmd_n = (0, 1, 2)[i] if vrm == 'Thumb' else i + 1
        names += [f'{{s}}{mmd}{mmd_n}']
        BONE_ALIASES[f'{{s}}{vrm}{seg.capitalize()}'] = names

SIDES = {'left': ['left', 'l', '左'], 'right': ['right', 'r', '右']}
STRIP_PREFIXES = ('mixamorig', 'def', 'valvebiped', 'bip01', 'bip001', 'jbip', 'armature', 'root')


def _norm(n):
    n = n.lower().translate(str.maketrans('０１２３４５６７８９', '0123456789'))  # MMD 的全角数字
    n = re.sub(r'^[^:|]*[:|]', '', n)  # mixamorig: / Armature| 之类的命名空间
    return re.sub(r'[\s_\-.:]', '', n)


def _vrm_attr(name):
    """leftUpperArm -> left_upper_arm（VRM 插件属性名）。"""
    return re.sub(r'(?<!^)([A-Z])', r'_\1', name).lower()


def guess_humanoid(arm, overrides=None):
    """按名字猜每个 VRM 骨头对应哪根。overrides={'leftUpperArm': '骨头名', ...} 优先。返回 {vrm名: 骨头名}。
    先用完整名字比，比不上再用去掉常见前缀（bip001、mixamorig、def、j_bip）的名字比；一根骨头只给一个位置（先到先得，
    所以名字表里每个位置的候选按「越具体越前」排）。"""
    full = {_norm(b.name): b.name for b in arm.data.bones}
    stripped = {}
    for k, v in full.items():
        for p in STRIP_PREFIXES:
            if k.startswith(p) and len(k) > len(p) + 2:
                stripped.setdefault(k[len(p):], v)
    out = dict(overrides or {})
    used = set(out.values())
    for vrm, cands in BONE_ALIASES.items():
        sides = [('left', SIDES['left']), ('right', SIDES['right'])] if '{s}' in vrm else [('', [''])]
        for side, toks in sides:
            name = vrm.replace('{s}', side)
            name = name[0].lower() + name[1:]
            if name in out:
                continue
            hit = None
            for table in (full, stripped):
                for c in cands:
                    for t in toks:
                        b = table.get(_norm(c.replace('{s}', t)))
                        if b and b not in used:
                            hit = b
                            break
                    if hit:
                        break
                if hit:
                    break
            if hit:
                out[name] = hit
                used.add(hit)
    return out


REQUIRED = ['hips', 'spine', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot']


def fix_hips(arm, mapping):
    """VRM 要 spine 在 hips 下面。有的骨架胯和脊椎是兄弟（RE Engine：COG 下面挂 hips 和 spine_0），
    这时把 hips 换成它们共同的父骨头（腿还在它下面）。"""
    bones = arm.data.bones
    h, sp = mapping.get('hips'), mapping.get('spine')
    if not h or not sp:
        return mapping
    anc = lambda b: [p.name for p in bones[b].parent_recursive]
    if h in anc(sp):
        return mapping
    par = bones[h].parent
    if par and par.name in anc(sp):
        print(f'[kit] hips {h} 不是 spine {sp} 的祖先，换成它们的父骨头 {par.name}')
        mapping = dict(mapping, hips=par.name)
    return mapping


def assign_humanoid(arm, mapping):
    mapping = fix_hips(arm, mapping)
    ext = arm.data.vrm_addon_extension
    ext.spec_version = '1.0'
    hb = ext.vrm1.humanoid.human_bones
    for vrm, bone in mapping.items():
        getattr(hb, _vrm_attr(vrm)).node.bone_name = bone
    missing = [b for b in REQUIRED if b not in mapping]
    if missing and len(arm.data.bones) < 300:
        # 插件自己的自动对应（结构搜索，几百根骨头的骨架会跑很久，就不用了）再试一次（它认 VRoid、Mixamo 等），只填还空着的
        bpy.ops.vrm.assign_vrm1_humanoid_human_bones_automatically(armature_object_name=arm.name)
        for vrm, bone in mapping.items():
            getattr(hb, _vrm_attr(vrm)).node.bone_name = bone
        missing = [b for b in REQUIRED if not getattr(hb, _vrm_attr(b)).node.bone_name]
    print('[kit] 骨骼对应：', ', '.join(f'{k}={v}' for k, v in mapping.items()))
    if missing:
        raise SystemExit(f'必需的骨头没对上：{missing}。在 build 脚本里用 overrides 指定')


# ---------------------------------------------------------------------------------------------
# 表情：已有形态键直接绑；只有脸部骨头的，摆骨头烘成形态键
# ---------------------------------------------------------------------------------------------

def _rest_matrix(arm, bone):
    return (arm.matrix_world.to_3x3() @ arm.data.bones[bone].matrix_local.to_3x3()).normalized()


def expand_bones(arm, spec):
    """spec 的键可以是骨头名，也可以是 're:正则'（一次写一组，比如游戏模型平铺的脸部骨头 're:^eyelid_0\d_L$'）。"""
    out = {}
    for key, s in spec.items():
        if key.startswith('re:'):
            rx = re.compile(key[3:])
            hits = [b.name for b in arm.data.bones if rx.search(b.name)]
            if not hits:
                print(f'[kit] 警告：{key} 一根骨头都没匹配上')
            for b in hits:
                out.setdefault(b, s)
        else:
            out[key] = s
    return out


def _pose(arm, spec):
    """spec = {骨头名或 're:正则': {'rx'/'ry'/'rz': 绕世界轴转几度, 'loc': (dx,dy,dz) 世界坐标的米, 'pivot': (x,y,z)}}。
    世界方向里写，换成骨头自己的。给了 pivot 时，骨头绕这个世界坐标的点转（骨头头部跟着走一段弧）：
    没有下巴骨、嘴周围是一圈平铺小骨头的脸，张嘴就是把下半圈绕下巴的铰链点一起转。"""
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    mw = arm.matrix_world
    for bone, s in expand_bones(arm, spec).items():
        pb = arm.pose.bones[bone]
        M = _rest_matrix(arm, bone)
        q = Quaternion()
        for ax, v in (('rx', (1, 0, 0)), ('ry', (0, 1, 0)), ('rz', (0, 0, 1))):
            if ax in s:
                q = Quaternion(v, math.radians(s[ax])) @ q
        pb.rotation_quaternion = (M.inverted() @ q.to_matrix() @ M).to_quaternion()
        d = Vector(s.get('loc', (0, 0, 0)))
        if 'pivot' in s:
            h = mw @ arm.data.bones[bone].head_local
            pv = Vector(s['pivot'])
            d = d + (pv + q @ (h - pv)) - h
        if d.length:
            pb.location = M.inverted() @ d


def mirror(spec_left, l='.l', r='.r'):
    """只写左边（骨头名带 l 后缀），右边按 X 镜像：位置 x 取反，绕 Y、Z 的转角取反。"""
    out = dict(spec_left)
    for bone, s in spec_left.items():
        rx = bone.startswith('re:') and bone.endswith(re.escape(l) + '$')
        if not (bone.endswith(l) or rx):
            continue
        m = {}
        for k, v in s.items():
            if k == 'loc':
                m[k] = (-v[0], v[1], v[2])
            elif k in ('ry', 'rz'):
                m[k] = -v
            else:
                m[k] = v
        if 'pivot' in s:
            m['pivot'] = (-s['pivot'][0], s['pivot'][1], s['pivot'][2])
        out[bone[: -len(re.escape(l)) - 1] + re.escape(r) + '$' if rx else bone[: -len(l)] + r] = m
    return out


def _coords(o, dg):
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    co = [0.0] * (len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    ev.to_mesh_clear()
    return co


def bake_bone_expressions(arm, meshes, recipes, eps=1e-5):
    """recipes = {形态键名: 姿势 spec}。每个姿势摆出来，和静止时比，差的部分写成形态键（只写在动了的网格上）。
    返回 {形态键名: [网格名, ...]}。网格只能有骨架修改器（别的修改器会改顶点数）。"""
    dg = bpy.context.evaluated_depsgraph_get()
    _pose(arm, {})
    dg.update()
    rest = {o.name: _coords(o, dg) for o in meshes}
    made = {}
    for name, spec in recipes.items():
        _pose(arm, spec)
        dg.update()
        for o in meshes:
            posed = _coords(o, dg)
            r = rest[o.name]
            if max(abs(a - b) for a, b in zip(posed, r)) < eps:
                continue
            if not o.data.shape_keys:
                o.shape_key_add(name='Basis', from_mix=False)
            basis = [0.0] * len(r)
            o.data.shape_keys.key_blocks[0].data.foreach_get('co', basis)
            k = o.data.shape_keys.key_blocks.get(name) or o.shape_key_add(name=name, from_mix=False)
            k.data.foreach_set('co', [b + p - q for b, p, q in zip(basis, posed, r)])
            made.setdefault(name, []).append(o.name)
    _pose(arm, {})
    for n, objs in made.items():
        print(f'[kit] 烘出形态键 {n}: {objs}')
    return made


def bind_expressions(arm, binds, overrides=None):
    """binds = {VRM 表情名: {形态键名: 权重 0–1}}，形态键在哪些网格上自动找。
    预设名（happy angry sad relaxed surprised aa ih ou ee oh blink blinkLeft blinkRight lookUp ...）进 preset，别的进 custom。
    overrides = {表情名: {'blink': 'block'|'blend'|'none', 'mouth': ..., 'look_at': ...}}。"""
    ex = arm.data.vrm_addon_extension.vrm1.expressions
    preset_names = {'happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight',
                    'lookUp', 'lookDown', 'lookLeft', 'lookRight', 'neutral'}
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.data.shape_keys]
    for name, recipe in binds.items():
        if name in preset_names:
            e = getattr(ex.preset, _vrm_attr(name))
        else:
            e = ex.custom.add()
            e.custom_name = name
        for key, w in recipe.items():
            found = [o for o in meshes if key in o.data.shape_keys.key_blocks]
            if not found:
                print(f'[kit] 警告：表情 {name} 要的形态键 {key} 哪个网格上都没有')
            for o in found:
                b = e.morph_target_binds.add()
                b.node.mesh_object_name = o.name
                b.index = key
                b.weight = w
        for k, v in (overrides or {}).get(name, {}).items():
            setattr(e, f'override_{k}', v)


def prune_shape_keys(keep):
    """只留用得上的形态键（游戏、Daz 模型常有几百个，VRM 体积大半是它们）。"""
    for o in bpy.data.objects:
        if o.type != 'MESH' or not o.data.shape_keys:
            continue
        kbs = o.data.shape_keys.key_blocks
        for k in list(kbs)[1:]:
            if k.name not in keep:
                o.shape_key_remove(k)
        if len(o.data.shape_keys.key_blocks) == 1:
            o.shape_key_clear()


# ---------------------------------------------------------------------------------------------
# 没有物理骨的头发、衣服：加骨链、按位置重新分权重
# ---------------------------------------------------------------------------------------------

def _verts_world(o):
    mw = o.matrix_world
    return [mw @ v.co for v in o.data.vertices]


def select_verts(o, pred):
    """pred(世界坐标 Vector) -> bool。返回顶点序号列表。"""
    return [i for i, p in enumerate(_verts_world(o)) if pred(p)]


def chain_points(o, idx, n_bones, top=None, split=None):
    """从一组顶点估出骨链的点：从上到下按高度等分 n_bones 段，每段取顶点的中心。
    top：起点（世界坐标，一般在挂着它的那根骨头附近），不给就用最高那一层的中心。
    split=(axis, k)：沿 'x' 或 'y' 把这组顶点按分位数切成 k 份，各出一条链。返回 [[点,...], ...]。"""
    P = _verts_world(o)
    groups = [idx]
    if split:
        axis, k = split
        a = 'xyz'.index(axis)
        s = sorted(idx, key=lambda i: P[i][a])
        groups = [s[len(s) * j // k: len(s) * (j + 1) // k] for j in range(k)]
    chains = []
    for g in groups:
        zs = [P[i].z for i in g]
        z0, z1 = (top.z if top else max(zs)), min(zs)
        pts = []
        for j in range(n_bones + 1):
            z = z0 + (z1 - z0) * j / n_bones
            band = [P[i] for i in g if abs(P[i].z - z) <= (z0 - z1) / n_bones / 2 + 1e-4] or [min((P[i] for i in g), key=lambda p: abs(p.z - z))]
            c = sum(band, Vector()) / len(band)
            pts.append(Vector((c.x, c.y, z)))
        if top:
            pts[0] = Vector((pts[0].x if split else top.x, pts[0].y, top.z)) if split else top.copy()
        chains.append(pts)
    return chains


def add_bone_chain(arm, name, pts, parent):
    """沿 pts 加一串相连的骨头，挂在 parent 下。返回骨头名列表（最后一根的尾巴就是最后一个点）。"""
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    inv = arm.matrix_world.inverted()
    prev, names = eb[parent], []
    for i in range(len(pts) - 1):
        b = eb.new(f'{name}_{i}')
        b.head, b.tail = inv @ pts[i], inv @ pts[i + 1]
        b.parent = prev
        b.use_connect = i > 0
        b.use_deform = True
        prev = b
        names.append(b.name)
    bpy.ops.object.mode_set(mode='OBJECT')
    return names


def _closest_on_chain(p, pts):
    best = None
    acc = 0.0
    for j in range(len(pts) - 1):
        a, b = pts[j], pts[j + 1]
        ab = b - a
        L = ab.length
        t = max(0.0, min(1.0, (p - a).dot(ab) / (L * L))) if L > 0 else 0.0
        d = (a + ab * t - p).length
        if best is None or d < best[0]:
            best = (d, j, t, acc + t * L)
        acc += L
    return best


def skin_to_chains(o, idx, chains, bone_names, start=0.02, ramp=0.08, sigma=0.03, max_influences=4):
    """把 idx 这些顶点的权重往骨链上挪。
    - 顶点找最近的链（几条链之间按距离软分配，sigma 米），在链上的位置决定分给哪一节（相邻两节线性过渡）；
    - 离链根 start 米以内保持原来的权重，往下 ramp 米内逐渐换成链的权重（接头处不撕开）；
    - 每个顶点最多留 max_influences 个骨头（glTF 一组 4 个）。"""
    P = _verts_world(o)
    vg = o.vertex_groups
    for names in bone_names:
        for n in names:
            if n not in vg:
                vg.new(name=n)
    gname = {g.index: g.name for g in vg}
    for i in idx:
        p = P[i]
        hits = [_closest_on_chain(p, pts) for pts in chains]
        dmin = min(h[0] for h in hits)
        ws = [math.exp(-(h[0] - dmin) / sigma) for h in hits]
        tot = sum(ws)
        new = {}
        f_sum = 0.0
        for (d, j, t, s), w, names in zip(hits, ws, bone_names):
            w /= tot
            f = max(0.0, min(1.0, (s - start) / ramp)) if ramp > 0 else 1.0
            f_sum += w * f
            if t < 0.5 and j > 0:
                parts = {names[j]: 0.5 + t, names[j - 1]: 0.5 - t}
            elif t >= 0.5 and j + 1 < len(names):
                parts = {names[j]: 1.5 - t, names[j + 1]: t - 0.5}
            else:
                parts = {names[j]: 1.0}
            for n, pw in parts.items():
                new[n] = new.get(n, 0) + w * f * pw
        v = o.data.vertices[i]
        old = {gname[g.group]: g.weight for g in v.groups if g.weight > 0}
        tot_old = sum(old.values()) or 1
        mix = {n: (1 - f_sum) * w / tot_old for n, w in old.items()}
        for n, w in new.items():
            mix[n] = mix.get(n, 0) + w
        top = sorted(mix.items(), key=lambda x: -x[1])[:max_influences]
        s = sum(w for _, w in top) or 1
        for g in list(v.groups):
            vg[g.group].remove([i])
        for n, w in top:
            if w > 1e-4:
                vg[n].add([i], w / s, 'REPLACE')


def rig_cloth(arm, o, idx, parent, name, n_bones=4, top=None, split=None, **skin):
    """一步做完：估骨链、加骨头、分权重。返回骨链（每条一个骨头名列表）。"""
    chains = chain_points(o, idx, n_bones, top=top, split=split)
    names = [add_bone_chain(arm, f'{name}{k}' if len(chains) > 1 else name, pts, parent) for k, pts in enumerate(chains)]
    skin_to_chains(o, idx, chains, names, **skin)
    print(f'[kit] {o.name}: {len(idx)} 个顶点挂到 {len(names)} 条链 {[n[0] for n in names]}')
    return names


# ---------------------------------------------------------------------------------------------
# 弹簧骨骼和碰撞体（VRM 1.0）
# ---------------------------------------------------------------------------------------------

def bone_local(arm, bone, v):
    """Blender 世界方向（静止姿势下）换成这根骨头自己的坐标（Y 沿骨头）。
    VRM 插件导出的骨头节点带着骨头的朝向，碰撞体的 offset、tail 是在节点自己的坐标里算的（实测：大腿的 Y 朝下，
    写 (0,-0.4,0) 会朝上）；按骨头算也就不用管 A-pose 导出时被掰成 T-pose。"""
    m = (arm.matrix_world.to_3x3() @ arm.data.bones[bone].matrix_local.to_3x3()).normalized()
    return tuple(m.inverted() @ Vector(v))


class Springs:
    """碰撞体加进去马上记下 uuid（插件的集合会重排、引用会失效：只存 sb.colliders[-1] 的话最后组里只剩一个）。"""

    def __init__(self, arm):
        self.arm = arm
        self.sb = arm.data.vrm_addon_extension.spring_bone1

    def sphere(self, bone, radius, offset=(0, 0, 0)):
        """offset：Blender 世界方向、相对骨头头部（米）。"""
        bpy.ops.vrm.add_spring_bone1_collider(armature_object_name=self.arm.name)
        c = self.sb.colliders[-1]
        c.node.bone_name = bone
        c.shape_type = 'Sphere'
        c.shape.sphere.radius = radius
        c.shape.sphere.offset = bone_local(self.arm, bone, offset)
        return c.uuid

    def capsule(self, bone, radius, tail, offset=(0, 0, 0)):
        """offset、tail 都是 Blender 世界方向（-Y 朝前、Z 朝上）、静止姿势下、相对骨头头部的米数。"""
        bpy.ops.vrm.add_spring_bone1_collider(armature_object_name=self.arm.name)
        c = self.sb.colliders[-1]
        c.node.bone_name = bone
        c.shape_type = 'Capsule'
        c.shape.capsule.radius = radius
        c.shape.capsule.offset = bone_local(self.arm, bone, offset)
        c.shape.capsule.tail = bone_local(self.arm, bone, tail)
        return c.uuid

    def group(self, name, uuids):
        bpy.ops.vrm.add_spring_bone1_collider_group(armature_object_name=self.arm.name)
        g = self.sb.collider_groups[-1]
        g.vrm_name = name
        for u in uuids:
            r = g.colliders.add()
            r.collider_uuid = u
        return g.uuid

    def spring(self, name, bones, stiffness=1.0, gravity=0.2, drag=0.5, radius=0.02, groups=(), center=None):
        """bones：一条链从根到梢。参数可以是单个数，也可以是每节一个的列表（根硬梢软）。"""
        bpy.ops.vrm.add_spring_bone1_spring(armature_object_name=self.arm.name)
        s = self.sb.springs[-1]
        s.vrm_name = name
        per = lambda v, i: v[min(i, len(v) - 1)] if isinstance(v, (list, tuple)) else v
        for i, b in enumerate(bones):
            j = s.joints.add()
            j.node.bone_name = b
            j.stiffness = per(stiffness, i)
            j.gravity_power = per(gravity, i)
            j.gravity_dir = (0, 0, -1)
            j.drag_force = per(drag, i)
            j.hit_radius = per(radius, i)
        for g in groups:
            r = s.collider_groups.add()
            r.collider_group_uuid = g
        if center:
            s.center.bone_name = center
        return s

    def report(self):
        sb = self.sb
        n_ref = {g.vrm_name: len(g.colliders) for g in sb.collider_groups}
        print(f'[kit] 碰撞体 {len(sb.colliders)} 个，组 {n_ref}，弹簧 {len(sb.springs)} 条')
        for g in sb.collider_groups:
            if not g.colliders:
                print(f'[kit] 警告：碰撞组 {g.vrm_name} 是空的')


# ---------------------------------------------------------------------------------------------
# 材质、贴图
# ---------------------------------------------------------------------------------------------

def load_image(path, data=False):
    i = bpy.data.images.load(path, check_existing=True)
    if data:
        i.colorspace_settings.name = 'Non-Color'
    i.pack()
    return i


def combine_alpha(rgb_path, alpha_path=None, channel='R', name=None, invert=False):
    """游戏提取的贴图常把透明度放在别的图里（RE Engine：ALBM 的 A 是金属度，透明度在 ATOS 的 R）。
    取 rgb_path 的 RGB，透明度取 alpha_path 的某个通道（不给就全不透明），拼成一张新图并打包进 .blend。"""
    import numpy as np
    base = bpy.data.images.load(rgb_path)
    w, h = base.size
    px = np.empty(w * h * 4, dtype=np.float32)
    base.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    if alpha_path:
        a_img = bpy.data.images.load(alpha_path)
        if tuple(a_img.size) != (w, h):
            a_img.scale(w, h)
        ap = np.empty(w * h * 4, dtype=np.float32)
        a_img.pixels.foreach_get(ap)
        a = ap.reshape(-1, 4)[:, 'RGBA'.index(channel)]
        px[:, 3] = 1 - a if invert else a
        bpy.data.images.remove(a_img)
    else:
        px[:, 3] = 1
    out = bpy.data.images.new(name or os.path.splitext(os.path.basename(rgb_path))[0], w, h, alpha=True)
    out.pixels.foreach_set(px.ravel())
    out.pack()
    bpy.data.images.remove(base)
    return out


def first_image(mat):
    if not mat.node_tree:
        return None
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] > 0:
            return n.image
    return None


def mtoon(mat, image=None, alpha='OPAQUE', cutoff=0.5, shade=0.8, toony=0.6, shift=-0.1, double_sided=False, normal=None,
          emissive=None, emissive_factor=(1, 1, 1), color=(1, 1, 1, 1), z_write=False, render_offset=0):
    """把一个材质换成 MToon。alpha：OPAQUE / MASK（发片、蕾丝、镂空，cutoff 决定剪掉多少）/ BLEND（半透明：眼影、玻璃）。
    写实贴图（游戏提取）toony 放低一点、shade 接近 1，不然会像卡通。"""
    image = image or first_image(mat)
    mt = mat.vrm_addon_extension.mtoon1
    mt.enabled = True
    mt.alpha_mode = alpha
    mt.alpha_cutoff = cutoff
    mt.double_sided = double_sided
    mt.pbr_metallic_roughness.base_color_factor = color
    if image:
        mt.pbr_metallic_roughness.base_color_texture.index.source = image
    if normal:
        mt.normal_texture.index.source = normal
    if emissive:
        mt.emissive_texture.index.source = emissive
        mt.emissive_factor = emissive_factor
    x = mt.extensions.vrmc_materials_mtoon
    x.shade_color_factor = (shade, shade, shade)
    if image:
        x.shade_multiply_texture.index.source = image
    x.shading_toony_factor = toony
    x.shading_shift_factor = shift
    x.transparent_with_z_write = z_write
    x.render_queue_offset_number = render_offset
    return mt


def alpha_two_pass(o, suffix='_edge'):
    """发片、毛边这种「大半透明」的网格：复制一份，原来那份用 MASK（剪掉淡的、实心部分写深度），
    复制的那份用 BLEND、不写深度（只补半透明的边）。单用 MASK 像毛刺、发灰；单用 BLEND+写深度，
    后面的发片被前面的方块挡掉（实测）；单用 BLEND 不写深度，前后乱套。
    要在加完骨链、分完权重之后调（复制品带着同样的权重）。返回 (原网格, 复制品)，材质名是原名加 suffix。"""
    c = o.copy()
    c.data = o.data.copy()
    c.name = o.name + suffix
    for coll in o.users_collection:
        coll.objects.link(c)
    for slot in c.material_slots:
        if slot.material:
            m = bpy.data.materials.get(slot.material.name + suffix) or slot.material.copy()
            m.name = slot.material.name + suffix
            slot.material = m
    return o, c


def downscale_images(max_size=2048):
    """贴图缩到 max_size（4K、8K 的贴图桌宠用不上，VRM 会很大，显存也吃）。只缩真的用到的。"""
    for i in bpy.data.images:
        w, h = i.size[:]
        if max(w, h) > max_size:
            s = max_size / max(w, h)
            i.scale(int(w * s), int(h * s))
            i.pack()
            print(f'[kit] 贴图 {i.name} {w}x{h} -> {i.size[0]}x{i.size[1]}')


# ---------------------------------------------------------------------------------------------
# meta、导出、报告
# ---------------------------------------------------------------------------------------------

def set_meta(arm, name, authors, version='1.0', copyright='', url='', personal_only=True, thumbnail=None):
    """personal_only=True：只许作者本人用、不能商用、不能再分发、不能改（别人的模型、游戏提取的模型都这样填）。"""
    m = arm.data.vrm_addon_extension.vrm1.meta
    m.vrm_name = name
    while len(m.authors) < len(authors):
        m.authors.add()
    for a, v in zip(m.authors, authors):
        a.value = v
    m.version = version
    m.copyright_information = copyright
    m.other_license_url = url
    if personal_only:
        m.avatar_permission = 'onlyAuthor'
        m.commercial_usage = 'personalNonProfit'
        m.allow_redistribution = False
        m.modification = 'prohibited'
        m.credit_notation = 'required'
    if thumbnail:
        m.thumbnail_image = thumbnail


def look_at_bones(arm):
    arm.data.vrm_addon_extension.vrm1.look_at.type = 'bone'


def export(arm, out):
    """导出前插件会把人摆成 T-pose（humanoid.pose = 自动），A-pose 的模型不用自己掰。"""
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    r = bpy.ops.export_scene.vrm(filepath=out, armature_object_name=arm.name, ignore_warning=True)
    size = os.path.getsize(out) / 1e6 if os.path.exists(out) else 0
    print(f'[kit] 导出 {r} -> {out}（{size:.1f} MB）')
    if 'FINISHED' not in r:
        raise SystemExit('导出失败')


def report(arm):
    """导出前打一张表：网格、三角形、形态键、骨头数、贴图大小。和检查清单对着看。"""
    tris = 0
    for o in skinned_meshes(arm):
        t = sum(len(p.vertices) - 2 for p in o.data.polygons)
        tris += t
        sk = len(o.data.shape_keys.key_blocks) - 1 if o.data.shape_keys else 0
        print(f'[kit]   {o.name}: {t} 三角形, 形态键 {sk}, 材质 {[s.material.name for s in o.material_slots if s.material]}')
    print(f'[kit] 共 {tris} 三角形，骨头 {len(arm.data.bones)}')
    for i in bpy.data.images:
        if i.users and i.size[0]:
            print(f'[kit]   贴图 {i.name} {i.size[0]}x{i.size[1]}')
