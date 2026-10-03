// Optional dependency-free browser integration check. Requires a local Chromium.
// BROWSER_BIN=/path/to/chromium node tests/browser.mjs
import assert from 'node:assert/strict';
import { createApi } from '../api/server.mjs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const binary = process.env.BROWSER_BIN;
if (!binary) throw new Error('Set BROWSER_BIN to the installed Chromium executable. No browser is downloaded.');
const root = resolve(import.meta.dirname, '../_site');
const profile = await mkdtemp(join(tmpdir(), 'kartoffel-test-'));
const screenshots = process.env.SCREENSHOT_DIR || join(tmpdir(), 'kartoffel-screenshots');
await mkdir(screenshots, { recursive: true });
let onlineEnabled = false, advertisedRelease = null, layoutFlights = null;
let leaderboardRequests=0, layoutRank=null, holdRank=false;
const rankResponses=[];
const apiOrigins=[];
const api = createApi({rateLimit:1000,origins:apiOrigins});
const server = createServer(async (req, res) => {
  if(req.url.startsWith('/version.json') && advertisedRelease){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(advertisedRelease));return;}
  if(req.url.startsWith('/api/v1/potatoe/leaderboard'))leaderboardRequests++;
  if(req.url.startsWith('/api/v1/potatoe/leaderboard')&&layoutFlights){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({flights:layoutFlights}));return;}
  if(req.method==='POST'&&req.url.startsWith('/api/v1/potatoe/flights')&&layoutRank){req.resume();res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({id:'rank00000001'}));return;}
  if(req.url.startsWith('/api/v1/potatoe/rank')&&layoutRank){const respond=()=>res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({...layoutRank,listed:new URL(req.url,'http://local').searchParams.has('flight')}));if(holdRank)rankResponses.push(respond);else respond();return;}
  if(req.url.startsWith('/api/')){req.url=req.url.slice(4);api.emit('request',req,res);return;}
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(root, `.${/^\/f\//.test(pathname)?'/index.html':pathname.endsWith('/') ? pathname + 'index.html' : pathname}`);
  if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
  try {
    let body = await readFile(file);
    if (extname(file) === '.html' && !onlineEnabled) body=Buffer.from(body.toString().replace('<head>','<head><meta name="minizap-api" content="">'));
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.webmanifest':'application/manifest+json', '.png':'image/png' }[extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
apiOrigins.push(origin);
const chrome = spawn(binary, ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, sequence = 0;
const pending = new Map(), errors = [], requestUrls = [];
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
    if(message.method==='Network.requestWillBeSent')requestUrls.push(message.params.request.url);
    if (message.id) {
      const p = pending.get(message.id); if (!p) return;
      pending.delete(message.id); message.error ? p.reject(Error(JSON.stringify(message.error))) : p.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + JSON.stringify(message.params.exceptionDetails.exception));
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text + ' ' + (message.params.entry.url || ''));
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error(`Chromium timed out: ${method} ${params.expression?.slice(0,200)||''}`));},60000);
    pending.set(id, {resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
    ws.send(JSON.stringify({ id, method, params }));
  });
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
  const navigate = async () => { await call('Page.navigate', { url: origin }); await waitFor('document.querySelectorAll(".talent-node").length === 12'); await evaluate('document.fonts.ready.then(()=>true)'); await evaluate("document.getElementById('start-dialog')?.close()"); };
  const screenshot = async name => {
    const fixedViewport=await evaluate('document.body.classList.contains("compact-play")||!!document.querySelector("dialog[open]")');
    const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !fixedViewport });
    await writeFile(join(screenshots, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const click = async id => {
    if(id==='flight-workshop')id='workshop-button';
    if(id==='fullscreen-button'){
      const wasFullscreen=await evaluate('!!document.fullscreenElement');
      if(!await evaluate('document.getElementById("menu-dialog").open'))await click('menu-button');
      const at=await point('fullscreen-button');
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',...at});
      await call('Input.dispatchMouseEvent',{type:'mousePressed',...at,button:'left',clickCount:1});
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',...at,button:'left',clickCount:1});
      await waitFor(wasFullscreen?'!document.fullscreenElement':'!!document.fullscreenElement');
      assert.equal(await evaluate('document.querySelector("dialog[open]")===null'),true,'Fullscreen transition itself closes the modal; test never closes it');
      await sleep(150);return;
    }
    const destinations={'cosmetics-button':'cosmetics-dialog','achievements-button':'achievements-dialog','mobile-help':'help-dialog'};
    if(destinations[id]){await click('menu-button');await evaluate(`document.querySelector('#menu-dialog [data-open="${destinations[id]}"]').id='test-menu-target'`);id='test-menu-target';}
    if(await evaluate(`!!document.getElementById(${JSON.stringify(id)}).closest('#menu-dialog')&&!document.getElementById('menu-dialog').open`))await click('menu-button');
    const rect = await evaluate(`(() => { const e = document.getElementById(${JSON.stringify(id)}); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...rect });
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...rect, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...rect, button: 'left', clickCount: 1 });
  };
  const point = async id => evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const press = async id => {
    const at = await point(id);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button: 'left', clickCount: 1 }); return at;
  };
  const release = async at => call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button: 'left', clickCount: 1 });
  await call('Page.enable'); await call('Runtime.enable'); await call('Log.enable'); await call('Network.enable');
  await call('Page.addScriptToEvaluateOnNewDocument',{source: "Object.defineProperty(navigator,'languages',{configurable:true,get:()=>['de-DE','en-GB']})"});
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate',{url:origin});await waitFor('document.getElementById("start-dialog")?.open');
  assert.equal(await evaluate('document.getElementById("start-play").textContent'),'Jetzt spielen ↗');
  await screenshot('minizap-start-desktop');
  await evaluate('document.querySelector("#start-dialog [data-install]").click()');
  assert.equal(await evaluate('document.getElementById("install-dialog").open'),true);
  await screenshot('minizap-install-guide');
  await evaluate(`{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.promptCalled=true};e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e);document.querySelector('#menu-dialog [data-install]').click();}`);
  await waitFor('window.promptCalled===true');
  await navigate(); await sleep(200); await screenshot('v2-desktop-junk');
  const manifestReport=await call('Page.getAppManifest');
  assert.deepEqual(manifestReport.errors,[],'Browser parses linked web app manifest');
  const manifest=JSON.parse(manifestReport.data);
  assert.equal(manifest.display,'fullscreen');assert.equal(manifest.orientation,'landscape');
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  for(const asset of manifest.icons){
    const dims=await evaluate(`new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth+'x'+img.naturalHeight);img.onerror=reject;img.src=${JSON.stringify(asset.src)}})`);
    assert.equal(dims,asset.sizes);
  }
  // Headless Chromium has no OS installation surface. Simulate its display-mode
  // media query before app startup; native fullscreen is tested separately below.
  const installedMock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`{
    const original=window.matchMedia.bind(window);
    window.matchMedia=query=>original(query.includes('display-mode:standalone')?'(min-width:0px)':query);
  }`});
  await navigate();await waitFor('document.body.classList.contains("compact-play")');
  assert.equal(await evaluate('[...document.querySelectorAll("[data-install]")].every(b=>b.hidden)'),true);
  assert.equal(await evaluate('(()=>{const r=document.getElementById("game").getBoundingClientRect();return r.top===0&&r.left===0&&Math.abs(r.height-innerHeight)<1})()'),true);
  await screenshot('v13-installed-layout');
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:installedMock.identifier});
  await navigate();await waitFor('!document.body.classList.contains("compact-play")');
  console.log('PASS linked manifest, launcher PNG sizes and edge-to-edge installed display modes');

  // Secondary About/privacy use real navigation and never fetch social/wallet embeds.
  for(const [width,height] of [[1280,900],[740,320],[390,844],[320,740]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
    for(const language of ['de','en']) {
      await navigate();
      await click('menu-button');
      await evaluate(`document.querySelector('#menu-dialog [data-language=${language}]').click();document.querySelector('#menu-dialog [data-about-open="about-dialog"]').id='test-about-entry'`);
      const begin=requestUrls.length;
      // The browser footer reaches support; compact/installed modes use the menu.
      assert.equal(await evaluate('!!document.querySelector("footer [data-support]")'),true,'Footer coffee entry exists');
      if(width===1280){
        await evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close());document.querySelector("footer [data-support]").id="test-footer-coffee"');await click('test-footer-coffee');
        assert.equal(await evaluate('document.activeElement.id'),'support-title','Footer opens and focuses support section');
        await evaluate('document.getElementById("about-dialog").close();document.getElementById("test-footer-coffee").focus()');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
        await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        assert.equal(await evaluate('document.getElementById("about-dialog").open&&document.activeElement.id==="support-title"'),true,'Keyboard footer shortcut opens and focuses support');
      }else await click('test-about-entry');
      assert.equal(await evaluate('document.getElementById("about-dialog").open'),true);
      assert.equal(await evaluate('document.querySelectorAll("#about-dialog a[href^=solana]").length'),1,'One SOL action');
      assert.equal(await evaluate('document.querySelectorAll("#about-dialog a[href*=paypalme]").length'),1,'One PayPal option');
      assert.equal(await evaluate('document.querySelector("#about-dialog a[href*=paypalme]").getAttribute("href")'),'https://www.paypal.com/paypalme/expeter');
      assert.equal(await evaluate('document.querySelector("#about-dialog a[href^=solana] svg").getAttribute("aria-hidden")'),'true');
      assert.equal(await evaluate('document.querySelector("#about-dialog a[href^=solana]").getAttribute("aria-label")'),language==='en'?'Support with SOL on Solana':'Mit SOL auf Solana unterstützen');
      assert.equal(await evaluate('document.querySelector("#about-dialog a[href*=phantom]").getAttribute("href")'),'https://phantom.com/download');
      assert.equal(await evaluate('Array.from(document.querySelectorAll(".support-method > span:not(.paypal-mark)")).every(label=>{const range=document.createRange();range.selectNodeContents(label);return range.getClientRects().length===1})'),true,'Payment labels fit on one line');
      assert.equal(await evaluate('document.querySelector("#about-dialog a[href*=releases]").getAttribute("href")'), 'https://github.com/expeter/potatoegun/releases/tag/v'+JSON.parse(await readFile(resolve(root,'version.json'),'utf8')).version);
      assert.equal(await evaluate('document.getElementById("about-dialog").open&&!document.getElementById("menu-dialog").open'),true);
      assert.equal(await evaluate('document.getElementById("about-title").textContent'),language==='en'?'About this potato':'Über diese Knolle');
      assert.equal(await evaluate('document.querySelector("#about-dialog .app-version").textContent'), 'v'+JSON.parse(await readFile(resolve(root,'version.json'),'utf8')).version);
      assert.equal(await evaluate('document.querySelector("#about-dialog code").textContent'),'E684K1q1gzodtZK3xgdBXfTeRQbWWhSu8kVbzZNiw9Cz');
      assert.equal(await evaluate('document.querySelector("#about-dialog a[href^=mailto]").getAttribute("href")'),'mailto:minizap@les.bar');
      await evaluate('document.querySelector("#about-dialog details").open=true');
      assert.equal(await evaluate('document.getElementById("about-dialog").scrollWidth<=document.getElementById("about-dialog").clientWidth+1'),true,'Expanded wallet wraps');
      await screenshot(`v091-about-${language}-${width}`);
      await evaluate('document.querySelector("#about-dialog [data-about-open]").id="test-privacy-entry"');await click('test-privacy-entry');
      assert.equal(await evaluate('document.getElementById("privacy-dialog").open&&!document.getElementById("about-dialog").open'),true);
      assert.equal(await evaluate('document.getElementById("privacy-title").textContent'),language==='en'?'Privacy & storage':'Datenschutz & Speicherung');
      assert.equal(await evaluate(`document.getElementById('privacy-dialog').textContent.includes(${JSON.stringify('automatically sent')})`),language==='en');
      await screenshot(`v091-privacy-${language}-${width}`);
      await evaluate('document.querySelector("#privacy-dialog .dialog-back").id="test-about-back"');await click('test-about-back');
      assert.equal(await evaluate('document.getElementById("menu-dialog").open'),true);
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await waitFor('!document.querySelector("dialog[open]")');
      assert.equal(requestUrls.slice(begin).some(url=>/^https?:\/\/(?:t\.me|twitch\.tv|lura\.asgard\.website|github\.com|www\.paypal\.com|phantom\.com)/.test(url)),false,'About has no embedded provider requests');
    }
  }
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await navigate();await click('fullscreen-button');await click('menu-button');
  await evaluate(`document.querySelector('#menu-dialog [data-about-open=about-dialog]').id='test-fullscreen-about'`);
  await click('test-fullscreen-about');
  assert.equal(await evaluate('!!document.fullscreenElement&&document.getElementById("about-dialog").open'),true);
  await screenshot('v091-about-fullscreen');
  await evaluate('document.querySelector("#about-dialog [data-close]").id="test-about-close"');await click('test-about-close');
  await click('fullscreen-button');
  // The standalone notice stays available with scripting disabled.
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await call('Page.navigate',{url:origin+'/privacy.html'});await sleep(300);
  assert.equal(await evaluate('document.querySelectorAll("script").length'),0);
  assert.equal(await evaluate('!!document.getElementById("english")&&!!document.getElementById("deutsch")'),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await screenshot('v091-standalone-privacy');
  await call('Emulation.setScriptExecutionDisabled',{value:false});await navigate();
  console.log('PASS MiniZap About/privacy navigation, languages, wallet wrapping, fullscreen, no embeds and standalone notice');

  // Translated menus must keep header controls separate and labels inside their cards.
  for(const [width,height] of [[320,568],[390,844],[667,375],[932,430],[1280,900]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
    await sleep(100);
    const toolsBounds=await evaluate(`(() => {
      const tools=document.getElementById('compact-tools'), r=tools.getBoundingClientRect();
      return r.left>=0&&r.right<=innerWidth&&tools.scrollWidth<=tools.clientWidth;
    })()`);
    assert.equal(toolsBounds,true,`Flight toolbar fits ${width}x${height}`);
    for(const language of ['de','en']) {
      await evaluate(`document.querySelector('#menu-dialog [data-language=${language}]').click()`);
      for(const id of ['start-dialog','menu-dialog','workshop-dialog','talent-sheet','scores-dialog','statistics-dialog','achievements-dialog','cosmetics-dialog','help-dialog','replay-dialog','install-dialog','link-dialog','share-dialog','about-dialog','privacy-dialog']) {
        await evaluate(`(() => {document.querySelectorAll('dialog[open]').forEach(d=>d.close());
          document.querySelector('[data-open="${id}"]')?.click();
          if('${id}'==='talent-sheet')document.querySelector('[data-talent=armor]').click();
          const d=document.getElementById('${id}');if(!d.open)d.showModal();d.scrollTop=0;})()`);
        const failures=await evaluate(`(() => {
          const d=document.getElementById('${id}'), issues=[];
          if(d.scrollWidth>d.clientWidth+1)issues.push('horizontal overflow');
          const buttons=[...d.querySelectorAll('.dialog-toolbar button,.dialog-toolbar a')].filter(e=>e.getClientRects().length);
          for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
            const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect();
            if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)issues.push('overlapping '+buttons[i].textContent+' / '+buttons[j].textContent);
          }
          for(const e of d.querySelectorAll('.menu-items button,.cosmetic-card,.achievement-item,.catalog-name,.statistic')){
            if(e.getClientRects().length&&e.scrollWidth>e.clientWidth+1)issues.push('label overflow '+e.textContent);
          }
          return issues;
        })()`);
        assert.deepEqual(failures,[],`${id} ${language} ${width}x${height}`);
        if(['menu-dialog','workshop-dialog','share-dialog','cosmetics-dialog','about-dialog','privacy-dialog'].includes(id)&&[320,667,1280].includes(width))await screenshot(`menus-${language}-${width}-${id}`);
      }
    }
  }
  await evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('#menu-dialog [data-language=de]').click()");
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await navigate();
  console.log('PASS German/English menu controls and label bounds at five phone/desktop sizes');
  // The pilot licence is readable, reachable and links directly to the name field.
  for(const [width,height,language,method] of [[1280,900,'de','mouse'],[844,390,'en','mouse'],[740,320,'de','keyboard'],[320,740,'en','touch']]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:method==='touch'});
    await call('Emulation.setTouchEmulationEnabled',{enabled:method==='touch'});
    await evaluate(`localStorage.removeItem('kartoffelkanone.v2');localStorage.setItem('minizap.language','${language}')`);await navigate();
    await evaluate(`document.getElementById('menu-button').click();const input=document.getElementById('player-name');input.value='MMMMMMMMMMMMMMMMMMMMMMMM';input.dispatchEvent(new Event('input'));document.getElementById('menu-dialog').close()`);
    if(width!==1280)await click('fullscreen-button');
    assert.equal(await evaluate('document.getElementById("pilot-caption").textContent'),language==='de'?'Lizenz zum Knollen':'Licensed to spud');
    assert.equal(await evaluate('document.getElementById("pilot-name").textContent'),'MMMMMMMMMMMMMMMMMMMMMMMM');
    assert.equal(await evaluate(`(()=>{const e=document.getElementById('pilot-tag'),r=e.getBoundingClientRect(),field=document.getElementById('canvas-wrap').getBoundingClientRect(),play=document.getElementById('play-controls').getBoundingClientRect();return r.left>=field.left&&r.right<=field.right&&r.top>=field.top&&r.bottom<=field.bottom&&r.height>=44&&(r.right<=play.left||r.bottom<=play.top)&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e})()`),true,'Pilot tag fits without overlapping launch controls and is hit-testable');
    await screenshot('v081-pilot-'+language+'-'+width);
    if(method==='touch'){const at=await point('pilot-tag');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[at]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else if(method==='keyboard'){await evaluate('document.getElementById("pilot-tag").focus()');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});}
    else await click('pilot-tag');
    await waitFor('document.activeElement===document.getElementById("player-name")');
    assert.equal(await evaluate(`(()=>{const e=document.getElementById('player-name');return document.getElementById('menu-dialog').open&&e.selectionStart===0&&e.selectionEnd===e.value.length&&e.closest('.player-profile').classList.contains('name-highlight')})()`),true,'Menu highlights and selects the current name');
    await screenshot('v081-name-highlight-'+width);
    await call('Input.insertText',{text:'<b>Talente</b>'});
    assert.equal(await evaluate('document.getElementById("pilot-name").textContent'),'<b>Talente</b>');
    assert.equal(await evaluate('document.querySelector("#pilot-name b")'),null,'Player names remain plain text');
    assert.equal(await evaluate('document.querySelector(".player-profile").classList.contains("name-highlight")'),false);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).statistics.shots'),0,'Editing a name never fires');
    await evaluate('document.getElementById("menu-dialog").close()');
    if(width!==1280)await evaluate('document.exitFullscreen()');
    await navigate();assert.equal(await evaluate('document.getElementById("pilot-name").textContent'),'<b>Talente</b>');
  }
  await call('Emulation.setTouchEmulationEnabled',{enabled:false});
  await evaluate('localStorage.removeItem("kartoffelkanone.v2");localStorage.setItem("minizap.language","de")');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await navigate();
  console.log('PASS pilot licence DE/EN, long/plain names, fullscreen layouts, mouse/touch/Enter, selected/highlighted name editing, persistence and no accidental shots');

  // A single actual poll refreshes the homepage and menu and bundles new IDs.
  onlineEnabled=true;
  layoutFlights=Array.from({length:5},(_,i)=>({id:'base'+String(i).padStart(8,'0'),name:'Weltpilot '+i,distance:1000-i*100,created:Date.UTC(2026,9,2,12,34-i)}));
  const pollClock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.scorePollAdvance=0;const wallNow=Date.now.bind(Date),interval=window.setInterval.bind(window);Date.now=()=>wallNow()+window.scorePollAdvance;window.setInterval=(fn,delay,...args)=>interval(fn,delay===10000?100:delay,...args);`});
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await call('Emulation.setTimezoneOverride',{timezoneId:'Europe/Berlin'});
  const baselineRequests=leaderboardRequests;
  await navigate();await waitFor('document.querySelectorAll("#homepage-highscores li").length===5');
  assert.equal(leaderboardRequests,baselineRequests+1,'One shared initial request');
  assert.match(await evaluate('document.querySelector(".leaderboard-heading").textContent'),/WELTWEITE TOP 5/);
  assert.equal(await evaluate('document.querySelector("#homepage-highscores time").dateTime'),'2026-10-02T12:34:00.000Z');
  assert.equal(await evaluate('document.querySelector("#homepage-highscores time").textContent'),'02.10.26, 14:34');
  assert.equal(await evaluate('document.querySelectorAll("#homepage-highscores time").length'),5);
  assert.equal(await evaluate('document.getElementById("record-notice").hidden'),true,'Initial global scores stay silent');
  assert.equal(await evaluate('document.querySelectorAll("#homepage-highscores .score-name")[0].textContent'),'Weltpilot 0');
  await click('view-all-scores');
  await waitFor('document.querySelectorAll("#online-highscores li").length===5');
  assert.equal(await evaluate('document.getElementById("scores-dialog").open&&!document.getElementById("global-scores").hidden'),true,'Homepage opens the global list directly');
  assert.equal(await evaluate('document.querySelector("#online-highscores time").dateTime'),'2026-10-02T12:34:00.000Z');
  await evaluate('document.querySelector("[data-score-scope=local]").click();document.getElementById("scores-dialog").close();document.getElementById("view-all-scores").focus()');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await evaluate('document.getElementById("scores-dialog").open&&!document.getElementById("global-scores").hidden'),true,'Keyboard link activation resets a previously local view to global');
  await screenshot('v083-dated-global-list');
  assert.equal(leaderboardRequests,baselineRequests+1,'Opening menu uses the same cached snapshot');
  await evaluate('document.getElementById("scores-dialog").close()');await click('fullscreen-button');
  await evaluate(`window.noticeShows=0;new MutationObserver(records=>{for(const r of records)if(r.attributeName==='hidden'&&!r.target.hidden)window.noticeShows++}).observe(document.getElementById('record-notice'),{attributes:true});`);
  layoutFlights=[{id:'news00000001',name:'<b>Max</b>',distance:4200.5},{id:'news00000002',name:'Neue Knolle',distance:3800},...layoutFlights];
  await evaluate('window.scorePollAdvance+=10000');
  await waitFor('!document.getElementById("record-notice").hidden');
  assert.equal(await evaluate('document.querySelectorAll(".record-notice:not([hidden])").length'),1);
  assert.equal(await evaluate('document.getElementById("record-notice").querySelector("p").children.length'),0,'Names never become HTML in notices');
  assert.match(await evaluate('document.getElementById("record-notice").textContent'),/<b>Max<\/b>.*4[.]200,5/);
  assert.match(await evaluate('document.getElementById("record-notice").querySelector("small").textContent'),/noch eine/);
  assert.equal(await evaluate('document.querySelector("#homepage-highscores .score-name").textContent'),'<b>Max</b>');
  for(const [width,height] of [[1280,900],[844,390],[320,740]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(100);
    assert.equal(await evaluate(`(()=>{const n=document.getElementById('record-notice'),r=n.getBoundingClientRect(),f=document.getElementById('canvas-wrap').getBoundingClientRect(),p=document.getElementById('play-controls').getBoundingClientRect();return !n.hidden&&r.left>=f.left&&r.right<=f.right&&r.top>=f.top&&r.bottom<=p.top&&getComputedStyle(n).pointerEvents==='none'&&n.scrollWidth<=n.clientWidth})()`),true,`Notice fits fullscreen without covering launch controls ${width}x${height}`);
    await screenshot(`v080-record-notice-${width}`);
  }
  await click('menu-button');await evaluate('document.querySelector("#menu-dialog [data-language=en]").click();document.getElementById("menu-dialog").close()');
  assert.match(await evaluate('document.getElementById("record-notice").querySelector("p").textContent'),/<b>Max<\/b>.*4,200.5/);
  const nextRequests=leaderboardRequests;
  await evaluate('window.scorePollAdvance+=10000');
  await waitFor(`document.getElementById('homepage-score-status').hidden`);await sleep(250);
  assert.ok(leaderboardRequests>nextRequests);
  assert.equal(await evaluate('window.noticeShows'),1,'Unchanged ranking does not reannounce or stack notices');
  await waitFor('document.getElementById("record-notice").hidden',6500);
  await click('fullscreen-button');
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:pollClock.identifier});
  layoutFlights=null;onlineEnabled=false;
  await evaluate('localStorage.setItem("minizap.language","de")');await navigate();
  console.log('PASS homepage global Top 5, shared ten-second polling, silent baseline, one burst notice, plain-text names, DE/EN and fullscreen layout');

  // The brand has two colors in each exported layout, with a valid pixel proof.
  for(const language of ['de','en']){
    await click('menu-button');await evaluate(`document.querySelector('#menu-dialog [data-language=${language}]').click();document.getElementById('menu-dialog').close()`);
    for(const aspect of [3.5,2.4,1.4,.75]){
      const ranks=aspect>1.6?{local:{rank:2,outside:false},global:{rank:1,status:'confirmed'}}:aspect<.95?{local:{rank:1,outside:false},global:{rank:3,status:'provisional'}}:{local:{rank:null,outside:true},global:{rank:25001,status:'comparison'}};
      const report=await evaluate(`(async()=>{
        const {createShareCard}=await import('./src/share-card.mjs'),{createFlight,stepFlight}=await import('./src/physics.mjs'),{extractProof,verifyProof}=await import('./shared/share-proof.mjs');
        const f=createFlight({angle:45,energy:70},{},{seed:42,traffic:false});while(!f.ended)stepFlight(f);
        const drawn=[],original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,...args){const m=this.getTransform();if(this.canvas!==document.getElementById('game'))drawn.push({value:String(value),font:this.font,x:m.a*args[0]+m.c*args[1]+m.e,y:m.b*args[0]+m.d*args[1]+m.f});return original.call(this,value,...args)};
        let blob;try{blob=await createShareCard({screenshot:document.getElementById('game'),flight:f,best:f.distance,level:4,ranks:${JSON.stringify(ranks)},aspect:${aspect}})}finally{CanvasRenderingContext2D.prototype.fillText=original}
        const bytes=await blob.arrayBuffer(),proof=extractProof(bytes),bitmap=await createImageBitmap(blob);
        const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();
        const title=ctx.getImageData(28,${aspect>1.6?5:20},900,${aspect>1.6?48:90}).data;let cream=0,orange=0;
        for(let i=0;i<title.length;i+=4){if(title[i]===255&&title[i+1]===243&&title[i+2]===220)cream++;if(title[i]===190&&title[i+1]===101&&title[i+2]===76)orange++;}
        const check=verifyProof(proof,ctx.getImageData(0,0,canvas.width,proof.protectedHeight).data);
        const png=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob)});
        return {cream,orange,values:check.values,pixels:check.pixels,png,ranks:JSON.parse(proof.data).ranks,drawn};
      })()`);
      assert.ok(report.cream>40&&report.orange>40,`Two-color ${language} brand at aspect ${aspect}`);
      assert.equal(report.values,true);assert.equal(report.pixels,true);assert.deepEqual(report.ranks,ranks);
      const line=report.drawn.map(d=>d.value).join(' ');assert.match(line,language==='de'?/Lokal.*Weltweit/:/Local.*Global/);
      if(aspect>1.6)assert.match(line,/#2.*#1/);else if(aspect<.95)assert.match(line,/#1.*#3/);else assert.match(line,/>5.*#25[.,]001/);
      const rankLabels=report.drawn.filter(d=>['Lokal ','Weltweit ','Local ','Global '].includes(d.value));assert.equal(rankLabels.length,2);assert.equal(rankLabels[0].y,rankLabels[1].y,'Both ranks share one compact row');
      assert.ok(report.drawn.every(d=>d.x>=0&&d.x<=1200&&d.y>=0&&d.y<=Math.round(1200/aspect)),'Card text stays inside export');
      await writeFile(join(screenshots,`v080-brand-${language}-${aspect}.png`),Buffer.from(report.png,'base64'));
    }
  }
  await click('menu-button');await evaluate('document.querySelector("#menu-dialog [data-language=de]").click();document.getElementById("menu-dialog").close()');
  console.log('PASS two-color share-card brand in DE/EN and wide/standard/portrait layouts, with valid values/pixel proofs');

  // Real settled flights show independent local/global ranks and compact podium styling.
  const rankSeed=await call('Page.addScriptToEvaluateOnNewDocument',{source:'crypto.getRandomValues=a=>{a.fill(42);return a;}'});
  onlineEnabled=true;
  for(const [local,global,width,height,language] of [[1,3,1366,768,'de'],[2,2,844,390,'de'],[3,1,320,740,'en'],[6,23,1280,800,'de']]){
    layoutRank={rank:global,total:30};holdRank=local===6;
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await evaluate(`(async()=>{const {freshProgress}=await import('./src/progress.mjs');const p=freshProgress();p.scores=Array.from({length:${local-1}},()=>({distance:900000,level:'ground'}));localStorage.setItem('kartoffelkanone.v2',JSON.stringify(p));localStorage.removeItem('minizap.record-sync.v1');localStorage.setItem('minizap.language','${language}')})()`);
    await navigate();
    if(width<1000)await click('fullscreen-button');
    await evaluate(`import('./src/physics.mjs').then(({FixedClock})=>{const advance=FixedClock.prototype.advance;FixedClock.prototype.advance=function(dt,step){return advance.call(this,dt,step,8)}})`);
    await evaluate('window.realNow=performance.now.bind(performance);performance.now=()=>1000');
    const at=await press('launch-button');await evaluate('performance.now=()=>1413');await release(at);await evaluate('performance.now=window.realNow');
    await waitFor('!document.getElementById("result").hidden',25000);
    if(holdRank){
      await click('share-result');await waitFor('!document.getElementById("download-share").hidden');
      const before=await evaluate(`(async()=>{const {extractProof}=await import('./src/share-proof.mjs');const url=document.getElementById('download-share').href,blob=await(await fetch(url)).blob();return {url,ranks:JSON.parse(extractProof(await blob.arrayBuffer()).data).ranks}})()`);
      assert.deepEqual(before.ranks.global,{rank:null,status:'loading'},'Pending global rank is never invented');
      holdRank=false;rankResponses.splice(0).forEach(respond=>respond());
      await waitFor(`!document.getElementById('download-share').hidden&&document.getElementById('download-share').href!==${JSON.stringify(before.url)}`);
      const after=await evaluate(`(async()=>{const {extractProof}=await import('./src/share-proof.mjs');const blob=await(await fetch(document.getElementById('download-share').href)).blob();return JSON.parse(extractProof(await blob.arrayBuffer()).data).ranks})()`);
      assert.deepEqual(after,{local:{rank:null,outside:true},global:{rank:global,status:'comparison'}},'Late rank response redraws the open PNG with the same flight snapshot');
      await evaluate('document.getElementById("share-dialog").close()');
    }
    await waitFor(`document.querySelector('[data-result-rank="global"] strong').textContent.includes('${global}')`);
    assert.equal(await evaluate(`document.querySelector('[data-result-rank="local"] strong').textContent`),local===6?'> 5':(language==='de'?'Platz ':'Place ')+local);
    if(local===1)await waitFor(`document.querySelector('[data-result-rank="global"]>span:last-child').textContent==='Bestätigt'`);
    else assert.equal(await evaluate(`document.querySelector('[data-result-rank="global"]>span:last-child').textContent`),language==='de'?'Vergleich':'Comparison');
    for(const [scope,position] of [['local',local],['global',global]])assert.equal(await evaluate(`document.querySelector('[data-result-rank="${scope}"]').classList.contains('podium-${position}')`),position<=3);
    await screenshot('v080-result-ranks-'+local+'-'+global+'-'+width);
    assert.equal(await evaluate(`(()=>{const d=document.getElementById('result'),r=d.getBoundingClientRect();return d.scrollWidth<=d.clientWidth&&d.scrollHeight<=d.clientHeight&&[...document.querySelectorAll('.result-rank')].every(el=>{const a=el.getBoundingClientRect();return a.left>=r.left&&a.right<=r.right&&el.scrollWidth<=el.clientWidth})})()`),true,'Rank pills fit result without overlap or scrolling');
    await screenshot('v080-result-ranks-'+local+'-'+global+'-'+width);
    await click('share-result');await waitFor('!document.getElementById("download-share").hidden');
    const exported=await evaluate(`(async()=>{const {extractProof}=await import('./src/share-proof.mjs');const blob=await(await fetch(document.getElementById('download-share').href)).blob();return JSON.parse(extractProof(await blob.arrayBuffer()).data).ranks})()`);
    assert.deepEqual(exported.local,{rank:local===6?null:local,outside:local===6});assert.equal(exported.global.rank,global);assert.equal(exported.global.status,local===1?'confirmed':'comparison');
    await screenshot('v082-result-card-'+width);await evaluate('document.getElementById("share-dialog").close()');
    if(width<1000)await evaluate('document.exitFullscreen()');
  }
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:rankSeed.identifier});
  layoutRank=null;onlineEnabled=false;
  await evaluate('localStorage.removeItem("kartoffelkanone.v2");localStorage.removeItem("minizap.record-sync.v1");localStorage.setItem("minizap.language","de")');await navigate();
  console.log('PASS result local/global ranks, three trophy colors, beyond top20 and responsive result layouts');

  // Peak reversal and lost capture must never swallow a completed release.
  const releaseSeed=await call('Page.addScriptToEvaluateOnNewDocument',{source:'crypto.getRandomValues=a=>{a.fill(42);return a;}'});
  for(const kind of ['mouse','touch','keyboard'])for(const target of kind==='keyboard'?['launch-button']:['launch-button','game'])for(const milliseconds of [1649,1650,1651])for(const lostCapture of kind==='keyboard'?[false]:[false,true]){
    await call('Emulation.setDeviceMetricsOverride',{width:kind==='touch'?844:1280,height:kind==='touch'?390:800,deviceScaleFactor:1,mobile:kind==='touch'});
    await call('Emulation.setTouchEmulationEnabled',{enabled:kind==='touch'});
    await evaluate('localStorage.removeItem("kartoffelkanone.v2")');await navigate();await sleep(100);
    await evaluate(`window.realNow=performance.now.bind(performance);performance.now=()=>1000;window.heldPointer=null;window.captureLost=false;document.addEventListener('pointerdown',e=>window.heldPointer=e.pointerId,{once:true});document.addEventListener('lostpointercapture',()=>window.captureLost=true,{once:true});`);
    const at=await point(target),outside=kind==='mouse'?{x:20,y:30}:{x:40,y:160};
    if(kind==='keyboard'){
      await evaluate('document.getElementById("launch-button").focus()');
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
    }else if(kind==='touch'){
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[at]});
      await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:at.x+1,y:at.y}]});
    }else{
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',...at});
      await call('Input.dispatchMouseEvent',{type:'mousePressed',...at,button:'left',buttons:1,clickCount:1});
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',...at,buttons:1});
    }
    assert.equal(await evaluate('document.body.classList.contains("is-charging")'),true);
    if(lostCapture){
      await evaluate(`document.getElementById('${target}').releasePointerCapture(window.heldPointer)`);
      if(kind==='touch')await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[outside]});
      else await call('Input.dispatchMouseEvent',{type:'mouseMoved',...outside,buttons:1});
      await evaluate(`document.getElementById('${target}').dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true,pointerId:window.heldPointer}))`);
      assert.equal(await evaluate('window.captureLost'),true);
      assert.equal(await evaluate('document.body.classList.contains("is-charging")'),true,'Lost capture keeps the active charge');
      // A different finger ending must not take over the held press.
      await evaluate('document.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:window.heldPointer+99}))');
      assert.equal(await evaluate('document.body.classList.contains("is-charging")'),true);
    }
    await evaluate(`performance.now=()=>${1000+milliseconds}`);
    if(kind==='keyboard')await call('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    else if(kind==='touch')await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    else await call('Input.dispatchMouseEvent',{type:'mouseReleased',...(lostCapture?outside:at),button:'left',buttons:0,clickCount:1});
    await evaluate('performance.now=window.realNow;delete window.realNow');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).statistics.shots'),1,`${kind} ${target} release at ${milliseconds}ms, lostCapture=${lostCapture} fires once`);
    assert.equal(await evaluate('document.body.classList.contains("is-charging")'),false);
    await evaluate('document.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:window.heldPointer}))');
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).statistics.shots'),1,'Repeated release cannot shoot twice');
  }
  // Explicit pointer cancellation still suppresses the later matching release.
  await call('Emulation.setTouchEmulationEnabled',{enabled:false});
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await evaluate('localStorage.removeItem("kartoffelkanone.v2")');await navigate();await sleep(150);
  await evaluate('window.heldPointer=null;document.addEventListener("pointerdown",e=>window.heldPointer=e.pointerId,{once:true})');
  const canceledAt=await press('launch-button');
  await evaluate('document.dispatchEvent(new PointerEvent("pointercancel",{bubbles:true,pointerId:window.heldPointer}))');
  await release(canceledAt);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2"))?.statistics.shots||0'),0,'Explicit cancel is not a completed shot');
  assert.equal(await evaluate('document.body.classList.contains("is-charging")'),false);
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:releaseSeed.identifier});
  await call('Emulation.setTouchEmulationEnabled',{enabled:false});
  await evaluate('localStorage.removeItem("kartoffelkanone.v2")');
  console.log('PASS mouse/touch/keyboard peak releases, capture loss, release outside button, foreign pointers and no duplicate shots');

  // A real launch failure, including the first-install prompt, fits browser play.
  const menuRiskSeed=await call('Page.addScriptToEvaluateOnNewDocument',{source:'crypto.getRandomValues=a=>{a.fill(42);return a;}'});
  for(const language of ['de','en'])for(const [width,height] of [[1366,768],[1024,768],[1440,900]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await evaluate(`localStorage.removeItem('kartoffelkanone.v2');localStorage.removeItem('minizap.install-suggested');localStorage.setItem('minizap.language', '${language}')`);
    await navigate();
    assert.equal(await evaluate('document.body.classList.contains("compact-play")||!!document.fullscreenElement'),false);
    await evaluate('window.realNow=performance.now.bind(performance);performance.now=()=>1000');
    const at=await press('launch-button');await evaluate('performance.now=()=>2650');await release(at);
    await evaluate('performance.now=window.realNow;delete window.realNow');
    await waitFor('!document.getElementById("result").hidden');
    assert.equal(await evaluate('document.getElementById("install-nudge").hidden'),false,'Include first-run installation nudge');
    assert.equal(await evaluate(`(()=>{const d=document.getElementById('result'),r=d.getBoundingClientRect(),field=document.getElementById('canvas-wrap').getBoundingClientRect();return d.scrollHeight<=d.clientHeight&&d.scrollWidth<=d.clientWidth&&r.top>=field.top&&r.bottom<=field.bottom&&field.top>=0&&field.bottom<=innerHeight&&[...d.querySelectorAll('button')].filter(b=>b.getClientRects().length).every(b=>{const t=b.getBoundingClientRect();return t.top>=r.top&&t.bottom<=r.bottom})})()`),true,`Entire ${language} death screen fits browser field without scrolling at ${width}x${height}`);
    await screenshot(`v074-browser-death-${language}-${width}`);await click('close-result');
  }
  await evaluate('localStorage.removeItem("kartoffelkanone.v2");localStorage.setItem("minizap.language","de")');
  console.log('PASS browser death screens including install prompt fit the taller playable area without scrolling in DE/EN');

  // Mouse controls remain reachable after settlement, including native fullscreen.
  for(const [width,height] of [[1280,800],[844,390],[320,740]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await navigate();await click('fullscreen-button');await sleep(100);
    assert.equal(await evaluate(`([...document.querySelectorAll('#compact-tools button')].every(b=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b}))`),true,'No invisible modal blocks fullscreen input immediately after entry');
    await click('menu-button');assert.equal(await evaluate('document.getElementById("menu-dialog").open'),true);
    await evaluate('document.getElementById("menu-dialog").close()');
    await evaluate('window.realNow=performance.now.bind(performance);performance.now=()=>1000');
    const at=await press('launch-button');
    assert.equal(await evaluate('document.body.classList.contains("is-charging")'),true,'Mouse starts the game after fullscreen entry');
    await evaluate('performance.now=()=>2650');await release(at);
    await evaluate('performance.now=window.realNow;delete window.realNow');
    await waitFor('!document.getElementById("result").hidden');
    assert.equal(await evaluate('document.getElementById("game").inert'),true,'Result blocks game input');
    assert.equal(await evaluate(`(()=>{const result=document.getElementById('result').getBoundingClientRect(),tools=document.getElementById('compact-tools').getBoundingClientRect();return result.top>tools.bottom&&result.bottom<=innerHeight&&[...document.querySelectorAll('#compact-tools button')].every(b=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b})})()`),true,`Result leaves every toolbar button visible and hit-testable at ${width}x${height}`);
    for(const id of ['sound-button','music-button']){
      const before=await evaluate(`document.getElementById('${id}').getAttribute('aria-pressed')`);
      await click(id);assert.notEqual(await evaluate(`document.getElementById('${id}').getAttribute('aria-pressed')`),before);
      await click(id);
    }
    await screenshot(`v073-fullscreen-result-${width}`);
    await click('workshop-button');assert.equal(await evaluate('document.getElementById("workshop-dialog").open'),true);
    await evaluate('document.getElementById("workshop-dialog").close()');
    await click('menu-button');assert.equal(await evaluate('document.getElementById("menu-dialog").open'),true);
    await evaluate('document.getElementById("menu-dialog").close()');
    await click('fullscreen-button');assert.equal(await evaluate('document.getElementById("result").hidden'),false,'Exiting fullscreen preserves result');
    await click('close-result');assert.equal(await evaluate('document.getElementById("game").inert'),false);
  }
  await evaluate('localStorage.removeItem("kartoffelkanone.v2")');
  console.log('PASS mouse access to fullscreen toolbar before/after flight, audio toggles, talents, menu and fullscreen exit');

  // Denied fullscreen restores a usable menu rather than leaving the game blocked.
  await navigate();await click('menu-button');
  await evaluate(`{const panel=document.getElementById('flight-panel');window.originalFullscreen=panel.requestFullscreen;panel.requestFullscreen=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));}`);
  const deniedAt=await point('fullscreen-button');
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...deniedAt});
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...deniedAt,button:'left',clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',...deniedAt,button:'left',clickCount:1});
  await waitFor('!document.getElementById("toast").hidden');
  assert.equal(await evaluate('document.getElementById("menu-dialog").open&&!document.fullscreenElement'),true,'Denied fullscreen restores the menu');
  await evaluate('document.getElementById("flight-panel").requestFullscreen=window.originalFullscreen;document.getElementById("menu-dialog").close()');
  await click('fullscreen-button');await click('fullscreen-button');
  console.log('PASS denied fullscreen restores the menu and a subsequent real fullscreen entry/exit stays interactive');

  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:menuRiskSeed.identifier});

  // Inspect the global ranking with twenty entries through the actual fullscreen menu control.
  onlineEnabled=true;
  layoutFlights=Array.from({length:20},(_,index)=>({id:'test'+String(index).padStart(8,'0'),name:index===0?'MMMMMMMMMMMMMMMMMMMMMMMM':index===1?'<b>Player</b>':'Pilot '+(index+1),distance:3464.6-index*101.1,created:Date.UTC(2026,9,2,12,34-index)}));
  for(const [width,height] of [[1280,800],[844,390],[740,320],[320,740]]){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
    await navigate();await click('fullscreen-button');
    for(const language of ['de','en']){
      await click('menu-button');
      await evaluate(`document.querySelector('#menu-dialog [data-language=${language}]').click()`);
      assert.equal(await evaluate('document.querySelectorAll(".language-switch").length'),1,'Only the main menu offers language selection');
      assert.equal(await evaluate('document.querySelector("#fullscreen-button").getAttribute("aria-pressed")'),'true');
      assert.equal(await evaluate(`(()=>{const settings=document.querySelector('.menu-settings').getBoundingClientRect(),items=document.getElementById('menu-items').getBoundingClientRect();return settings.bottom<items.top&&[...document.querySelectorAll('.menu-settings button')].filter(b=>b.getClientRects().length).every(b=>{const r=b.getBoundingClientRect();return r.left>=settings.left&&r.right<=settings.right&&r.top>=settings.top&&r.bottom<=settings.bottom})})()`),true,'Install/fullscreen buttons fit in their settings row');
      await screenshot(`v072-fullscreen-${language}-${width}-menu`);
      await evaluate('document.querySelector("[data-open=scores-dialog]").click()');
      await waitFor('document.querySelectorAll("#online-highscores li").length===20');
      assert.equal(await evaluate('!document.getElementById("global-scores").hidden&&document.getElementById("local-scores").hidden'),true,'Global leaderboard opens by default');
      assert.equal(await evaluate('document.querySelectorAll("#online-highscores .score-name > *").length'),0,'Player names stay plain text');
      assert.equal(await evaluate(`(()=>{const d=document.getElementById('scores-dialog'),list=document.getElementById('online-highscores');return d.scrollWidth<=d.clientWidth&&list.scrollWidth<=list.clientWidth&&[...list.children].every(li=>{const a=li.querySelector('.score-name').getBoundingClientRect(),b=li.querySelector('.score-distance').getBoundingClientRect(),c=li.querySelector('button').getBoundingClientRect();return a.right<=b.left&&b.right<=c.left&&li.scrollWidth<=li.clientWidth&&li.scrollHeight<=li.clientHeight})})()`),true,'Global ranks, long names, distances and replay controls stay separate');
      await screenshot(`v072-fullscreen-${language}-${width}-global`);
      await evaluate('document.querySelector("#online-highscores li:last-child button").scrollIntoView({block:"nearest"})');
      assert.equal(await evaluate('(()=>{const r=document.querySelector("#online-highscores li:last-child button").getBoundingClientRect(),d=document.getElementById("scores-dialog").getBoundingClientRect();return r.top>=d.top&&r.bottom<=d.bottom})()'),true,'Last global score is reachable');
      await evaluate('document.querySelector("[data-score-scope=local]").click()');
      assert.equal(await evaluate('document.getElementById("global-scores").hidden&&!document.getElementById("local-scores").hidden'),true);
      await evaluate('document.querySelector("#scores-dialog .dialog-back").click();document.querySelector("[data-open=scores-dialog]").click()');
      assert.equal(await evaluate('document.querySelector("[data-score-scope=global]").getAttribute("aria-pressed")'),'true','Reopening resets to global');
      await evaluate('document.querySelector("#scores-dialog .dialog-back").click();document.querySelector("[data-open=workshop-dialog]").click()');
      await screenshot(`v072-fullscreen-${language}-${width}-talents`);
      assert.equal(await evaluate('document.querySelectorAll("#talent-tree .talent-node").length'),12);
      assert.equal(await evaluate('(()=>{const d=document.getElementById("workshop-dialog");return d.scrollHeight<=d.clientHeight&&d.scrollWidth<=d.clientWidth&&[...d.querySelectorAll(".talent-node")].every(n=>n.getBoundingClientRect().height>=44)})()'),true,`All twelve compact talent targets fit ${language} ${width}x${height}`);
      if(width===1280)assert.ok(await evaluate('document.getElementById("workshop-dialog").getBoundingClientRect().height<500'),'Talent grid does not fill a tall viewport');
      await evaluate('document.getElementById("workshop-dialog").close()');
    }
    await click('fullscreen-button');
  }
  layoutFlights=null;onlineEnabled=false;
  await evaluate('document.querySelector("#menu-dialog [data-language=de]").click()');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await navigate();
  console.log('PASS fullscreen global/default/device rankings, twenty long-name scores, main-menu settings and compact talents in DE/EN');


  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  assert.equal(await evaluate(`document.fonts.check('24px Bangers', 'ÄÖÜ äöü ß') && document.fonts.check('16px "Comic Neue"') && document.fonts.check('700 16px "Comic Neue"')`), true);
  assert.match(await evaluate('getComputedStyle(document.querySelector("h1")).fontFamily'), /Bangers/);
  assert.equal(await evaluate('document.getElementById("workshop-panel").getBoundingClientRect().height'),0);
  assert.equal(await evaluate('document.querySelector("main #workshop-panel")'),null);
  await screenshot('v7-comic-desktop');
  assert.equal(await evaluate('document.querySelectorAll("input[type=range]").length'), 0);
  assert.equal(await evaluate('document.getElementById("velocity").textContent.trim()'), '0 m/s');
  // Digit boundaries must not move telemetry labels or replace their DOM nodes.
  assert.equal(await evaluate(`(() => {
    const nodes = [...document.querySelectorAll('.flight-hud .hud-number')];
    const labels = [...document.querySelectorAll('.flight-hud > div > span')];
    const positions = labels.map(n => n.getBoundingClientRect().x);
    const previous = nodes.map(n => n.textContent);
    for (const value of ['9,9', '10,0', '999,9', '1.000,0', '99.999,9']) {
      nodes.forEach(n => { n.textContent = value; });
      if (labels.some((n, i) => n.getBoundingClientRect().x !== positions[i])) return false;
    }
    nodes.forEach((n, i) => { n.textContent = previous[i]; });
    return true;
  })()`), true);
  await click('help-button'); assert.equal(await evaluate('document.getElementById("help-dialog").open'), true); await click('help-ready');
  await click('cosmetics-button');await evaluate('document.querySelector("[data-cosmetic-category=scenes]").click();document.querySelector("[data-scene=classic]").click();document.getElementById("cosmetics-dialog").close()');
  await sleep(100); await screenshot('v2-desktop-classic');
  await navigate(); assert.equal(await evaluate('document.documentElement.dataset.theme'), 'classic');
  await click('cosmetics-button');await evaluate('document.querySelector("[data-cosmetic-category=scenes]").click();document.querySelector("[data-scene=junk]").click();document.getElementById("cosmetics-dialog").close()');
  console.log('PASS desktop, 12 talent nodes, no numeric shooting controls, both styles and style persistence');
  await click('help-button');
  await waitFor(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.context?.state==='running'&&gameAudio.musicTimer!==null})()`);
  await click('music');
  assert.equal(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.musicTimer===null})()`),true);
  await click('help-ready');await click('sound-button');
  assert.equal(await evaluate('document.getElementById("sound-button").getAttribute("aria-pressed")'),'false');
  await navigate();
  assert.equal(await evaluate('document.getElementById("music").checked'),false);
  assert.equal(await evaluate('document.getElementById("sound-button").getAttribute("aria-pressed")'),'false');
  assert.equal(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.context===null})()`),true);
  await click('sound-button');await click('help-button');await click('music');await click('help-ready');
  await waitFor(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.musicTimer!==null})()`);
  await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');gameAudio.play('pickup');})()`);
  assert.ok(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.played>0&&gameAudio.voices.size<=19})()`));
  await click('sound-button');
  assert.equal(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return !gameAudio.enabled&&gameAudio.musicTimer!==null&&gameAudio.musicGain.gain.value>0&&gameAudio.effectsGain.gain.value===0})()`),true);
  await click('music-button');
  assert.equal(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.musicTimer===null&&gameAudio.musicVoices.size===0})()`),true);
  await click('sound-button');
  assert.equal(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.enabled&&gameAudio.musicTimer===null})()`),true);
  await click('music-button');
  assert.equal(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');const starts=gameAudio.musicStarts,timer=gameAudio.musicTimer;for(let i=0;i<20;i++){gameAudio.unlock();gameAudio.setMusicEnabled(true);}await new Promise(r=>setTimeout(r,150));return gameAudio.musicStarts===starts&&gameAudio.musicTimer===timer;})()`),true);
  console.log('PASS independent music/effects buttons, mute persistence and one music scheduler after repeated starts');


  let at = await press('launch-button'); await sleep(400);
  assert.equal(await evaluate('document.body.classList.contains("is-charging")'), true);
  assert.equal(await evaluate('document.getElementById("distance").textContent.trim()'), '0,0 m');
  await release(at);
  await sleep(150);
  assert.ok(await evaluate('Number(document.querySelector("#velocity .hud-number").textContent.replaceAll(".", "")) > 0'));
  assert.equal(await evaluate('document.body.classList.contains("is-flying")'), true);
  assert.equal(await evaluate('document.getElementById("boost-count").textContent'), '2');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, autoRepeat: true });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  assert.equal(await evaluate('document.getElementById("boost-count").textContent'), '1', 'Space boosts exactly once, not on autorepeat or release');
  await click('help-button');
  const pausedDistance = await evaluate('document.getElementById("distance").textContent'); await sleep(350);
  assert.equal(await evaluate('document.getElementById("distance").textContent'), pausedDistance);
  await click('help-ready');
  await evaluate(`import('./src/physics.mjs').then(({FixedClock})=>{if(!FixedClock.prototype.testAdvance){FixedClock.prototype.testAdvance=FixedClock.prototype.advance;FixedClock.prototype.advance=function(dt,step){return this.testAdvance(dt,step,8)}}})`);
  await waitFor('!document.getElementById("result").hidden', 25000);
  const progress = await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2"))');
  assert.ok(progress.xp >= 30);
  assert.match(await evaluate('document.getElementById("result-xp").textContent'), /XP/);
  assert.ok(progress.material > 0); assert.ok(progress.attempts === 1);
  assert.ok(Number.isSafeInteger(progress.scores[0].created));assert.equal(await evaluate('document.querySelector("#dialog-highscores time").dateTime'),new Date(progress.scores[0].created).toISOString()); assert.ok(progress.achievements.includes('first'));
  assert.equal(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');const before=gameAudio.played;const save=localStorage.getItem('kartoffelkanone.v2');await new Promise(r=>setTimeout(r,1200));return before===gameAudio.played&&save===localStorage.getItem('kartoffelkanone.v2')&&gameAudio.musicTimer===null;})()`),true);
  await screenshot('v2-desktop-result');
  await evaluate('Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>false})');
  await click('share-result');await waitFor('!document.getElementById("download-share").hidden');
  assert.equal(await evaluate('document.getElementById("native-share").hidden'),true);
  const card=await evaluate(`(async()=>{const b=await (await fetch(document.getElementById('download-share').href)).blob();const bitmap=await createImageBitmap(b);const data=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(b)});return {type:b.type,width:bitmap.width,height:bitmap.height,data};})()`);
  assert.equal(card.type,'image/png');assert.equal(card.width,1200);assert.ok(card.height>=343&&card.height<=1600);
  await writeFile(join(screenshots,'v8-share-card.png'),Buffer.from(card.data.split(',')[1],'base64'));
  await screenshot('v8-share-preview');
  const proofCheck=await evaluate(`(async()=>{const {extractProof,verifyProof}=await import('./src/share-proof.mjs');const blob=await(await fetch(document.getElementById('download-share').href)).blob();const proof=extractProof(await blob.arrayBuffer());const bitmap=await createImageBitmap(blob);const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=proof.protectedHeight;const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);const original=verifyProof(proof,c.getImageData(0,0,1200,proof.protectedHeight).data);c.fillStyle='red';c.fillRect(50,100,30,30);const edited=verifyProof(proof,c.getImageData(0,0,1200,proof.protectedHeight).data);return {original,edited};})()`);
  assert.equal(proofCheck.original.values,true);assert.equal(proofCheck.original.pixels,true);assert.equal(proofCheck.edited.pixels,false);

  await evaluate('document.getElementById("share-dialog").close()');await sleep(50);
  await evaluate('Object.defineProperty(navigator,"canShare",{configurable:true,value:()=>true});Object.defineProperty(navigator,"share",{configurable:true,value:async(data)=>{window.sharedFile={name:data.files[0].name,type:data.files[0].type};throw new DOMException("Canceled","AbortError")}})');
  await click('share-result');await waitFor('!document.getElementById("native-share").hidden');await click('native-share');
  assert.equal(await evaluate('window.sharedFile.type'),'image/png');
  assert.match(await evaluate('window.sharedFile.name'),/^kartoffelkanone-\d+m\.png$/);
  assert.equal(await evaluate('document.getElementById("native-share").disabled'),false);
  await evaluate('Object.defineProperty(navigator,"share",{configurable:true,value:async()=>{throw new DOMException("Denied","NotAllowedError")}})');
  await click('native-share');assert.match(await evaluate('document.getElementById("share-status").textContent'),/PNG herunterladen/);
  await evaluate('Object.defineProperty(navigator,"share",{configurable:true,value:async()=>{window.shareSucceeded=true}})');
  await click('native-share');assert.equal(await evaluate('window.shareSucceeded'),true);
  await evaluate('document.getElementById("share-dialog").close()');await sleep(50);
  await evaluate('Object.defineProperty(navigator,"canShare",{configurable:true,value:data=>!data.files});Object.defineProperty(navigator,"share",{configurable:true,value:async data=>{window.linkShare=data}})');
  await click('share-result');await waitFor('!document.getElementById("native-share").hidden');await click('native-share');
  assert.ok(await evaluate('window.linkShare.url.includes("#flug=")&&!window.linkShare.files'),'Link sharing works without file support');
  await evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("unavailable")}}})');
  await click('copy-flight-link');assert.equal(await evaluate('document.getElementById("link-dialog").open'),true);
  assert.ok(await evaluate('document.getElementById("flight-link-text").value.includes("#flug=")'));
  await evaluate('document.getElementById("link-dialog").close()');
  console.log('PASS exported PNG, preview, share fallback, mocked native success, denial and cancellation');

  await release(at); assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).attempts'), 1);
  assert.equal(await evaluate('document.getElementById("compact-tools").inert'),false,'Result keeps toolbar accessible');
  assert.equal(await evaluate('document.getElementById("game").inert'),true,'Result still blocks gameplay');
  await click('menu-button');assert.equal(await evaluate('document.getElementById("menu-dialog").open'),true,'Menu remains accessible from result');
  await evaluate('document.getElementById("menu-dialog").close()');
  await click('close-result'); assert.equal(await evaluate('document.getElementById("phase-badge").textContent'), 'STARTKLAR');
  assert.equal(await evaluate('document.getElementById("compact-tools").inert'),false,'Closing restores controls');
  at = await press('launch-button'); await sleep(100);
  await evaluate('window.dispatchEvent(new Event("blur"))'); await release(at);
  assert.equal(await evaluate('document.getElementById("phase-badge").textContent'), 'STARTKLAR');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).attempts'), 1);
  await navigate(); assert.equal(await evaluate('document.getElementById("material").textContent'), String(progress.material));
  console.log('PASS hold/release, no early firing, pause, 8x flight, settlement, achievements, canceled hold and reload');

  await evaluate('localStorage.removeItem("kartoffelkanone.v2");localStorage.setItem("kartoffelkanone.v1",JSON.stringify({version:1,material:500,purchased:{armor:2},equipped:{armor:1},attempts:8,scores:[{distance:222,equipment:{armor:1},angle:38,energy:70}]}))');
  await navigate(); assert.equal(await evaluate('document.getElementById("material").textContent'), '500');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.armor'), 1);
  assert.equal(await evaluate('document.querySelectorAll("#buy-talent,#equip-talent,.refund-node,.node-level").length'),0);
  const rankClick=async(key,rank)=>evaluate(`document.querySelector('[data-talent="${key}"]').click();document.querySelector('#talent-detail [data-rank="${rank}"]').click()`);
  await click('workshop-button');
  await rankClick('rocket',1);assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.rocket'),0);
  for(const [key,rank] of [['pads',1],['pads',2],['springs',1],['springs',2]])await rankClick(key,rank);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.springs'),2);
  await rankClick('pads',2);
  assert.match(await evaluate('document.querySelector(".talent-hint").textContent'),/Zuerst/);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.springs'),2);
  await evaluate('document.querySelector("#talent-sheet .dialog-back").click()');await click('reset-talents');
  await rankClick('armor',1);await navigate();
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.armor'),1);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v1")).material'),500);
  await click('workshop-button');
  assert.equal(await evaluate('document.querySelectorAll(".talent-node").length'),12);
  await evaluate('document.querySelector("[data-talent=sail]").click()');
  assert.match(await evaluate('document.querySelector("#talent-detail [data-parent=wings]").textContent'),/Gleitflügel/);
  await evaluate('document.querySelector("#talent-detail [data-parent=wings]").click()');
  assert.equal(await evaluate('document.getElementById("talent-sheet-title").textContent'),'Gleitflügel');
  assert.equal(await evaluate('document.querySelectorAll("#talent-detail [data-rank]").length'),3);
  await screenshot('v15-talent-detail');
  await click('talent-close');
  assert.equal(await evaluate('document.getElementById("workshop-dialog").open&&!document.getElementById("talent-sheet").open&&!document.getElementById("menu-dialog").open'),true,'X returns from a prerequisite to the catalogue');
  assert.equal(await evaluate('document.activeElement.dataset.talent'),'wings');
  await evaluate('document.querySelector("[data-talent=armor]").click()');await click('talent-close');
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'),1,'Direct talent closes only one level');
  await evaluate('document.querySelector("[data-talent=sail]").click()');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate('document.getElementById("workshop-dialog").open&&!document.getElementById("talent-sheet").open'),true,'Escape follows the same hierarchy');
  await screenshot('v15-talent-catalog');
  await evaluate('document.getElementById("workshop-dialog").close()');
  console.log('PASS XP migration, direct point allocation, parent rank gates, protected dependent talents, reset and legacy save preservation');

  await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await evaluate('localStorage.clear()'); await navigate(); await sleep(200); await screenshot('v2-phone-landscape');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight'), true, 'Landscape must fit the viewport');
  const button = await evaluate('(()=>{const r=document.getElementById("launch-button").getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}})()');
  assert.ok(button.top >= 0 && button.bottom <= 390 && button.height >= 44);
  assert.ok(await evaluate('document.getElementById("game").getBoundingClientRect().height>=innerHeight-2'),'Canvas fills phone height');
  assert.equal(await evaluate('(()=>{const r=document.getElementById("game").getBoundingClientRect();return r.top===0&&r.left===0&&Math.abs(r.bottom-innerHeight)<1&&Math.abs(r.right-innerWidth)<1})()'),true,'Canvas reaches all four viewport edges');
  assert.equal(await evaluate('document.querySelectorAll("#workshop-button>svg").length'),1);
  assert.equal(await evaluate('document.getElementById("workshop-button").textContent.includes("⚙")'),false,'No second Unicode gear');
  assert.match(await evaluate('getComputedStyle(document.getElementById("workshop-button")).backgroundColor'),/^rgba?\(40, 35, 56/);
  assert.ok(await evaluate('new URL(document.querySelector("link[rel=stylesheet]").href).searchParams.get("v")===document.querySelector("meta[name=game-build]").content'));

  assert.equal(await evaluate('getComputedStyle(document.querySelector(".field-header")).display'), 'none');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".field-footer")).display'), 'none');
  assert.equal(await evaluate('Array.from(document.querySelectorAll(".compact-tools button")).every(b=>b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)'),true);
  await click('menu-button');assert.equal(await evaluate('document.getElementById("menu-dialog").open'),true);
  assert.equal(await evaluate('document.querySelectorAll("#menu-items [data-open]").length'),6);
  assert.equal(await evaluate('document.querySelector("#speed")'),null);
  await evaluate('(()=>{const input=document.getElementById("player-name");input.value="Lotte <3";input.dispatchEvent(new Event("input",{bubbles:true}));input.blur()})()');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).playerName'),'Lotte <3');
  assert.equal(await evaluate('(()=>{const a=document.querySelector("#menu-dialog .dialog-close").getBoundingClientRect(),b=document.getElementById("player-name").getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom})()'),true,'Name input does not overlap close button');
  await screenshot('v18-mobile-menu');

  assert.match(await evaluate('document.querySelector("[data-open=cosmetics-dialog]").textContent'),/Garderobe/);
  await evaluate('document.querySelector("[data-open=scores-dialog]").click()');
  assert.equal(await evaluate('document.getElementById("dialog-empty-scores").hidden'),false);
  await evaluate('document.querySelector("#scores-dialog .dialog-back").click()');

  await evaluate('document.querySelector("[data-close=menu-dialog]").click()');
  await click('fullscreen-button');await waitFor('!!document.fullscreenElement');
  await waitFor('(()=>{const r=document.getElementById("game").getBoundingClientRect();return r.top===0&&r.left===0&&Math.abs(r.bottom-innerHeight)<1&&Math.abs(r.right-innerWidth)<1})()');
  await screenshot('v11-fullscreen-edge-to-edge');
  await click('menu-button');assert.equal(await evaluate('document.getElementById("menu-dialog").open'),true);
  await click('fullscreen-button');await waitFor('!document.fullscreenElement');await sleep(100);
  // Direct touch hold aims and charges; cancellation never fires.
  const aimAt = await point('game');
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: aimAt.x, y: aimAt.y - 20 }] });
  await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: aimAt.x + 20, y: aimAt.y - 50 }] });
  assert.equal(await evaluate('document.body.classList.contains("is-charging")'),true);
  await call('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await evaluate('document.getElementById("phase-badge").textContent'), 'STARTKLAR');
  at = await point('launch-button');
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] }); await sleep(200);
  assert.equal(await evaluate('document.body.classList.contains("is-charging")'), true);
  await call('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await evaluate('document.getElementById("phase-badge").textContent'), 'STARTKLAR');
  at={x:aimAt.x,y:aimAt.y-20,id:0};
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] });await sleep(150);
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at,{x:at.x+70,y:at.y-20,id:1}] });await sleep(150);
  assert.equal(await evaluate('document.body.classList.contains("is-charging")'),true,'Second finger does not take over or release charging');
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await evaluate('document.body.classList.contains("is-flying")'), true);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).statistics.shots'),1,'Releasing multiple fingers creates one shot');
  assert.equal(await evaluate('(()=>{const r=document.getElementById("flight-actions").getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<2})()'),true,'Flight actions stay together at bottom center');
  const flightTap = await point('game');
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [flightTap] });
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await evaluate('document.getElementById("boost-count").textContent'), '1', 'A tap supplies one midair impulse');
  await screenshot('v3-mobile-flight-health');
  await click('flight-workshop'); assert.equal(await evaluate('document.getElementById("workshop-dialog").open'), true);
  await evaluate('document.querySelector("[data-talent=armor]").click()');
  assert.equal(await evaluate('document.querySelector("#talent-detail .talent-rank").getAttribute("aria-disabled")'),'true');
  const lockedPoints=await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.armor');
  await evaluate('document.querySelector("#talent-detail .talent-rank").click()');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.armor'),lockedPoints);
  const closeAt=await point('talent-close');
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[closeAt]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await evaluate('document.getElementById("workshop-dialog").open&&!document.getElementById("talent-sheet").open'),true);
  const talentPausedDistance=await evaluate('document.getElementById("distance").textContent');await sleep(200);
  assert.equal(await evaluate('document.getElementById("distance").textContent'),talentPausedDistance,'Flight remains paused after touch X');
  assert.equal(await evaluate('(()=>{const v=document.getElementById("network-viewport");return v.scrollWidth<=v.clientWidth&&v.scrollHeight<=v.clientHeight})()'),true,'All talents fit without scrolling');
  assert.equal(await evaluate('document.querySelectorAll("#talent-tree button").length'),12);
  await screenshot('v2-phone-talents');
  await evaluate('document.getElementById("workshop-dialog").close()');
  await evaluate(`import('./src/physics.mjs').then(({FixedClock})=>{if(!FixedClock.prototype.testAdvance){FixedClock.prototype.testAdvance=FixedClock.prototype.advance;FixedClock.prototype.advance=function(dt,step){return this.testAdvance(dt,step,8)}}})`);
  await waitFor('!document.getElementById("result").hidden', 25000); await screenshot('v2-phone-result');
  assert.equal(await evaluate('visualViewport.scale'),1,'Repeated control taps must not zoom the page');
  await click('share-result');
  try{await waitFor('!document.getElementById("download-share").hidden');}catch(error){
    console.error(await evaluate('JSON.stringify({open:document.getElementById("share-dialog").open,status:document.getElementById("share-status").textContent,full:!!document.fullscreenElement,resultHidden:document.getElementById("result").hidden})'),errors);
    await screenshot('v11-share-failure');throw error;
  }
  assert.equal(await evaluate('document.querySelector("#share-dialog .proof-note")'),null);
  assert.ok(await evaluate('document.querySelector("#share-dialog .share-actions").getBoundingClientRect().bottom<=document.getElementById("share-preview").getBoundingClientRect().top'));
  assert.ok(await evaluate('document.querySelector("#share-dialog h2").getBoundingClientRect().bottom<=document.getElementById("share-preview").getBoundingClientRect().top'),'Share title must not cover the card');
  await screenshot('v10-mobile-share');
  for(const [width,height] of [[667,375],[740,320],[924,412],[932,430],[390,844],[320,740]]){
    const oldUrl=await evaluate('document.getElementById("download-share").href');
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await waitFor(`!document.getElementById('download-share').hidden&&document.getElementById('download-share').href!==${JSON.stringify(oldUrl)}`,5000);
    const layout=await evaluate(`(async()=>{
      const img=document.getElementById('share-preview');await img.decode();const r=img.getBoundingClientRect();
      const scale=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight);
      const {extractProof,verifyProof}=await import('./src/share-proof.mjs');
      const blob=await(await fetch(document.getElementById('download-share').href)).blob(),proof=extractProof(await blob.arrayBuffer());
      const canvas=document.createElement('canvas');canvas.width=proof.width;canvas.height=proof.protectedHeight;const c=canvas.getContext('2d');c.drawImage(img,0,0);
      return {coverage:img.naturalWidth*scale/r.width,ratio:img.naturalWidth/img.naturalHeight,labelSize:scale*(innerWidth<600?88:44),proof:verifyProof(proof,c.getImageData(0,0,proof.width,proof.protectedHeight).data),inside:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};
    })()`);
    assert.ok(layout.coverage>.97,`Card uses the width at ${width}x${height}`);
    assert.ok(layout.labelSize>=20,`Readable labels at ${width}x${height}`);
    assert.equal(layout.inside,true);assert.equal(layout.proof.values,true);assert.equal(layout.proof.pixels,true);
    await screenshot(`v19-share-${width}x${height}`);
  }
  await call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true});await sleep(200);
  await waitFor('!document.getElementById("download-share").hidden');

  await evaluate('document.getElementById("share-dialog").close()');
  await click('tune-button');
  assert.equal(await evaluate('document.getElementById("workshop-panel").closest("dialog").open'), true);
  await evaluate('document.getElementById("workshop-dialog").close()');
  await click('workshop-button');
  assert.equal(await evaluate('document.getElementById("workshop-panel").closest("dialog")?.open'),true,'Rapid dialog reopen keeps the tree attached');
  const talentAt=await point('reset-talents');
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[talentAt]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const nodeAt=await evaluate('(()=>{const r=document.querySelector("[data-talent=pads]").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[nodeAt]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await waitFor('document.getElementById("talent-sheet").open');
  const padAt=await evaluate('(()=>{const r=document.querySelector("#talent-detail .talent-rank").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[padAt]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await waitFor('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.pads===1');
  await screenshot('v15-mobile-talent-detail');
  await evaluate('document.getElementById("talent-sheet").close()');
  console.log('PASS landscape fits without scrolling, touch aim, hold/cancel/release, full mobile flight and talent overlay');

  for (const [width, height] of [[740,320],[667,375],[932,430],[1180,700],[320,740],[390,844]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await sleep(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow at ${width}x${height}`);
    await click('workshop-button');
    assert.equal(await evaluate('document.getElementById("workshop-dialog").scrollWidth <= document.getElementById("workshop-dialog").clientWidth'),true,`Talent overflow at ${width}x${height}`);
    if(width===1180){
      assert.equal(await evaluate('getComputedStyle(document.getElementById("workshop-panel")).display'),'grid');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".workshop-intro")).display'),'none');
      await screenshot('v11-tall-touch-talents');
    }
    assert.equal(await evaluate('(()=>{const v=document.getElementById("network-viewport");return v.scrollWidth<=v.clientWidth&&v.scrollHeight<=v.clientHeight})()'),true,`No talent scrolling at ${width}x${height}`);
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".talent-node")).every(n=>{const r=n.getBoundingClientRect();return r.height>=44&&r.width>=44&&r.top>=0&&r.bottom<=innerHeight})'),true,'All twelve touch targets fit');
    if(width===390) await screenshot('v5-portrait-talents');
    await evaluate('document.querySelector("[data-talent=airbag]").click()');
    assert.equal(await evaluate('(()=>{const d=document.getElementById("talent-sheet");return d.scrollWidth<=d.clientWidth&&d.scrollHeight<=d.clientHeight})()'),true,`Detail sheet fits at ${width}x${height}`);
    await evaluate('document.querySelector("#talent-sheet .dialog-back").click()');

    await evaluate('document.getElementById("workshop-dialog").close()');
  }
  await click('menu-button');
  await evaluate('document.querySelector("[data-open=statistics-dialog]").click()');
  assert.equal(await evaluate('document.querySelectorAll(".statistic").length'),12);
  assert.equal(await evaluate('document.querySelector(".statistic strong").textContent'),String(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).statistics.shots')));
  await screenshot('v12-statistics-portrait');
  // An already open dialog must follow orientation changes, with reachable navigation.
  await call('Emulation.setDeviceMetricsOverride',{width:667,height:375,deviceScaleFactor:1,mobile:true});await sleep(150);
  assert.equal(await evaluate('(()=>{const r=document.querySelector("#statistics-dialog .dialog-close").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()'),true);
  await screenshot('v12-statistics-landscape');
  await evaluate('document.querySelector("#statistics-dialog .dialog-back").click();document.querySelector("[data-open=scores-dialog]").click()');
  await evaluate('document.querySelector("[data-score-scope=local]").click()');
  assert.ok(await evaluate('document.querySelectorAll("#dialog-highscores li").length>0'));
  assert.ok(await evaluate('Array.from(document.querySelectorAll("#dialog-highscores .score-name")).some(n=>n.textContent==="Lotte <3")'));
  assert.equal(await evaluate('document.querySelector("#dialog-highscores .score-name").children.length'),0);
  await screenshot('v18-mobile-scores');

  for(const target of ['help-dialog','cosmetics-dialog','achievements-dialog']){
    await evaluate('document.querySelector("dialog[open] .dialog-back").click()');
    await evaluate(`document.querySelector('[data-open="${target}"]').click()`);
    assert.equal(await evaluate('(()=>{const d=document.querySelector("dialog[open]");return d.scrollWidth<=d.clientWidth})()'),true,`${target} has no horizontal scrolling`);
    assert.equal(await evaluate('(()=>{const d=document.querySelector("dialog[open]"),h=d.querySelector("h2").getBoundingClientRect(),b=d.querySelector(".dialog-back").getBoundingClientRect();return h.top>=b.bottom})()'),true,`${target} title clears menu navigation`);
    if(target==='achievements-dialog')assert.equal(await evaluate('getComputedStyle(document.querySelector(".achievement-item:not(.unlocked)")).backgroundColor'),'rgb(57, 48, 71)');
    await screenshot('v12-mobile-'+target);
  }
  await evaluate('document.querySelector("dialog[open] .dialog-back").click();document.querySelector("[data-open=statistics-dialog]").click()');
  await evaluate('document.querySelector("#statistics-dialog .dialog-back").click()');
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'),1);
  await evaluate('document.getElementById("menu-dialog").close()');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);
  await navigate(); await screenshot('v2-phone-portrait');
  assert.equal(await evaluate('getComputedStyle(document.getElementById("rotate-hint")).display'), 'flex');
  await click('dismiss-rotate');
  // Keyboard charge/release and cancellation on a resized viewport.
  await call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await sleep(200); // Let orientation/resize cancellation settle before pressing a key.
  await evaluate('document.getElementById("game").focus()');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(100); assert.equal(await evaluate('document.body.classList.contains("is-charging")'), true);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  assert.equal(await evaluate('document.getElementById("phase-badge").textContent'), 'STARTKLAR');
  // The primary desktop gesture works directly on the field, without its button.
  const fieldPoint = await point('game');
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fieldPoint.x, y: fieldPoint.y - 50 });
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: fieldPoint.x, y: fieldPoint.y - 50, button: 'left', clickCount: 1 });
  await sleep(300); assert.equal(await evaluate('document.body.classList.contains("is-charging")'), true);
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: fieldPoint.x, y: fieldPoint.y - 50, button: 'left', clickCount: 1 });
  assert.equal(await evaluate('document.body.classList.contains("is-flying")'), true);
  await navigate();
  await evaluate('document.getElementById("game").focus()');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(300);
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  assert.equal(await evaluate('document.body.classList.contains("is-flying")'), true);
  // The complete original version still loads independently of the v2 save.
  await call('Page.navigate', { url: origin + '/variants/acker-v1/' });
  await waitFor('document.querySelectorAll(".upgrade-card").length === 3');
  assert.equal(await evaluate('document.getElementById("angle").value'), '38');
  await navigate();
  console.log('PASS direct field click/hold/release, keyboard release and original version archive');
  // First-level focus: previously selected upper worlds migrate back without losing progress.
  assert.equal(await evaluate('document.querySelectorAll("#levels-button,#levels-dialog,#next-level-button").length'), 0);
  await evaluate('const p=JSON.parse(localStorage.getItem("kartoffelkanone.v2"));p.journey.selected="space";p.journey.records.sky={distance:1400,height:800};p.journey.escaped=true;p.planted=49;p.achievements.push("orbital");localStorage.setItem("kartoffelkanone.v2",JSON.stringify(p))');
  await navigate();
  assert.equal(await evaluate('document.documentElement.dataset.level'), 'ground');
  assert.equal(await evaluate('document.getElementById("planted-total").textContent'), '49');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).journey.records.sky.distance'), 1400);
  await click('achievements-button'); await screenshot('v4-planting-achievements');
  assert.equal(await evaluate('document.querySelectorAll(".achievement-item").length'), 12);
  assert.match(await evaluate('document.getElementById("achievement-list").textContent'), /Knollengärtner/);
  assert.doesNotMatch(await evaluate('document.getElementById("achievement-list").textContent'), /Houston|Heliopause/);
  await evaluate('document.getElementById("achievements-dialog").close()');
  // Pixel regression at the former scenery wrapping boundaries, in both styles.
  const scenery = await evaluate(`(async () => {
    const {Renderer} = await import('./src/renderer.mjs');
    const canvas = document.createElement('canvas'); canvas.style.cssText='width:900px;height:440px;position:fixed;left:-2000px';
    document.body.append(canvas); const r = new Renderer(canvas); const results=[];
    for (const style of ['junkBackground','classicBackground']) {
      for (const boundary of [190/.17,135/.33,100/.49,160/.36,225/.22]) {
        r.camera=boundary-.01;r[style](0);const a=r.ctx.getImageData(0,0,900,440).data;
        r.camera=boundary+.01;r[style](0);const b=r.ctx.getImageData(0,0,900,440).data;
        let difference=0;for(let i=0;i<a.length;i++)difference+=Math.abs(a[i]-b[i]);results.push(difference/a.length);
      }
    }
    r.observer.disconnect();canvas.remove();return results;
  })()`);
  assert.ok(scenery.every(difference => difference < 1), JSON.stringify(scenery));
  const zoom=await evaluate(`(async()=>{
    const {Renderer}=await import('./src/renderer.mjs');const {createFlight,stepFlight}=await import('./src/physics.mjs');
    const canvas=document.createElement('canvas');canvas.style.cssText='width:900px;height:440px;position:fixed;left:-2000px';document.body.append(canvas);const r=new Renderer(canvas);r.reset();
    const f=createFlight({angle:80,energy:70},{},{seed:42,traffic:false});f.elapsed=2;
    const draw=()=>r.draw({flight:f,settings:f.settings,equipment:f.equipment,phase:'flying',best:0,time:f.elapsed,delta:1/60,alpha:1,traffic:false});
    f.y=f.previousY=240;for(let i=0;i<90;i++)draw();const high=r.scale;
    f.y=f.previousY=18;for(let i=0;i<90;i++)draw();const low=r.scale;
    Object.assign(f,{x:811,previousX:811,y:80,previousY:80,vx:-100,vy:0,distance:900});stepFlight(f,.05);draw();
    const reason=f.reason;r.observer.disconnect();canvas.remove();return {high,low,reason};
  })()`);
  assert.ok(zoom.low>zoom.high*2);assert.ok(Math.abs(zoom.low-4.4)<.02);assert.equal(zoom.reason,'laser');
  // Deterministic actual launch, landing plants, settlement, and persistence.
  const seedScript = await call('Page.addScriptToEvaluateOnNewDocument', { source: 'crypto.getRandomValues = a => { a.fill(42); return a; };' });
  await evaluate('const p=JSON.parse(localStorage.getItem("kartoffelkanone.v2"));p.settings.angle=20;p.preferences.traffic=false;p.xp=900;p.purchased.armor=3;p.equipped.armor=3;p.purchased.pads=3;p.equipped.pads=3;localStorage.setItem("kartoffelkanone.v2",JSON.stringify(p))');
  await navigate();
  // Keep the charge exact despite CDP/CPU scheduling; actual pointer events still launch.
  await evaluate('window.realNow=performance.now.bind(performance);performance.now=()=>1000');
  at=await press('launch-button');
  await evaluate('performance.now=()=>1600');await release(at);
  await evaluate('performance.now=window.realNow;delete window.realNow');
  await sleep(100);await screenshot('v4-launch');
  await evaluate(`import('./src/physics.mjs').then(({FixedClock})=>{if(!FixedClock.prototype.testAdvance){FixedClock.prototype.testAdvance=FixedClock.prototype.advance;FixedClock.prototype.advance=function(dt,step){return this.testAdvance(dt,step,8)}}})`);
  await waitFor('!document.getElementById("result").hidden',15000);
  assert.match(await evaluate('document.getElementById("result-planted").textContent'), /gepflanzt/);
  const planted=await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).planted');
  assert.ok(planted>49);await screenshot('v4-landing-garden');await navigate();
  assert.equal(await evaluate('Number(document.getElementById("planted-total").textContent)'),planted);
  await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await click('fullscreen-button');await waitFor('!!document.fullscreenElement');
  await waitFor('(()=>{const r=document.getElementById("game").getBoundingClientRect();return r.top===0&&r.left===0&&Math.abs(r.bottom-innerHeight)<1&&Math.abs(r.right-innerWidth)<1})()');
  await screenshot('v11-fullscreen-edge-to-edge');await sleep(150);
  await screenshot('v6-fullscreen-cannon');
  assert.ok(await evaluate('document.getElementById("game").clientHeight>800'));
  await evaluate('document.exitFullscreen()');
  await evaluate(`(async()=>{
    const {Renderer}=await import('./src/renderer.mjs');const {BOUNCERS}=await import('./src/config.mjs');
    const canvas=document.createElement('canvas');canvas.id='test-gallery';canvas.style.cssText='position:fixed;top:0;left:0;width:1000px;height:440px;z-index:99999';document.body.append(canvas);
    const r=new Renderer(canvas);r.reset();r.theme='junk';r.wind=0;r.junkBackground(0);
    let i=0;for(const [variant,def] of Object.entries(BOUNCERS)){
      const x=25+i++*50;r.obstacle({type:'mushroom',variant,x,width:12,height:6},0);
      r.ctx.font='16px Arial';r.ctx.fillStyle='#fff0d9';r.ctx.textAlign='center';r.ctx.fillText(def.name,r.x(x+6),r.ground+40);
    }
    r.vehicle({x:60,y:50},0);r.endedAt=null;
    r.wrecks({elapsed:1,ended:false,level:'ground',trafficWrecks:[{x:110,y:55,vx:-5,vy:-6,hitAt:0,spin:-2.5}]},1);
    window.galleryRenderer=r;
  })()`);
  await screenshot('v6-sprungbretter-ufo');
  await evaluate('window.galleryRenderer.observer.disconnect();document.getElementById("test-gallery").remove();delete window.galleryRenderer');
  await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await sleep(150);await screenshot('v4-mobile-ground');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  await call('Page.removeScriptToEvaluateOnNewDocument', { identifier: seedScript.identifier });
  console.log('PASS continuous scenery, first-level focus, legacy saves, sharp launch, planted crops and persistence');
  // Cosmetic purchases, mutually exclusive hats, persistence and touch-sized controls.
  await evaluate('const p=JSON.parse(localStorage.getItem("kartoffelkanone.v2"));p.planted=250;localStorage.setItem("kartoffelkanone.v2",JSON.stringify(p))');
  await navigate();await click('cosmetics-button');
  assert.equal(await evaluate('document.querySelectorAll(".cosmetic-card").length'),6);
  await evaluate(`for(const id of ['bunting','night','shades','bucket','umbrella','crown','candy']) {document.querySelector('[data-cosmetic-category='+ (id==='candy'?'scenes':'outfit') +']').click();document.querySelector('[data-cosmetic="'+id+'"]').click()}document.querySelector('[data-cosmetic-category=outfit]').click()`);
  assert.equal(await evaluate('document.getElementById("cosmetic-balance").textContent'),'60');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).planted'),250);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).cosmetics.equipped.hat'),'crown');
  await evaluate(`document.querySelector('[data-cosmetic="bucket"]').click()`);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).cosmetics.equipped.hat'),'bucket');
  await evaluate('document.getElementById("cosmetics-dialog").scrollTop=0');
  await screenshot('v6-mobile-garderobe');
  assert.equal(await evaluate('document.querySelector(".cosmetics-dialog").scrollWidth<=document.querySelector(".cosmetics-dialog").clientWidth'),true);
  assert.ok(await evaluate('Array.from(document.querySelectorAll("[data-cosmetic]")).every(b=>b.getBoundingClientRect().height>=44)'));
  await navigate();await click('cosmetics-button');
  assert.equal(await evaluate('document.getElementById("cosmetic-balance").textContent'),'60');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await sleep(150);await screenshot('v6-garderobe');
  await evaluate(`document.querySelector('[data-cosmetic="night"]').click()`);
  await screenshot('v6-garderobe-candy');
  await evaluate('document.querySelector("[data-cosmetic-category=scenes]").click();document.querySelector("[data-scene=classic]").click();document.querySelector("[data-cosmetic-category=outfit]").click();document.querySelector("[data-cosmetic=night]").click()');
  assert.equal(await evaluate('document.documentElement.dataset.theme'),'classic');
  assert.equal(await evaluate('document.getElementById("theme")'),null);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).cosmetics.equipped.light'),'night');
  assert.equal(await evaluate('getComputedStyle(document.getElementById("cosmetics-dialog")).backgroundColor'),'rgb(41, 36, 57)');
  await screenshot('v9-acker-night-wardrobe');
  await evaluate('document.querySelector("#cosmetics-dialog .dialog-back").click();document.querySelector("[data-open=help-dialog]").click()');
  assert.equal(await evaluate('getComputedStyle(document.getElementById("help-dialog")).backgroundColor'),'rgb(41, 36, 57)');
  await screenshot('v14-acker-help');
  await evaluate('document.querySelector("#help-dialog .dialog-back").click();document.querySelector("[data-open=cosmetics-dialog]").click()');


  await evaluate('document.getElementById("cosmetics-dialog").close()');
  console.log('PASS cosmetic purchase, plant accounting, hats, preview, mobile controls and persistence');
  const riskSeed=await call('Page.addScriptToEvaluateOnNewDocument',{source:'crypto.getRandomValues=a=>{a.fill(42);return a;}'});
  await evaluate('const p=JSON.parse(localStorage.getItem("kartoffelkanone.v2"));for(const key of Object.keys(p.equipped))p.equipped[key]=0;p.xp=1300;localStorage.setItem("kartoffelkanone.v2",JSON.stringify(p))');
  await navigate();
  await evaluate('window.realNow=performance.now.bind(performance);performance.now=()=>1000');at=await press('launch-button');
  await evaluate('performance.now=()=>2650');await release(at);await evaluate('performance.now=window.realNow;delete window.realNow');
  await waitFor('!document.getElementById("result").hidden');
  assert.match(await evaluate('document.getElementById("result-detail").textContent'),/Schale nicht gehalten/);
  assert.equal(await evaluate('document.getElementById("distance").textContent.trim()'),'0,0 m');
  const silentResult=await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');const played=gameAudio.played;await new Promise(r=>setTimeout(r,1200));gameAudio.unlock();return gameAudio.played===played&&gameAudio.musicTimer===null;})()`);
  assert.equal(silentResult,true,'result screen emits no further gameplay sounds or music');
  await screenshot('v8-extreme-launch-failure');
  await click('share-result');await waitFor('!document.getElementById("download-share").hidden');
  assert.match(await evaluate('document.getElementById("download-share").download'),/-0m.png$/);
  const dressedCard=await evaluate(`(async()=>{const {extractProof}=await import('./src/share-proof.mjs');const blob=await(await fetch(document.getElementById('download-share').href)).blob();const proof=extractProof(await blob.arrayBuffer());const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)});return {payload:JSON.parse(proof.data),data};})()`);
  assert.equal(dressedCard.payload.theme,'classic');
  assert.deepEqual(dressedCard.payload.looks,{eyewear:'shades',hat:'bucket',light:'night',umbrella:'umbrella',trail:'bunting'});
  await writeFile(join(screenshots,'v9-share-looks.png'),Buffer.from(dressedCard.data.split(',')[1],'base64'));
  await evaluate('document.getElementById("share-dialog").close()');
  await evaluate('const p=JSON.parse(localStorage.getItem("kartoffelkanone.v2"));p.equipped.armor=3;localStorage.setItem("kartoffelkanone.v2",JSON.stringify(p))');
  await navigate();await evaluate('window.realNow=performance.now.bind(performance);performance.now=()=>1000');at=await press('launch-button');
  await evaluate('performance.now=()=>2650');await release(at);await evaluate('performance.now=window.realNow;delete window.realNow');
  assert.equal(await evaluate('document.body.classList.contains("is-flying")'),true);
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:riskSeed.identifier});
  console.log('PASS same maximum-charge launch explodes naked, survives with armor, and zero-distance share exports');
  const beforeAbort=await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).attempts');
  await click('detonate-button');await waitFor('document.getElementById("phase-badge").textContent==="STARTKLAR"');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).attempts'),beforeAbort+1);
  assert.equal(await evaluate('document.getElementById("result").hidden'),true);
  await evaluate('document.getElementById("detonate-button").click()');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).attempts'),beforeAbort+1);
  at=await press('launch-button');await sleep(300);await release(at);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'r',code:'KeyR',windowsVirtualKeyCode:82});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'r',code:'KeyR',windowsVirtualKeyCode:82});
  await waitFor('document.getElementById("phase-badge").textContent==="STARTKLAR"');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).attempts'),beforeAbort+2);
  console.log('PASS emergency restart by button and R, exactly-once settlement and ready-to-fire state');
  assert.ok(await evaluate(`(async()=>{const {gameAudio}=await import('./src/audio.mjs');return gameAudio.musicTimer!==null&&!gameAudio.musicPaused})()`),'restarts retain one music loop');


  // A short recorded flight exercises the complete UI without waiting for a long run.
  await evaluate(`(async()=>{
    const {createFlight,stepFlight,boostFlight,detonateFlight}=await import('./src/physics.mjs');
    const {captureReplay}=await import('./src/replay.mjs');
    const p=JSON.parse(localStorage.getItem('kartoffelkanone.v2'));
    const f=createFlight({angle:60,energy:100},{armor:2,wings:2},{seed:12,windSeed:55,windTime:8});
    f.playerName='Replay 🥔';f.appearance={hat:'crown'};f.theme='classic';
    for(let i=0;i<240;i++){if(i===30)boostFlight(f);stepFlight(f);}detonateFlight(f);
    p.scores=[{distance:f.distance,level:'ground',equipment:f.equipment,playerName:f.playerName,replay:captureReplay(f)}];
    localStorage.setItem('kartoffelkanone.v2',JSON.stringify(p));
  })()`);
  await navigate();
  const beforeReplay=await evaluate('localStorage.getItem("kartoffelkanone.v2")');
  await click('menu-button');await evaluate('document.querySelector("[data-open=scores-dialog]").click();document.querySelector("[data-score-scope=local]").click();document.querySelector("#dialog-highscores [data-replay]").click()');
  assert.match(await evaluate('document.getElementById("replay-talents").textContent'),/Schalenpanzerung/);
  await call('Emulation.setDeviceMetricsOverride',{width:740,height:320,deviceScaleFactor:1,mobile:true});await sleep(100);
  assert.equal(await evaluate('(()=>{const d=document.getElementById("replay-dialog");return d.scrollWidth<=d.clientWidth})()'),true);
  await screenshot('v20-replay-details-mobile');

  await evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async url=>{window.copiedReplay=url}}})');
  await click('replay-copy');await waitFor('!!window.copiedReplay');const sharedReplay=await evaluate('window.copiedReplay');assert.ok(sharedReplay.includes('#flug='));
  await click('replay-play');
  await call('Runtime.evaluate',{expression:'document.getElementById("flight-panel").requestFullscreen()',userGesture:true,awaitPromise:true});
  assert.equal(await evaluate('document.fullscreenElement.contains(document.getElementById("replay-controls"))'),true);
  assert.equal(await evaluate('document.getElementById("flight-actions").hidden'),true);
  await evaluate('document.getElementById("boost-button").click();document.getElementById("detonate-button").click()');
  await waitFor('document.getElementById("replay-status").textContent==="Wiederholung beendet"',6000);
  assert.equal(await evaluate('localStorage.getItem("kartoffelkanone.v2")'),beforeReplay,'Viewing grants no rewards and changes no profile');
  await screenshot('v20-replay-finished-mobile');
  await evaluate('document.exitFullscreen()');
  await click('replay-stop');assert.equal(await evaluate('document.getElementById("phase-badge").textContent'),'STARTKLAR');
  await call('Page.navigate',{url:sharedReplay});await waitFor('document.getElementById("replay-dialog")?.open');
  assert.equal(await evaluate('localStorage.getItem("kartoffelkanone.v2")'),beforeReplay,'Opening links leaves profile unchanged');
  await click('replay-import');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.wings'),2);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).equipped.armor'),2);
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("kartoffelkanone.v2")).cosmetics'),JSON.parse(beforeReplay).cosmetics);
  await evaluate('document.getElementById("replay-dialog").close()');
  // Watching a record during a paused live flight must return to the very same flight.
  at=await press('launch-button');await sleep(150);await release(at);
  await click('menu-button');await evaluate('document.querySelector("[data-open=scores-dialog]").click();document.querySelector("[data-score-scope=local]").click();document.querySelector("#dialog-highscores [data-replay]").click()');
  const liveBefore=await evaluate('localStorage.getItem("kartoffelkanone.v2")');
  assert.equal(await evaluate('document.getElementById("replay-import").disabled'),true);
  await click('replay-play');await sleep(200);await click('replay-stop');
  assert.equal(await evaluate('document.getElementById("phase-badge").textContent'),'IM ANFLUG');
  assert.equal(await evaluate('localStorage.getItem("kartoffelkanone.v2")'),liveBefore);
  await evaluate('location.hash="flug=broken"');await waitFor('document.getElementById("toast").textContent.includes("ungültig")');
  console.log('PASS replay links, isolated playback, exact finish, explicit talent import and invalid-link feedback');
  await navigate();
  for (const [width,height] of [[844,390],[390,844]]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:true});await sleep(150);
    await click('menu-button');await evaluate('document.querySelector("[data-open=scores-dialog]").click()');
    await evaluate('document.querySelector("[data-score-scope=local]").click()');
    assert.equal(await evaluate('(()=>{const row=document.querySelector("#dialog-highscores li"),a=row.querySelector(".score-actions").getBoundingClientRect(),d=row.querySelector(".score-distance").getBoundingClientRect();return (innerWidth<=600?a.top>=d.bottom:Math.abs((a.top+a.height/2)-(d.top+d.height/2))<2)&&a.right<=row.getBoundingClientRect().right&&row.querySelectorAll(".score-actions svg").length===2&&[...row.querySelectorAll(".score-actions button")].every(b=>b.getAttribute("aria-label"))})()'),true,'Leaderboard actions fit alongside the score or on a separate narrow-screen row');
    await screenshot(`playtest-leaderboard-${width}`);
    await evaluate('document.getElementById("scores-dialog").close()');
  }


  await call('Page.navigate',{url:origin+'/verify.html'});await waitFor('document.readyState==="complete" && !!document.getElementById("proof-file")');
  const dom=await call('DOM.getDocument');const fileInput=await call('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'#proof-file'});
  await call('DOM.setFileInputFiles',{nodeId:fileInput.nodeId,files:[join(screenshots,'v8-share-card.png')]});
  await waitFor('document.getElementById("proof-result").textContent.includes("Prüfsummen stimmen")');
  await screenshot('v9-proof-verifier');
  await navigate();
  // Real API integration, separate from the static-only/legacy-link checks above.
  await evaluate('const p=JSON.parse(localStorage.getItem("kartoffelkanone.v2"));p.scores=[];localStorage.setItem("kartoffelkanone.v2",JSON.stringify(p));localStorage.removeItem("minizap.record-sync.v1")');
  onlineEnabled=true;
  await navigate();
  await evaluate(`(async()=>{
    const {createFlight,stepFlight}=await import('./src/physics.mjs');
    const {captureReplay}=await import('./src/replay.mjs');
    const f=createFlight({angle:45,energy:70},{},{seed:42,windSeed:12,windTime:0,traffic:true,level:'ground'});
    while(!f.ended)stepFlight(f);f.playerName='Online pilot';
    const {saveReplay}=await import('./src/api-client.mjs');window.shortUrl=await saveReplay(captureReplay(f),true);
  })()`);
  const shortUrl=await evaluate('window.shortUrl');assert.match(shortUrl,/\?flight=[\w-]{12}$/);
  const onlineBefore=await evaluate('localStorage.getItem("kartoffelkanone.v2")');
  await call('Page.navigate',{url:shortUrl});await waitFor('document.getElementById("replay-dialog")?.open');
  assert.equal(await evaluate('document.getElementById("start-dialog").open'),false);
  assert.match(await evaluate('document.getElementById("replay-description").textContent'),/Online pilot/);
  assert.equal(await evaluate('localStorage.getItem("kartoffelkanone.v2")'),onlineBefore);
  await evaluate('document.querySelector("#replay-dialog .dialog-back").click();document.querySelector("#menu-dialog [data-open=scores-dialog]").click()');
  await waitFor('document.querySelectorAll("#online-highscores li").length===1');
  await screenshot('minizap-online-leaderboard');
  await call('Emulation.setDeviceMetricsOverride',{width:740,height:320,deviceScaleFactor:1,mobile:true});
  await call('Page.navigate',{url:origin});await waitFor('document.getElementById("start-dialog")?.open');
  assert.equal(await evaluate('(()=>{const d=document.getElementById("start-dialog");return d.scrollHeight<=d.clientHeight&&d.scrollWidth<=d.clientWidth})()'),true,'Landscape entry fits without scrolling');
  await screenshot('minizap-start-mobile');
  await evaluate('document.getElementById("start-play").click()');
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'),0);
  await evaluate(`import('./src/physics.mjs').then(({FixedClock})=>{const advance=FixedClock.prototype.advance;FixedClock.prototype.advance=function(dt,step){return advance.call(this,dt,step,8)}})`);
  await evaluate('document.getElementById("traffic").checked=true;document.getElementById("traffic").dispatchEvent(new Event("change"))');
  await evaluate(`window.originalFetch=window.fetch;window.fetch=(url,...args)=>String(url).includes('/api/')?Promise.reject(Error('offline')):window.originalFetch(url,...args);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async url=>window.copiedFlight=url}})`);
  at=await press('launch-button');await sleep(200);await release(at);
  await waitFor('!document.getElementById("result").hidden',15000);
  await waitFor('document.getElementById("publish-status").textContent.includes("erneut übertragen")');
  await click('share-result');await waitFor('!document.getElementById("copy-flight-link").disabled');
  await waitFor('document.getElementById("share-status").textContent.includes("vollständige Fluglink")');
  await waitFor('!document.getElementById("share-preview").hidden');
  assert.deepEqual(await evaluate(`(async()=>{const {extractProof}=await import('./src/share-proof.mjs');const blob=await(await fetch(document.getElementById('download-share').href)).blob();return JSON.parse(extractProof(await blob.arrayBuffer()).data).ranks.global})()`),{rank:null,status:'offline'});
  assert.equal(await evaluate(`document.querySelector('[data-result-rank="global"] strong').textContent`),'—');
  assert.equal(await evaluate(`document.querySelector('[data-result-rank="global"]>span:last-child').textContent`),'Nicht erreichbar');
  await click('copy-flight-link');await waitFor('!!window.copiedFlight');assert.ok(await evaluate('window.copiedFlight.includes("#flug=")'));
  await evaluate(`document.getElementById('share-dialog').close();window.fetch=window.originalFetch;Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>window.onlineShare=data})`);
  await click('share-result');await waitFor('!document.getElementById("copy-flight-link").disabled && !document.getElementById("native-share").hidden');
  await click('copy-flight-link');await waitFor('window.copiedFlight.includes("?flight=")');
  await click('native-share');await waitFor('!!window.onlineShare');assert.equal(await evaluate('window.onlineShare.url'),await evaluate('window.copiedFlight'));
  await evaluate('document.getElementById("share-dialog").close()');
  assert.equal(await evaluate('document.getElementById("publish-score")'),null);
  // Restore connectivity; persisted personal record is uploaded automatically on reload.
  await call('Page.navigate',{url:origin});await waitFor('document.getElementById("start-dialog")?.open');
  await waitFor('JSON.parse(localStorage.getItem("minizap.record-sync.v1"))?.pending.length===0');
  assert.ok(await evaluate('JSON.parse(localStorage.getItem("minizap.record-sync.v1")).completed.length>0'));
  await evaluate('document.getElementById("start-play").click()');
  await click('menu-button');await evaluate('document.querySelector("[data-open=scores-dialog]").click()');
  await waitFor('document.querySelectorAll("#online-highscores li").length>=2');
  onlineEnabled=false;
  await navigate();
  console.log('PASS MiniZap start/install guide, persisted short URL, direct replay and public leaderboard');
  // English browser preference, explicit overrides, in-flight switching and safe updates.
  const englishScript=await call('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'languages',{configurable:true,get:()=>['fr-FR','en-GB','de-DE']})"});
  await evaluate('localStorage.removeItem("minizap.language");localStorage.removeItem("kartoffelkanone.v2")');
  advertisedRelease={version:'0.8.0',build:'test-next-build'};
  await call('Page.navigate',{url:origin});await waitFor('document.documentElement?.lang==="en" && !!document.querySelector("#start-dialog [data-update]")');
  await waitFor('!document.querySelector("#start-dialog .update-notice").hidden');
  assert.equal(await evaluate('document.getElementById("start-play").textContent'),'Play now ↗');
  assert.equal(await evaluate('document.getElementById("start-title").textContent'),'Potato Cannon');
  await evaluate('document.getElementById("menu-button").click();document.querySelector("#menu-dialog [data-language=de]").click();document.getElementById("menu-dialog").close()');
  assert.equal(await evaluate('document.documentElement.lang'),'de');
  await call('Page.navigate',{url:origin});await waitFor('document.querySelector("#menu-dialog [data-language=en]")');
  assert.equal(await evaluate('document.documentElement.lang'),'de','Manual preference wins over browser language');
  await evaluate('document.getElementById("menu-button").click();document.querySelector("#menu-dialog [data-language=en]").click();document.getElementById("menu-dialog").close();document.getElementById("start-play").click()');
  await click('menu-button');
  await evaluate('document.getElementById("player-name").value="Talente";document.getElementById("player-name").dispatchEvent(new Event("input"))');
  await screenshot('v07-english-menu');
  await evaluate('document.querySelector("#menu-dialog [data-open=workshop-dialog]").click()');
  assert.equal(await evaluate('document.querySelector("[data-talent=armor] .catalog-name").textContent'),'Skin armour');
  await screenshot('v07-english-talents');
  await evaluate('document.querySelector("[data-talent=armor]").click()');
  assert.match(await evaluate('document.getElementById("talent-detail").textContent'),/Safer launches/);
  await evaluate('document.querySelector("#talent-sheet .dialog-back").click();document.querySelector("#workshop-dialog .dialog-back").click();document.querySelector("#menu-dialog [data-language=de]").click();document.querySelector("[data-open=workshop-dialog]").click();document.querySelector("[data-talent=armor]").click()');
  assert.equal(await evaluate('document.getElementById("talent-sheet-title").textContent'),'Schalenpanzerung');
  await evaluate('document.querySelector("#talent-sheet .dialog-back").click();document.querySelector("#workshop-dialog .dialog-back").click();document.querySelector("#menu-dialog [data-language=en]").click();document.getElementById("menu-dialog").close()');
  at=await press('launch-button');await sleep(250);await release(at);
  await waitFor('document.getElementById("phase-badge").textContent==="IN FLIGHT"');
  await click('menu-button');
  const languageFlight=await evaluate('localStorage.getItem("kartoffelkanone.v2")');
  assert.equal(await evaluate('document.querySelector("#menu-dialog [data-update]").disabled'),true,'Never reload an active flight');
  await evaluate('document.querySelector("#menu-dialog [data-language=de]").click()');
  assert.equal(await evaluate('localStorage.getItem("kartoffelkanone.v2")'),languageFlight);
  assert.equal(await evaluate('document.getElementById("player-name").value'),'Talente','Player names are never translated');
  await evaluate('document.querySelector("#menu-dialog [data-language=en]").click();document.getElementById("menu-dialog").close()');
  await evaluate(`import('./src/physics.mjs').then(({FixedClock})=>{const advance=FixedClock.prototype.advance;FixedClock.prototype.advance=function(dt,step){return advance.call(this,dt,step,8)}})`);
  await waitFor('!document.getElementById("result").hidden',20000);
  assert.match(await evaluate('document.getElementById("result-detail").textContent'),/seconds of chaos|skin gave way|safety laser/);
  assert.equal(await evaluate('document.querySelector(".score-name").textContent'),'Talente');
  await screenshot('v07-english-result');
  await click('share-result');await waitFor('!document.getElementById("download-share").hidden');
  await screenshot('v07-english-card');
  const oldCard=await evaluate('document.getElementById("share-preview").src');
  await evaluate('document.getElementById("share-dialog").close();document.getElementById("menu-button").click();document.querySelector("#menu-dialog [data-language=de]").click();document.getElementById("menu-dialog").close()');
  await click('share-result');
  await waitFor(`document.getElementById("share-preview").src!==${JSON.stringify(oldCard)} && !document.getElementById("download-share").hidden`);
  await evaluate('document.getElementById("share-dialog").close();document.getElementById("menu-button").click();document.querySelector("#menu-dialog [data-language=en]").click();document.getElementById("menu-dialog").close()');
  await click('close-result');await click('menu-button');
  await waitFor('!document.querySelector("#menu-dialog [data-update]").disabled');
  const beforeUpdate=await evaluate('localStorage.getItem("kartoffelkanone.v2")');
  await evaluate('document.querySelector("#menu-dialog [data-update]").click()');
  await waitFor('location.search.includes("_v=test-next-build") && document.getElementById("start-dialog")?.open');
  assert.equal(await evaluate('localStorage.getItem("kartoffelkanone.v2")'),beforeUpdate);
  assert.equal(await evaluate('document.documentElement.lang'),'en');
  advertisedRelease=null;
  await evaluate('document.getElementById("menu-button").click();document.querySelector("#menu-dialog [data-language=de]").click();document.getElementById("menu-dialog").close()');
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:englishScript.identifier});
  console.log('PASS English detection, persistent language choice, player data, in-flight switching, cards and safe manual updates');
  await evaluate('localStorage.setItem("kartoffelkanone.v2","broken")'); await navigate();
  assert.equal(await evaluate('document.getElementById("material").textContent'), '0');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(window,"localStorage",{get(){throw Error("blocked")}})' });
  await navigate(); assert.equal(await evaluate('document.getElementById("storage-warning").hidden'), false);
  await evaluate('document.getElementById("menu-button").click();document.querySelector("#menu-dialog [data-language=en]").click()');
  assert.equal(await evaluate('document.documentElement.lang'),'en');
  assert.match(await evaluate('document.getElementById("storage-warning").textContent'),/Storage is blocked/);
  assert.deepEqual(errors, []);
  console.log(`PASS small layouts, portrait hint, keyboard cancel, broken/blocked storage and zero browser errors\nScreenshots: ${screenshots}`);

} finally {
  ws?.close();
  chrome.kill('SIGTERM');
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else { chrome.once('exit', resolve); setTimeout(resolve, 2000); } });
  server.close(); api.emit('close');
  await rm(profile, { recursive: true, force: true });
}
