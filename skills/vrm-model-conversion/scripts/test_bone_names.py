# 名字表的回归测试：造几种常见命名的假骨架，看必需骨能不能全对上、有没有一根骨头给了两个位置。
#   blender -b --factory-startup --python test_bone_names.py
import bpy, sys
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vrm_kit as K
F = ['Thumb','Index','Middle','Ring','Little']
def mk(names):
    a = bpy.data.armatures.new('t'); o = bpy.data.objects.new('t', a); bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; bpy.ops.object.mode_set(mode='EDIT')
    for n in names:
        b = a.edit_bones.new(n); b.head=(0,0,0); b.tail=(0,0,.1)
    bpy.ops.object.mode_set(mode='OBJECT'); return o
sets = {
 'mixamo': ['mixamorig:Hips','mixamorig:Spine','mixamorig:Spine1','mixamorig:Spine2','mixamorig:Neck','mixamorig:Head'] + [f'mixamorig:{s}{p}' for s in ('Left','Right') for p in ('Shoulder','Arm','ForeArm','Hand','UpLeg','Leg','Foot','ToeBase','HandThumb1','HandThumb2','HandThumb3','HandIndex1','HandIndex2','HandIndex3','HandPinky1')],
 'biped': ['Bip001 Pelvis','Bip001 Spine','Bip001 Spine1','Bip001 Spine2','Bip001 Neck','Bip001 Head'] + [f'Bip001 {s} {p}' for s in 'LR' for p in ('Clavicle','UpperArm','Forearm','Hand','Thigh','Calf','Foot','Toe0')],
 'ue': ['pelvis','spine_01','spine_02','spine_03','neck_01','head'] + [f'{p}_{s}' for s in 'lr' for p in ('clavicle','upperarm','lowerarm','hand','thigh','calf','foot','ball','thumb_01','thumb_02','index_01','pinky_03')],
 'vroid': ['J_Bip_C_Hips','J_Bip_C_Spine','J_Bip_C_Chest','J_Bip_C_UpperChest','J_Bip_C_Neck','J_Bip_C_Head'] + [f'J_Bip_{s}_{p}' for s in 'LR' for p in ('Shoulder','UpperArm','LowerArm','Hand','UpperLeg','LowerLeg','Foot','ToeBase','Thumb1','Index1','Little3')],
 'mmd': ['センター','上半身','上半身2','首','頭'] + [f'{s}{p}' for s in '左右' for p in ('肩','腕','ひじ','手首','足','ひざ','足首','つま先','親指０','親指１','人指１','小指３')],
 'daz': ['hip','pelvis','abdomenLower','abdomenUpper','chestLower','chestUpper','neckLower','neckUpper','head'] + [f'{s}{p}' for s in 'lr' for p in ('Collar','ShldrBend','ShldrTwist','ForearmBend','ForearmTwist','Hand','ThighBend','ThighTwist','Shin','Foot','Toe','Thumb1','Index1','Pinky3')],
 'rigify': ['DEF-spine','DEF-spine.001','DEF-spine.002','DEF-spine.003','DEF-spine.004','DEF-spine.006'] + [f'DEF-{p}.{s}' for s in 'LR' for p in ('shoulder','upper_arm','forearm','hand','thigh','shin','foot','toe')],
 're': ['root','COG','hips','spine_0','spine_1','spine_2','neck_0','neck_1','head'] + [f'{s}_{p}' for s in 'lr' for p in ('arm_clavicle','arm_humerus','arm_radius','arm_wrist','leg_femur','leg_tibia','leg_ankle','leg_ball','arm_humerus_twist_1_H','leg_femur_twist_1_H')] + ['jointEyeLeft','jointEyeRight'],
 'game': ['Hips','Spine','Spine1','Neck','Head'] + [f'{s}_{p}' for s in 'LR' for p in ('Shoulder','UpperArm','Forearm','Hand','Thigh','Knee','Foot','Toe')],
}
bad = 0
for name, bones in sets.items():
    o = mk(bones); m = K.guess_humanoid(o)
    miss = [b for b in K.REQUIRED if b not in m]
    extra = {k:v for k,v in m.items() if k not in K.REQUIRED}
    print(name, "MISSING", miss, "| chest", m.get("chest"), "upperChest", m.get("upperChest"), "neck", m.get("neck"), "thumbMeta", m.get("leftThumbMetacarpal"), "eye", m.get("leftEye")); print("DUP", len(m)-len(set(m.values())))
    print('   ', {k:m[k] for k in K.REQUIRED if k in m})
print("RESULT", "FAIL" if bad else "PASS")
