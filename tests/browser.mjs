// Optional dependency-free browser integration check. Requires a local Chromium.
// BROWSER_BIN=/path/to/chromium node tests/browser.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const binary = process.env.BROWSER_BIN;
if (!binary) throw new Error('Set BROWSER_BIN to the installed Chromium executable. No browser is downloaded.');
const root = resolve(import.meta.dirname, '..');
const profile = await mkdtemp(join(tmpdir(), 'kartoffel-test-'));
const screenshots = process.env.SCREENSHOT_DIR || join(tmpdir(), 'kartoffel-screenshots');
await mkdir(screenshots, { recursive: true });
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript' }[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(binary, ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, sequence = 0;
const pending = new Map(), errors = [];
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Chromium startup timed out')), 15000);
    let output = '';
    chrome.on('error', error => { clearTimeout(timeout); reject(error); });
    chrome.stderr.on('data', chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
    chrome.on('exit', code => { clearTimeout(timeout); reject(Error(`Chromium exited (${code}): ${output}`)); });
  });
  const port = new URL(endpoint).port;
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const p = pending.get(message.id); if (!p) return;
      pending.delete(message.id); message.error ? p.reject(Error(JSON.stringify(message.error))) : p.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + JSON.stringify(message.params.exceptionDetails.exception));
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const waitFor = async (expression, timeout = 3000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(100); }
    throw Error(`Timed out: ${expression}`);
  };
  const navigate = async () => { await call('Page.navigate', { url: origin }); await waitFor('document.querySelectorAll(".upgrade-card").length === 3'); };
  const screenshot = async name => {
    const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(join(screenshots, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const click = async id => {
    const rect = await evaluate(`(() => { const e = document.getElementById(${JSON.stringify(id)}); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...rect, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...rect, button: 'left', clickCount: 1 });
  };
  await call('Page.enable'); await call('Runtime.enable'); await call('Log.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
  await navigate(); await sleep(300); await screenshot('desktop-ready');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Desktop overflow');
  await click('help-button'); assert.equal(await evaluate('document.getElementById("help-dialog").open'), true); await click('help-ready');
  console.log('PASS desktop startup, canvas, help and layout');

  await evaluate('document.getElementById("energy").value = 150; document.getElementById("energy").dispatchEvent(new Event("input",{bubbles:true}))');
  assert.match(await evaluate('document.getElementById("stress-title").textContent'), /PÜREE/);
  await click('launch-button'); await waitFor('!document.getElementById("result").hidden');
  assert.match(await evaluate('document.getElementById("result-material").textContent'), /\+0/);
  await click('retry-button'); await waitFor('!document.getElementById("result").hidden');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v1")).attempts'), 2);
  await click('tune-button');
  await evaluate('document.getElementById("energy").value = 70; document.getElementById("energy").dispatchEvent(new Event("input",{bubbles:true}))');
  await click('launch-button');
  assert.equal(await evaluate('document.getElementById("angle").disabled && document.querySelector("[data-equip]").disabled'), true);
  // A help dialog pauses a live flight instead of advancing behind the overlay.
  await sleep(500); await click('help-button');
  const pausedDistance = await evaluate('document.getElementById("distance").textContent'); await sleep(350);
  assert.equal(await evaluate('document.getElementById("distance").textContent'), pausedDistance);
  await click('help-ready');
  await waitFor('!document.getElementById("result").hidden', 25000);
  const progress = await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v1"))');
  assert.ok(progress.material > 0); assert.ok(progress.scores[0].distance > 150);
  await screenshot('desktop-result');
  await navigate(); assert.equal(await evaluate('document.getElementById("material").textContent'), String(progress.material));
  console.log('PASS lethal launch, retry, live pause, full flight, settlement and reload');

  await evaluate('const p=JSON.parse(localStorage.getItem("kartoffelkanone.v1")); p.material=200; localStorage.setItem("kartoffelkanone.v1",JSON.stringify(p))');
  await navigate();
  await evaluate('document.querySelector("[data-buy=armor]").click()');
  assert.equal(await evaluate('document.getElementById("material").textContent'), '175');
  assert.equal(await evaluate('document.querySelector("[data-equip=armor]").value'), '1');
  await evaluate('const s=document.querySelector("[data-equip=armor]");s.value="0";s.dispatchEvent(new Event("change",{bubbles:true}))');
  await navigate(); assert.equal(await evaluate('document.querySelector("[data-equip=armor]").value'), '0');
  assert.equal(await evaluate('document.getElementById("material").textContent'), '175');
  console.log('PASS purchases, free unequipping and equipment persistence');

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await evaluate('localStorage.clear()'); await navigate(); await sleep(200); await screenshot('mobile-ready');
  for (const width of [320, 390, 768]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow at ${width}px`);
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await evaluate('document.getElementById("energy").value=150;document.getElementById("energy").dispatchEvent(new Event("input",{bubbles:true}));document.getElementById("launch-button").scrollIntoView({block:"center"})');
  const touch = await evaluate('(()=>{const r=document.getElementById("launch-button").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitFor('!document.getElementById("result").hidden'); await screenshot('mobile-result');
  console.log('PASS responsive layouts and real touch launch');

  await evaluate('localStorage.setItem("kartoffelkanone.v1","broken")'); await navigate();
  assert.equal(await evaluate('document.getElementById("material").textContent'), '0');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(window,"localStorage",{get(){throw Error("blocked")}})' });
  await navigate(); assert.equal(await evaluate('document.getElementById("storage-warning").hidden'), false);
  await click('launch-button'); assert.equal(await evaluate('document.getElementById("phase-badge").textContent'), 'IM ANFLUG');
  assert.deepEqual(errors, []);
  console.log(`PASS corrupt/blocked storage and zero browser errors\nScreenshots: ${screenshots}`);
} finally {
  ws?.close();
  chrome.kill('SIGTERM');
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else { chrome.once('exit', resolve); setTimeout(resolve, 2000); } });
  server.close();
  await rm(profile, { recursive: true, force: true });
}
