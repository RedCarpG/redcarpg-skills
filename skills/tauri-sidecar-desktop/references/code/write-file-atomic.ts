// 整个文件重写（设置、记录……）都走这里：先写到同一个文件夹里的临时文件、落盘，再改名换掉原来的。
// 直接 writeFileSync 会先把原文件清空再写，写到一半断电或进程被结束，文件就是空的或者半截的；
// 改名是一步完成的，换之前原文件不动，最坏也只是这一次没存上。
// 改写自一个在用的 Tauri 桌宠（见 SKILL.md「来源与维护」）。

import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeSync } from "node:fs";
import { randomBytes } from "node:crypto";

/** Windows 上目标文件正被别的程序（杀毒、索引、编辑器）打开时改名会失败：等一下再试。 */
const RETRIES = 5;
const RETRY_MS = 20;
const RETRYABLE = new Set(["EPERM", "EACCES", "EBUSY"]);

const pause = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

export function writeFileAtomic(path: string, data: string | Uint8Array, options: { mode?: number } = {}): void {
  // 临时文件放在同一个文件夹：跨盘的 rename 不是一步完成的
  const tmp = `${path}.${process.pid}-${randomBytes(4).toString("hex")}.tmp`;
  try {
    const fd = openSync(tmp, "w", options.mode ?? 0o666);
    try {
      writeSync(fd, typeof data === "string" ? Buffer.from(data, "utf8") : data);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    for (let attempt = 0; ; attempt++) {
      try {
        renameSync(tmp, path);
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code ?? "";
        if (attempt >= RETRIES || !RETRYABLE.has(code)) throw err;
        pause(RETRY_MS * (attempt + 1));
      }
    }
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}
