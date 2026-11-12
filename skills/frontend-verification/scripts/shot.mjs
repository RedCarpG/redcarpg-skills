#!/usr/bin/env node
// shot.mjs — screenshot through the Chrome DevTools Protocol, in real time (no virtual time).
// Use it instead of shot.sh when you need: an exact viewport (e.g. 375 wide), requestAnimationFrame
// animations that really run, a page state (click, localStorage, language) before the shot,
// a full-page capture, or text/DOM read out of the live page. Needs Node >= 22 (global WebSocket) and Chrome.
//
// usage: node shot.mjs OUT.png WxH URL [options]
//   --wait MS         real time to wait after load before capturing (default 1500)
//   --wait-for SEL    also wait (max 15 s) until document.querySelector(SEL) exists
//   --dark | --light  prefers-color-scheme (default light; headless otherwise follows the OS theme)
//   --print           emulate print media (the PNG shows what the printer sees)
//   --mobile          mobile emulation (touch, meta viewport); default is a plain desktop-style window
//   --scale N         device scale factor (default 1)
//   --lang LOCALE     navigator.language + Accept-Language, e.g. en-US, zh-TW
//   --pre JS          run JS after the first load, then reload (set localStorage/cookies, then watch the app boot with them)
//   --eval JS         run JS after load, before the wait (click a tab, open a drawer...). Repeatable.
//   --full            capture the whole scrollable page, not just the viewport
//   --dom FILE        also write document.documentElement.outerHTML to FILE
//   --text            also print document.body.innerText to stdout
//   --chrome PATH     Chrome binary (or $CHROME)
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

function die(msg) { console.error('shot.mjs: ' + msg); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const a = process.argv.slice(2);
const opt = { wait: 1500, waitFor: null, scheme: 'light', print: false, mobile: false, scale: 1, lang: null,
  pre: null, evals: [], full: false, dom: null, text: false, chrome: process.env.CHROME || process.env.CHROME_PATH || null };
const pos = [];
for (let i = 0; i < a.length; i++) {
  const k = a[i];
  const v = () => { if (i + 1 >= a.length) die(`${k} needs a value`); return a[++i]; };
  if (k === '--wait') opt.wait = +v();
  else if (k === '--wait-for') opt.waitFor = v();
  else if (k === '--dark') opt.scheme = 'dark';
  else if (k === '--light') opt.scheme = 'light';
  else if (k === '--print') opt.print = true;
  else if (k === '--mobile') opt.mobile = true;
  else if (k === '--scale') opt.scale = +v();
  else if (k === '--lang') opt.lang = v();
  else if (k === '--pre') opt.pre = v();
  else if (k === '--eval') opt.evals.push(v());
  else if (k === '--full') opt.full = true;
  else if (k === '--dom') opt.dom = v();
  else if (k === '--text') opt.text = true;
  else if (k === '--chrome') opt.chrome = v();
  else if (k === '-h' || k === '--help') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 21).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(0);
  } else if (k.startsWith('--')) die(`unknown option ${k}`);
  else pos.push(k);
}
if (pos.length < 3) die('usage: node shot.mjs OUT.png WxH URL [options]   (-h for help)');
const [out, size, urlArg] = pos;
const m = /^(\d+)x(\d+)$/.exec(size);
if (!m) die(`size must look like 1440x900, got '${size}'`);
const W = +m[1], H = +m[2];
// a URL has a scheme of 2+ letters; "C:\x\y.html" and "./y.html" are file paths
const url = /^[a-z][a-z0-9+.-]+:/i.test(urlArg) ? urlArg : pathToFileURL(resolve(urlArg)).href;

function findChrome() {
  if (opt.chrome) return opt.chrome;
  const env = process.env, c = [];
  if (process.platform === 'win32') {
    for (const base of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean))
      c.push(join(base, 'Google/Chrome/Application/chrome.exe'));
    for (const base of [env['PROGRAMFILES(X86)'], env.PROGRAMFILES].filter(Boolean))
      c.push(join(base, 'Microsoft/Edge/Application/msedge.exe'));
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    for (const d of (env.PATH || '').split(':'))
      for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'microsoft-edge']) c.push(join(d, n));
  }
  return c.find(p => existsSync(p)) || die('no Chrome found; pass --chrome PATH or set CHROME');
}

