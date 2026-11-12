#!/usr/bin/env node
// 每个 skill 打一个 zip，可以上传到 claude.ai（Settings → Capabilities → Skills），也可以附到 GitHub Release。
//   node scripts/package.mjs              全部
//   node scripts/package.mjs <名字> ...    只打这几个
//   node scripts/package.mjs --from <repo> 打另一个 repo 的 skills/（输出到它的 dist/）
// 输出 dist/<名字>-<版本>.zip。zip 里是 <名字>/SKILL.md 这样的一层目录。
// 不打进去：evals/（测试用例）、README.md 和 manifest.json（给人和 repo 看的）、缓存文件。
// 只用 node 自带模块：自己写 zip（store 不压缩之外用 deflate），不依赖系统的 zip/tar。
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync, crc32 } from 'node:zlib'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const argv = process.argv.slice(2)
const opt = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv.splice(i, 2)[1] : null }
// --from <repo 目录>：打别的 repo 的 skills/（比如私人 repo 的孵化区），输出到那个 repo 的 dist/
const FROM = resolve(opt('--from') ?? ROOT)
const SKILLS = join(FROM, 'skills')
const OUT = join(FROM, 'dist')
const SKIP_TOP = new Set(['evals', 'README.md', 'manifest.json'])
const SKIP_ANY = new Set(['__pycache__', '.DS_Store', 'Thumbs.db', 'node_modules'])

function files(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    const rel = relative(base, p).split(sep)
    if (SKIP_ANY.has(e.name) || (rel.length === 1 && SKIP_TOP.has(e.name))) return []
    return e.isDirectory() ? files(p, base) : [p]
  }).sort()
}

/** 最小的 zip 写法：每个文件 deflate，UTF-8 文件名（通用标志位 0x0800） */
function zip(entries) {
  const locals = [], centrals = []
  let offset = 0
  const dosTime = (() => {
    const d = new Date()
    return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }
  })()
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const comp = deflateRawSync(data, { level: 9 })
    const crc = crc32(data) >>> 0
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8)
    local.writeUInt16LE(dosTime.time, 10); local.writeUInt16LE(dosTime.date, 12); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28)
    locals.push(local, nameBuf, comp)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10)
    central.writeUInt16LE(dosTime.time, 12); central.writeUInt16LE(dosTime.date, 14); central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + comp.length
  }
  const cd = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, end])
}

const wanted = argv
const names = readdirSync(SKILLS).filter((n) => statSync(join(SKILLS, n)).isDirectory() && (!wanted.length || wanted.includes(n)))
mkdirSync(OUT, { recursive: true })
for (const name of names) {
  const dir = join(SKILLS, name)
  let version = 'dev'
  try { version = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).version } catch {}
  const entries = files(dir).map((p) => ({ name: `${name}/${relative(dir, p).split(sep).join('/')}`, data: readFileSync(p) }))
  const out = join(OUT, `${name}-${version}.zip`)
  writeFileSync(out, zip(entries))
  console.log(`${name}-${version}.zip  ${entries.length} 个文件  ${(statSync(out).size / 1024).toFixed(0)} KB`)
}
console.log(`\n输出：${OUT}`)
