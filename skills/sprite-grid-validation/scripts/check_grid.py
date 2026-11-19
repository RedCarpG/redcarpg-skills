"""Measure a regular atlas. Usage: check_grid.py IMAGE SPEC.json"""
import argparse
import json
from pathlib import Path
from PIL import Image


def inspect(image, spec):
    def integer(key, minimum):
        value = spec[key]
        if type(value) is not int or value < minimum:
            raise ValueError(f"{key} must be an integer >= {minimum}")
        return value

    width, height, cols, rows = (integer(k, 1) for k in
                                ("frame_width", "frame_height", "columns", "rows"))
    margin, gap = integer("margin", 0), integer("spacing", 0)
    expected = (2 * margin + cols * width + (cols - 1) * gap,
                2 * margin + rows * height + (rows - 1) * gap)
    report = {"actual": image.size, "expected": expected, "size_ok": image.size == expected}
    if report["size_ok"]:
        alpha = image.convert("RGBA").getchannel("A")
        boxes = []
        for row in range(rows):
            for col in range(cols):
                x = margin + col * (width + gap)
                y = margin + row * (height + gap)
                boxes.append(alpha.crop((x, y, x + width, y + height)).getbbox())
        report["frame_bboxes"] = boxes
        report["empty_frames_zero_based"] = [i for i, box in enumerate(boxes) if box is None]
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image")
    parser.add_argument("spec", type=Path)
    args = parser.parse_args()
    try:
        with Image.open(args.image) as image:
            result = inspect(image, json.loads(args.spec.read_text(encoding="utf-8")))
    except (OSError, KeyError, ValueError, TypeError) as error:
        parser.error(str(error))
    print(json.dumps(result))
    raise SystemExit(0 if result["size_ok"] else 1)
