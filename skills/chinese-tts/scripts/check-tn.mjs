#!/usr/bin/env node
// 用 references/golden-cases.json 检查一个中文 TTS 文本规范化（TN）实现。
//
// 用法：
//   node check-tn.mjs <你的模块.mjs> [--fn normalize] [--stream createStream] [--only 号码] [--quiet]
//
// 你的模块要导出：
//   - 整段转：一个函数，(text: string) => string，默认名字 normalize（用 --fn 改）。
//   - 流式（可选）：一个工厂，() => ({ push(chunk: string): string, flush(): string })，默认名字 createStream（用 --stream 改）。
//     脚本一个字一个字 push，最后 flush，把吐出来的拼起来比。没导出就跳过流式这一组。
// TS 写的实现：先编译成 JS，或者用 `npx tsx check-tn.mjs your-module.ts`。
//
// 比较时忽略空白和常见标点（，。、！？,.!? 和空格），只比念法。
// 带 note 的用例是「参考」：念法各项目可以不同，只报出来、不算失败。
// 退出码：有失败的用例时为 1。

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const target = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && args[i - 1] !== "--quiet"));
if (!target) {
  console.error("用法：node check-tn.mjs <你的模块.mjs> [--fn normalize] [--stream createStream] [--only 分组关键词] [--quiet]");
  process.exit(2);
}
const fnName = flag("--fn", "normalize");
const streamName = flag("--stream", "createStream");
const only = flag("--only", "");
const quiet = args.includes("--quiet");

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(resolve(here, "../references/golden-cases.json"), "utf8"));
const mod = await import(pathToFileURL(resolve(target)).href);

const squash = (s) => String(s).replace(/[\s，。、！？,.!?]/g, "");
let pass = 0;
let fail = 0;
let soft = 0;

function check(kind, c, got) {
  const ok = squash(got) === squash(c.out);
  if (ok) {
    pass++;
    if (!quiet) console.log(`  ✓ ${c.in}`);
    return;
  }
  if (c.note) {
    soft++;
    console.log(`  · [参考] ${c.in}\n      期望 ${c.out}\n      得到 ${got}\n      （${c.note}）`);
    return;
  }
  fail++;
  console.log(`  ✗ [${kind}${c.group ? " · " + c.group : ""}] ${c.in}\n      期望 ${c.out}\n      得到 ${got}`);
}

const normalize = mod[fnName] ?? mod.default;
if (typeof normalize !== "function") {
  console.error(`模块里没有导出函数 ${fnName}（也没有 default）`);
  process.exit(2);
}

console.log(`整段转（${fnName}）：`);
for (const c of cases.whole) {
  if (only && !(c.group ?? "").includes(only) && !c.in.includes(only)) continue;
  let got;
  try {
    got = normalize(c.in);
  } catch (err) {
    got = `抛错：${err instanceof Error ? err.message : String(err)}`;
  }
  check("整段", c, got);
}

const createStream = mod[streamName];
if (typeof createStream === "function") {
  console.log(`\n流式，一个字一个字喂（${streamName}）：`);
  for (const c of cases.stream) {
    if (only && !c.in.includes(only)) continue;
    let got = "";
    try {
      const s = createStream();
      for (const ch of [...c.in]) got += s.push(ch) ?? "";
      got += s.flush() ?? "";
    } catch (err) {
      got = `抛错：${err instanceof Error ? err.message : String(err)}`;
    }
    check("流式", c, got);
  }
} else {
  console.log(`\n没有导出 ${streamName}，跳过流式这一组。做流式朗读的话，一定要补上：整段对、流式错是最常见的问题。`);
}

console.log(`\n通过 ${pass}，失败 ${fail}${soft ? `，参考 ${soft}` : ""}。`);
process.exit(fail > 0 ? 1 : 0);
