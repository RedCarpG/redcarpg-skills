#!/usr/bin/env node
// 检查 repo 里所有 skill 能不能发布。无依赖：node scripts/validate.mjs
// 有错误时退出码 1；警告不影响退出码。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SKILLS = join(ROOT, 'skills');
const HOMEPAGE = 'https://github.com/RedCarpG/redcarpg-skills/tree/main/skills/';
const MAX_DESC = 1024; // Agent Skills 规范的 description 上限
const MAX_FILE = 5 * 1024 * 1024;
const TEXT_EXT = /\.(md|mjs|js|cjs|ts|py|sh|ps1|json|ya?ml|html|css|txt|toml)$/i;

// 不能出现在公开 repo 里的东西
const FORBIDDEN = [
  [/\b[A-Za-z]:[\\/]+(Users|Project)\b/i, '本机绝对路径'],
  [/\/(Users|home)\/(?!<|\$|you\b|me\b|user\b|name\b)[A-Za-z0-9._-]+\//, '本机绝对路径'],
  [/[A-Za-z0-9._%+-]+@(gmail|qq|163|outlook|hotmail)\.com/i, '邮箱'],
  [/\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16})\b/, '疑似密钥'],
];

const errors = [];
const warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warns.push(`${f}: ${m}`);
const rel = (p) => relative(ROOT, p).split(sep).join('/');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.name === 'node_modules' || e.name === '.git') return [];
    return e.isDirectory() ? walk(p) : [p];
  });
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const skillDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

for (const name of skillDirs) {
  const dir = join(SKILLS, name);
  const skillMd = join(dir, 'SKILL.md');
  if (!existsSync(skillMd)) { err(rel(dir), '缺 SKILL.md'); continue; }
  const text = readFileSync(skillMd, 'utf8');
  const fm = frontmatter(text);
  if (!fm) err(rel(skillMd), '没有 YAML frontmatter');
  else {
    if (fm.name !== name) err(rel(skillMd), `name 是 "${fm.name}"，和目录名 "${name}" 不一致`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) err(rel(dir), '目录名只能用小写字母、数字和连字符');
    if (!fm.description) err(rel(skillMd), 'description 为空');
    else if ([...fm.description].length > MAX_DESC)
      err(rel(skillMd), `description ${[...fm.description].length} 字，超过 ${MAX_DESC}`);
  }
  if (!/^#+\s.*来源与维护/m.test(text)) err(rel(skillMd), '缺「来源与维护」一节');
  else {
    const section = text.slice(text.search(/^#+\s.*来源与维护/m));
    if (!section.includes('redcarpg-skills')) warn(rel(skillMd), '「来源与维护」里没提到本 repo，源头可能还写着旧位置');
  }

  const manPath = join(dir, 'manifest.json');
  if (!existsSync(manPath)) err(rel(dir), '缺 manifest.json');
  else {
    try {
      const man = JSON.parse(readFileSync(manPath, 'utf8'));
      if (man.name !== name) err(rel(manPath), `name 是 "${man.name}"，应为 "${name}"`);
      if (!/^\d+\.\d+\.\d+$/.test(man.version ?? '')) err(rel(manPath), 'version 不是 x.y.z');
      if (man.homepage !== HOMEPAGE + name) err(rel(manPath), `homepage 应为 ${HOMEPAGE + name}`);
      if (!man.description) err(rel(manPath), '缺 description');
    } catch (e) { err(rel(manPath), `JSON 解析失败：${e.message}`); }
  }
  if (!existsSync(join(dir, 'README.md'))) warn(rel(dir), '缺给人看的 README.md');
}

// 插件包：引用的目录要存在，每个 skill 至少在一个包里
const mpPath = join(ROOT, '.claude-plugin', 'marketplace.json');
const inPlugin = new Set();
try {
  const mp = JSON.parse(readFileSync(mpPath, 'utf8'));
  for (const p of mp.plugins ?? []) {
    for (const s of p.skills ?? []) {
      const target = join(ROOT, p.source ?? './', s);
      if (!existsSync(join(target, 'SKILL.md'))) err(rel(mpPath), `插件 ${p.name} 引用的 ${s} 没有 SKILL.md`);
      inPlugin.add(rel(target).split('/').pop());
    }
  }
} catch (e) { err(rel(mpPath), `读不了：${e.message}`); }
for (const name of skillDirs) if (!inPlugin.has(name)) err('marketplace.json', `skill ${name} 不在任何插件包里`);

// 全 repo 扫一遍敏感内容和大文件
for (const f of walk(ROOT)) {
  const r = rel(f);
  if (r.startsWith('scripts/validate.mjs')) continue; // 规则本身
  const size = statSync(f).size;
  if (size > MAX_FILE) warn(r, `文件 ${(size / 1048576).toFixed(1)} MB，考虑放 Release 而不是 git`);
  if (!TEXT_EXT.test(f)) continue;
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [re, what] of FORBIDDEN) if (re.test(line)) err(`${r}:${i + 1}`, `${what}：${line.trim().slice(0, 120)}`);
  });
}

for (const w of warns) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${skillDirs.length} 个 skill，${errors.length} 个错误，${warns.length} 个警告`);
process.exit(errors.length ? 1 : 0);
