// 一个 JSON 数据文件：读、检查、存都走这里。改写自一个在用的 Tauri 桌宠（见 SKILL.md「来源与维护」）。
// - 不在：用 fallback。
// - 读不出来、格式不对（parse 抛错）：
//   · data（程序替用户记的、设置里改的）：坏文件改名放到一边（xxx.json.bad-日期-时间）、报一声，再用 fallback。
//     不放到一边的话，下次一存就把它盖掉了。
//   · user（用户手改的）：不挪走，报一声哪坏了，先用 fallback；修好了下次读就好。
//     坏着的时候又要存（设置里改了）：先把坏的放到一边再存，用户改的那份不丢。
//   · cache（坏了重新来也没关系）：重新来，只写日志。
// - 存：先写临时文件再改名；存不了报一声、回 false，不抛错。
// 旧格式的兼容写在 parse 里；「该是对象却是数组」这种也要抛错，当作读不出来。
//
// 用法：
//   const todos = new JsonStore({ path: dataPath("todos.json"), label: "待办", fallback: () => ({ items: [] }),
//                                 fallbackNote: "先从空的开始", parse: parseTodos, onProblem: showWarning });
//   const value = todos.load();
//   if (!todos.save(value)) throw new Error("没存上"); // 要让用户知道「没改成」时

import { existsSync, readFileSync, renameSync } from "node:fs";
import { basename } from "node:path";
import { writeFileAtomic } from "./write-file-atomic.js";

export type StoreKind = "data" | "user" | "cache";

/** 要告诉用户的问题（界面上的 ⚠）。key 相同的后一条盖前一条；clear 表示好了。 */
export interface StoreProblems {
  report(key: string, message: string, hint?: string): void;
  clear(key: string): void;
}

export interface JsonStoreOptions<T> {
  path: string;
  /** 这是什么（「待办」「通知设置」），报问题时用。 */
  label: string;
  kind?: StoreKind;
  /** 没有、读不出来时用的。每次调用给一份新的（调用方会改它）。 */
  fallback: () => T;
  /** 读不出来时现在用的是什么（「先从空的开始」「用默认的」）。 */
  fallbackNote?: string;
  /** 读出来的 JSON → 值。格式不对就抛错；能凑合用的自己补成默认值。 */
  parse: (raw: unknown) => T;
  format?: (value: T) => string;
  problems?: StoreProblems;
  log?: (level: "debug" | "warn", message: string, err?: unknown) => void;
}

const defaultFormat = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const noProblems: StoreProblems = { report: () => {}, clear: () => {} };

export class JsonStore<T> {
  readonly path: string;
  private readonly kind: StoreKind;
  private readonly problems: StoreProblems;
  /** 用户手改的文件上次没读出来：这时候要存，先把它放到一边。 */
  private broken = false;

  constructor(private readonly options: JsonStoreOptions<T>) {
    this.path = options.path;
    this.kind = options.kind ?? "data";
    this.problems = options.problems ?? noProblems;
  }

  /** 读一次（不缓存：要缓存的调用方自己留着结果）。 */
  load(): T {
    const { path, label, fallback } = this.options;
    if (!existsSync(path)) return fallback();
    const note = this.options.fallbackNote ?? "用默认的";
    try {
      // 用户用记事本改过的文件开头可能有 BOM
      const text = readFileSync(path, "utf8").replace(/^﻿/, "");
      const value = this.options.parse(JSON.parse(text));
      if (this.kind === "user") {
        this.broken = false;
        this.problems.clear(this.key);
      }
      return value;
    } catch (err) {
      if (this.kind === "data") {
        const aside = this.setAside();
        this.problems.report(this.key, `${label}的文件读不出来，${note}`, aside ? `原来的文件改名成了 ${basename(aside)}` : undefined);
      } else if (this.kind === "user") {
        this.broken = true;
        this.options.log?.("warn", `${basename(path)} 读不了，${note}`, err);
        this.problems.report(this.key, `${label}的文件读不出来，${note}`, `看看 ${basename(path)} 是不是改坏了（JSON 格式），修好了重启`);
      } else {
        this.options.log?.("debug", `${basename(path)} 读不了，重新来`, err);
      }
      return fallback();
    }
  }

  /** 存。存成了回 true；存不了报一声（缓存只写日志）、回 false，不抛错。 */
  save(value: T): boolean {
    if (this.broken) {
      this.broken = false;
      this.setAside();
      this.problems.clear(this.key);
    }
    try {
      writeFileAtomic(this.path, (this.options.format ?? defaultFormat)(value));
      if (this.kind !== "cache") this.problems.clear(`${this.key}:save`);
      return true;
    } catch (err) {
      if (this.kind === "cache") this.options.log?.("warn", `${basename(this.path)} 存不了`, err);
      else this.problems.report(`${this.key}:save`, `${this.options.label}存不了`, String(err));
      return false;
    }
  }

  /** 坏文件改名成 xxx.json.bad-日期-时间；改不了回 null（文件留在原地，下次存会盖掉它）。 */
  private setAside(): string | null {
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    const target = `${this.path}.bad-${stamp}`;
    try {
      renameSync(this.path, target);
      return target;
    } catch (err) {
      this.options.log?.("warn", `${basename(this.path)} 放不到一边`, err);
      return null;
    }
  }

  private get key(): string {
    return `bad:${basename(this.path).replace(/\.json$/, "")}`;
  }
}

/** parse 里常用的：是不是一个对象（不是数组、不是 null）。不是就抛错（当作读不出来）。 */
export function objectOf(raw: unknown, what = "应该是一个对象"): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error(what);
  return raw as Record<string, unknown>;
}
