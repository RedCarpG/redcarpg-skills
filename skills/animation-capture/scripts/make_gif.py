#!/usr/bin/env python3
"""把 record.mjs 录的几组帧（每个变体一个文件夹）左右并排拼成一张 GIF，也能出一张逐帧对照图。

用法：
  python make_gif.py <帧的根目录> --out compare.gif --fps 25 --title "挥手" [--variants 关,开] [--width 300]
  python make_gif.py <帧的根目录> --sheet sheet.png --pick 0,10,20,30   # 几帧排成一张图，给人或模型快速看
只要 Pillow。标签写在画面上方的白条里（不压在内容上）。所有帧共用一个调色板（取中间一帧），GIF 不会一帧一帧闪色。
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for path in ("C:/Windows/Fonts/msyh.ttc", "/System/Library/Fonts/PingFang.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", type=Path)
    ap.add_argument("--variants", help="按这个顺序排，逗号分隔；默认是根目录下的文件夹（按名字排）")
    ap.add_argument("--out", type=Path, help="GIF 输出路径")
    ap.add_argument("--sheet", type=Path, help="逐帧对照图输出路径（PNG）")
    ap.add_argument("--pick", default="", help="对照图取哪几帧，逗号分隔；默认均匀取 4 帧")
    ap.add_argument("--fps", type=float, default=25)
    ap.add_argument("--width", type=int, default=300, help="每一格多宽（像素）")
    ap.add_argument("--title", default="")
    a = ap.parse_args()

    names = a.variants.split(",") if a.variants else sorted(p.name for p in a.root.iterdir() if p.is_dir())
    groups = [sorted((a.root / n).glob("*.png")) for n in names]
    if not names or any(not g for g in groups):
        sys.exit(f"有变体没有帧：{[n for n, g in zip(names, groups) if not g]}")
    n = min(len(g) for g in groups)
    w, h = Image.open(groups[0][0]).size
    cw, ch = a.width, round(h * a.width / w)
    gap = 6
    head = 58 if a.title else 32
    big, small = font(20), font(16)

    def frame(i):
        canvas = Image.new("RGB", (cw * len(names) + gap * (len(names) - 1), ch + head), (255, 255, 255))
        d = ImageDraw.Draw(canvas)
        if a.title:
            d.text((10, 4), a.title, fill=(30, 30, 30), font=big)
        for col, (name, g) in enumerate(zip(names, groups)):
            x = col * (cw + gap)
            canvas.paste(Image.open(g[i]).convert("RGB").resize((cw, ch), Image.LANCZOS), (x, head))
            d.text((x + 10, head - 26), name, fill=(110, 110, 110), font=small)
        return canvas

    if a.sheet:
        pick = [int(x) for x in a.pick.split(",") if x] or [round(k * (n - 1) / 3) for k in range(4)]
        tiles = [frame(min(i, n - 1)) for i in pick]
        sheet = Image.new("RGB", (tiles[0].width, sum(t.height for t in tiles) + 24 * len(tiles)), (255, 255, 255))
        y = 0
        for i, t in zip(pick, tiles):
            ImageDraw.Draw(sheet).text((10, y + 2), f"第 {i} 帧（{i / a.fps:.2f} 秒）", fill=(200, 60, 60), font=small)
            sheet.paste(t, (0, y + 24))
            y += t.height + 24
        sheet.save(a.sheet)
        print(a.sheet, sheet.size)

    if a.out:
        frames = [frame(i) for i in range(n)]
        palette = frames[n // 2].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        q = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
        q[0].save(a.out, save_all=True, append_images=q[1:], duration=round(1000 / a.fps), loop=0, optimize=True)
        print(a.out, n, "帧", round(a.out.stat().st_size / 1024), "KB")


if __name__ == "__main__":
    main()
