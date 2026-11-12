# 一个模型一份的 build 脚本模板：复制到这个模型自己的文件夹（和 vrm_kit.py 放一起），改「改这里」的几段。
#   blender -b --disable-autoexec --python build_vrm.py -- <模型文件或文件夹> <out.vrm> [存一份.blend 方便查]
# 别人的 .blend：blender -b --disable-autoexec 那个.blend --python build_vrm.py -- ...，并去掉下面的 import 两行。
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vrm_kit as K

args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]
save_blend = args[2] if len(args) > 2 else None

# ---- 改这里：模型文件 ----
MODEL = src if os.path.isfile(src) else os.path.join(src, 'model.fbx')
TEX = src if os.path.isdir(src) else os.path.dirname(src)

K.clear_scene()
K.import_model(MODEL)
arm = K.the_armature()
K.apply_transforms(arm)
K.drop_meshes([])  # 不要的网格（控制器形状、别的服装）
meshes = {o.name: o for o in K.skinned_meshes(arm)}
print('[build] 网格', list(meshes))

# ---- 骨骼：先看 [kit] 骨骼对应 那一行，对错了在 overrides 里改 ----
K.assign_humanoid(arm, K.guess_humanoid(arm, overrides={}))
K.look_at_bones(arm)

# ---- 表情（三选一，见 SKILL.md §5）----
# a) 已有形态键：{VRM 表情: {形态键: 权重}}
FACES = {
    # 'blink': {'まばたき': 1}, 'aa': {'あ': 1}, 'happy': {'笑い': 1},
}
# b) 脸是骨头带的：先烘成形态键，再写进 FACES
# recipes = {'blink': K.mirror({'eyelid_top.l': {'rx': 45}})}
# K.bake_bone_expressions(arm, [meshes['face']], recipes); FACES['blink'] = {'blink': 1}
K.bind_expressions(arm, FACES, overrides={'happy': {'blink': 'block'}})
# K.prune_shape_keys({k for r in FACES.values() for k in r})  # 形态键几百个时只留用到的

# ---- 弹簧骨骼 ----
S = K.Springs(arm)
# 已有物理骨：按名字找链
# head = S.sphere('Head', .1, (0, 0, .08)); g = S.group('head', [head])
# S.spring('hair', ['Hair1', 'Hair2', 'Hair3'], stiffness=[1.2, .8, .6], gravity=.3, groups=[g])
# 没有物理骨：加链、重新分权重
# ix = K.select_verts(meshes['hair'], lambda p: p.z < 1.45 and p.y > 0)
# chains = K.rig_cloth(arm, meshes['hair'], ix, 'Head', 'hair_back', n_bones=4, split=('x', 2))
# for c in chains: S.spring(c[0], c, stiffness=[1.2, .8, .6, .5], gravity=.3, groups=[g])
S.report()

# ---- 材质 ----
for m in bpy.data.materials:
    if m.users:
        K.mtoon(m)  # 先全部用材质里原来的第一张贴图；透明的、头发的单独改
# 发片：K.alpha_two_pass(meshes['hair']); K.mtoon(hair_mat, alpha='MASK', cutoff=.5); K.mtoon(hair_edge_mat, alpha='BLEND')
K.downscale_images(2048)

# ---- meta：别人的模型、游戏提取的一律 personal_only ----
K.set_meta(arm, '名字', ['原作者'], version='1.0', url='', personal_only=True)
K.report(arm)
if save_blend:
    bpy.ops.wm.save_as_mainfile(filepath=save_blend, copy=True)
K.export(arm, out)