mkdirSync(dirname(resolve(out)), { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'shot-'));
const chrome = spawn(findChrome(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ws, closed = false, send;
const exited = new Promise(res => chrome.once('exit', res));
async function cleanup() {
  if (closed) return;
  closed = true;
  // ask Chrome to quit (closes its helper processes too), then force-kill the whole tree if it lingers
  try { await Promise.race([send && send('Browser.close'), sleep(1500)]); } catch { /* connection gone */ }
  try { ws && ws.close(); } catch { /* already closed */ }
  await Promise.race([exited, sleep(2500)]);
  if (chrome.exitCode === null) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
    else chrome.kill('SIGKILL');
    await Promise.race([exited, sleep(2000)]);
  }
  for (let i = 0; i < 10; i++) {   // the profile dir stays locked for a moment after Chrome exits
    try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); }
  }
}
process.on('SIGINT', () => cleanup().then(() => process.exit(130)));
const watchdog = setTimeout(() => { console.error('shot.mjs: timed out after 90 s'); cleanup().then(() => process.exit(1)); }, 90000);

try {
  // Chrome writes the chosen debugging port to <profile>/DevToolsActivePort
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { await sleep(100); }
  }
  if (!port) throw new Error('Chrome did not start (no DevToolsActivePort)');
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
    if (!target) await sleep(100);
  }
  if (!target) throw new Error('no page target');

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket failed')); });
  let id = 0;
  const pending = new Map(), waiters = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
    } else if (msg.method) {
      for (const w of [...waiters]) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.res(msg.params); }
    }
  };
  send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = (method, ms = 30000) => new Promise((res, rej) => { waiters.push({ method, res }); setTimeout(() => rej(new Error(`timeout waiting for ${method}`)), ms); });
  const js = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page script failed: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    return r.result.value;
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: opt.scale, mobile: opt.mobile });
  await send('Emulation.setEmulatedMedia', { media: opt.print ? 'print' : '', features: [{ name: 'prefers-color-scheme', value: opt.scheme }] });
  if (opt.lang) {
    const L = JSON.stringify(opt.lang);
    await send('Emulation.setLocaleOverride', { locale: opt.lang });
    await send('Network.enable');
    await send('Network.setExtraHTTPHeaders', { headers: { 'Accept-Language': opt.lang } });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator,'language',{get:()=>${L}});Object.defineProperty(navigator,'languages',{get:()=>[${L}]})` });
  }
  const load = async () => { const l = once('Page.loadEventFired'); await send('Page.navigate', { url }); await l; };
  await load();
  if (opt.pre) { await js(opt.pre); const l = once('Page.loadEventFired'); await send('Page.reload'); await l; }
  for (const e of opt.evals) await js(e);
  if (opt.waitFor) {
    const t0 = Date.now();
    while (!(await js(`!!document.querySelector(${JSON.stringify(opt.waitFor)})`))) {
      if (Date.now() - t0 > 15000) throw new Error(`selector never appeared: ${opt.waitFor}`);
      await sleep(100);
    }
  }
  await sleep(opt.wait);

  let clip;
  if (opt.full) {
    const { cssContentSize: s } = await send('Page.getLayoutMetrics');
    clip = { x: 0, y: 0, width: Math.max(W, Math.ceil(s.width)), height: Math.ceil(s.height), scale: 1 };
  }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: opt.full, ...(clip ? { clip } : {}) });
  writeFileSync(resolve(out), Buffer.from(shot.data, 'base64'));
  const png = readFileSync(resolve(out));
  const info = await js(`JSON.stringify({innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, dark: matchMedia('(prefers-color-scheme: dark)').matches, print: matchMedia('print').matches, lang: navigator.language})`);
  if (opt.dom) writeFileSync(resolve(opt.dom), await js('document.documentElement.outerHTML'));
  if (opt.text) console.log('--- body text ---\n' + await js('document.body.innerText') + '\n--- end ---');
  console.log(`${out} ${png.readUInt32BE(16)}x${png.readUInt32BE(20)} ${png.length}B ${info}`);
} catch (e) {
  console.error('shot.mjs: ' + e.message);
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  await cleanup();
  process.exit(process.exitCode || 0);   // open handles (keep-alive sockets, orphaned helpers) must not hold the process
}
