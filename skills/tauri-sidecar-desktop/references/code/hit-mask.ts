// 按画出来的像素算可交互区域：角色的轮廓点得到，头发、胳膊之间的空隙点得穿。
// 改写自一个在用的 Tauri 桌宠（见 SKILL.md「来源与维护」），VRM（three.js）和 Live2D（PixiJS）都用它。
//
// 用法（每 MASK_EVERY_MS 一次）：
//   const mask = new PixelMask();
//   const regions = mask.read(gl, w, h, devicePixelRatio, left, top); // gl 是只画了角色的那块画布
//   if (regions) await invoke("set_hit_regions", { regions });         // 和上次一样时是 null，不用发
// 角色和别的东西画在同一块画布上时，不要读整块：把角色单独渲染一份（1/4 大小就够）再读，scale 跟着改。

export type HitRegion =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };

/** 多久读一次像素。 */
export const MASK_EVERY_MS = 250;
/** 格子多大（逻辑像素）。 */
export const CELL = 8;
/** alpha 大于这个才算实心（0–255）。 */
const SOLID = 25;

/**
 * 把一张 alpha 图（WebGL 的「下面往上」顺序）变成一排排矩形（窗口坐标，逻辑像素）。
 * `w`、`h` 是图的像素；`scale` 是一个逻辑像素对应几个图像素；`left`、`top` 是图左上角在窗口里的位置。
 * 同一行连着的实心格合成一段；上下相邻、左右一样的段合成一个矩形，少发一点。
 */
export function maskRects(
  alpha: (x: number, y: number) => number,
  w: number,
  h: number,
  scale: number,
  left: number,
  top: number,
  cell = CELL,
): HitRegion[] {
  const cols = Math.ceil(w / scale / cell);
  const rows = Math.ceil(h / scale / cell);
  // 每格不用每个像素都看：隔几个看一个
  const step = Math.max(1, Math.floor((cell * scale) / 3));
  const filled = (c: number, r: number): boolean => {
    for (let y = Math.floor(r * cell * scale); y < Math.min(h, (r + 1) * cell * scale); y += step) {
      for (let x = Math.floor(c * cell * scale); x < Math.min(w, (c + 1) * cell * scale); x += step) {
        if (alpha(x, h - 1 - y) > SOLID) return true;
      }
    }
    return false;
  };
  type Rect = { x: number; y: number; w: number; h: number };
  const rects: Rect[] = [];
  let prev: { c0: number; c1: number; rect: Rect }[] = [];
  for (let r = 0; r < rows; r++) {
    const runs: [number, number][] = [];
    for (let c = 0; c < cols; c++) {
      if (!filled(c, r)) continue;
      const last = runs.at(-1);
      if (last && last[1] === c - 1) last[1] = c;
      else runs.push([c, c]);
    }
    const next: typeof prev = [];
    for (const [c0, c1] of runs) {
      const same = prev.find((p) => p.c0 === c0 && p.c1 === c1);
      if (same) {
        same.rect.h += cell;
        next.push(same);
      } else {
        const rect = { x: left + c0 * cell, y: top + r * cell, w: (c1 - c0 + 1) * cell, h: cell };
        rects.push(rect);
        next.push({ c0, c1, rect });
      }
    }
    prev = next;
  }
  return rects.map((r) => ({ kind: "rect" as const, ...r }));
}

/** 从 WebGL 画布读透明度算区域。和上次一样回 null。图的大小变了自己换缓冲。 */
export class PixelMask {
  private pixels: Uint8Array | null = null;
  private key = "";

  read(gl: WebGLRenderingContext | WebGL2RenderingContext, w: number, h: number, scale: number, left: number, top: number): HitRegion[] | null {
    if (this.pixels?.length !== w * h * 4) this.pixels = new Uint8Array(w * h * 4);
    const px = this.pixels;
    // 画布要么在同一帧里读，要么建 context 时开 preserveDrawingBuffer，否则读出来是空的
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const next = maskRects((x, y) => px[(y * w + x) * 4 + 3], w, h, scale, left, top);
    const key = JSON.stringify(next);
    if (key === this.key) return null;
    this.key = key;
    return next;
  }
}
