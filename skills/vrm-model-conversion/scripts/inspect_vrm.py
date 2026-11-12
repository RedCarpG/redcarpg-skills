"""读一个 .vrm（VRM 1.0 或 0.x）的 JSON 部分，打一份检查报告。不用 Blender，只要 Python 3。
    python -I inspect_vrm.py model.vrm [--json]
查：meta 和许可、人形骨骼齐不齐、表情绑了几个形态键、弹簧链和碰撞组（空组、没挂组的链）、
碰撞体在 T-pose 世界里的位置（看得出朝向写反：大腿的胶囊跑到肚子上）、三角形和贴图大小、文件大小。
"""
import json, math, os, struct, sys

sys.stdout.reconfigure(encoding='utf-8')
REQUIRED = ['hips', 'spine', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot']


def load(path):
    d = open(path, 'rb').read()
    if d[:4] != b'glTF':
        raise SystemExit('不是 glb/vrm 文件')
    n = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + n]), len(d)


def qmul(a, b):
    x1, y1, z1, w1 = a
    x2, y2, z2, w2 = b
    return (w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
            w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2)


def qrot(q, v):
    r = qmul(qmul(q, (v[0], v[1], v[2], 0)), (-q[0], -q[1], -q[2], q[3]))
    return r[:3]


def world(nodes):
    par = {c: p for p, n in enumerate(nodes) for c in n.get('children', [])}
    cache = {}

    def f(i):
        if i in cache:
            return cache[i]
        n = nodes[i]
        t, r = n.get('translation', [0, 0, 0]), tuple(n.get('rotation', [0, 0, 0, 1]))
        if i in par:
            pt, pr = f(par[i])
            wt = [a + b for a, b in zip(pt, qrot(pr, t))]
            wr = qmul(pr, r)
        else:
            wt, wr = list(t), r
        cache[i] = (wt, wr)
        return cache[i]
    return f


def fmt(v):
    return '(' + ', '.join(f'{x:+.3f}' for x in v) + ')'


def main():
    path = sys.argv[1]
    j, size = load(path)
    nodes = j['nodes']
    W = world(nodes)
    name = lambda i: nodes[i].get('name', i)
    ext = j.get('extensions', {})
    problems = []
    print(f'文件 {os.path.basename(path)}  {size / 1e6:.1f} MB')

    if 'VRMC_vrm' in ext:
        v = ext['VRMC_vrm']
        m = v['meta']
        print(f"VRM 1.0  名字 {m.get('name')}  作者 {m.get('authors')}")
        print(f"  许可：avatarPermission={m.get('avatarPermission')} commercialUsage={m.get('commercialUsage')} "
              f"allowRedistribution={m.get('allowRedistribution')} modification={m.get('modification')}")
        hb = {k: x['node'] for k, x in v['humanoid']['humanBones'].items()}
        miss = [b for b in REQUIRED if b not in hb]
        if miss:
            problems.append(f'缺必需骨头 {miss}')
        print(f'  人形骨骼 {len(hb)} 根' + (f'，缺 {miss}' if miss else ''))
        hips_y = W(hb['hips'])[0][1] if 'hips' in hb else 0
        head_y = W(hb['head'])[0][1] if 'head' in hb else 0
        print(f'  胯高 {hips_y:.3f} m，头骨高 {head_y:.3f} m')
        la, lh = hb.get('leftUpperArm'), hb.get('leftHand')
        if la is not None and lh is not None:
            a, h = W(la)[0], W(lh)[0]
            ang = math.degrees(math.atan2(a[1] - h[1], abs(h[0] - a[0])))
            print(f'  左臂下垂 {ang:.0f}°（导出的静止姿势；VRM 要 T-pose，≈0°）')
            if abs(ang) > 10:
                problems.append('静止姿势不是 T-pose')
            if h[0] < a[0]:
                problems.append('左手在 -X：模型朝向反了（VRM 1.0 朝 +Z，左手在 +X）')
        ex = v.get('expressions', {})
        pre = {k: len(e.get('morphTargetBinds', [])) for k, e in ex.get('preset', {}).items()}
        cus = {k: len(e.get('morphTargetBinds', [])) for k, e in ex.get('custom', {}).items()}
        print(f'  表情（绑了几个形态键）预设 {pre}')
        print(f'                         自定义 {cus}')
        empty = [k for k, n in {**pre, **cus}.items() if n == 0 and not ex.get('preset', {}).get(k, ex.get('custom', {}).get(k, {})).get('materialColorBinds')]
        if empty:
            print(f'  没绑东西的表情：{empty}')
        print(f"  lookAt {v.get('lookAt', {}).get('type')}")
        sb = ext.get('VRMC_springBone', {})
        cols = sb.get('colliders', [])
        print(f'弹簧：{len(sb.get("springs", []))} 条，碰撞体 {len(cols)} 个，碰撞组 {len(sb.get("colliderGroups", []))} 个')
        for k, c in enumerate(cols):
            t, r = W(c['node'])
            sh = c['shape']
            if 'sphere' in sh:
                o = [a + b for a, b in zip(t, qrot(r, sh['sphere']['offset']))]
                print(f"  [{k}] 球 {name(c['node'])} r={sh['sphere']['radius']:.3f} 中心 {fmt(o)}")
            else:
                cs = sh['capsule']
                o = [a + b for a, b in zip(t, qrot(r, cs['offset']))]
                e = [a + b for a, b in zip(t, qrot(r, cs['tail']))]
                print(f"  [{k}] 胶囊 {name(c['node'])} r={cs['radius']:.3f} {fmt(o)} → {fmt(e)}")
        for g in sb.get('colliderGroups', []):
            print(f"  组 {g.get('name')}: {g['colliders']}")
            if not g['colliders']:
                problems.append(f"碰撞组 {g.get('name')} 是空的")
        for s in sb.get('springs', []):
            js = s['joints']
            print(f"  链 {s.get('name')}: {len(js)} 节 {name(js[0]['node'])}…  stiff {js[0].get('stiffness')}→{js[-1].get('stiffness')} "
                  f"grav {js[0].get('gravityPower')} 组 {s.get('colliderGroups', [])}")
    elif 'VRM' in ext:
        v = ext['VRM']
        print(f"VRM 0.x  名字 {v['meta'].get('title')}  许可 {v['meta'].get('licenseName')}")
        print(f"  人形骨骼 {len(v['humanoid']['humanBones'])} 根，表情 {[g.get('presetName') or g.get('name') for g in v['blendShapeMaster']['blendShapeGroups']]}")
        print(f"  弹簧 {len(v['secondaryAnimation']['boneGroups'])} 组，碰撞组 {len(v['secondaryAnimation']['colliderGroups'])}")
    else:
        problems.append('没有 VRM 扩展（普通 glb）')

    tris = 0
    acc = j.get('accessors', [])
    for m in j.get('meshes', []):
        for p in m['primitives']:
            if 'indices' in p:
                tris += acc[p['indices']]['count'] // 3
    print(f'三角形 {tris}，网格 {len(j.get("meshes", []))}，材质 {len(j.get("materials", []))}，贴图 {len(j.get("images", []))}')
    if tris > 150000:
        print('  提示：三角形很多（桌宠、网页里 >15 万会吃显卡），可以删掉看不见的部分或减面')
    print('问题：' + ('；'.join(problems) if problems else '没发现'))


main()
