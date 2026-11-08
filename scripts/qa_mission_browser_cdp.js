#!/usr/bin/env node
// Local-only browser QA using one isolated headless Chrome and the real game HUD.
// Requires the project dev-data server on 127.0.0.1:8876. No external services are used.
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const CHROME_CANDIDATES = process.platform === 'win32'
  ? [
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'chrome.exe',
    ].filter(Boolean)
  : ['google-chrome', 'chromium', 'chromium-browser', 'chrome'];
const CHROME = process.env.GTA2_CHROME || CHROME_CANDIDATES.find((candidate) =>
  !path.isAbsolute(candidate) || fsSync.existsSync(candidate)) || CHROME_CANDIDATES[0];
const CDP_HOST = '127.0.0.1';
const CHROME_HOST = '127.0.0.1';
const PORT = Number(process.env.GTA2_QA_PORT) || 9223;
const BASE = process.env.GTA2_QA_BASE || 'http://127.0.0.1:8876/';
const outDir = process.env.GTA2_QA_SCREENSHOT_DIR
  ? path.resolve(process.env.GTA2_QA_SCREENSHOT_DIR)
  : path.join(__dirname, '..', 'game', 'qa-screenshots');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const auditSnapshots = [];

async function json(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const events = [];
    let nextId = 0;
    ws.addEventListener('open', () => resolve({
      ws,
      events,
      send(method, params = {}) {
        const id = ++nextId;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((res, rej) => pending.set(id, { res, rej, method }));
      },
    }));
    ws.addEventListener('message', (message) => {
      const data = JSON.parse(message.data);
      if (data.id) {
        const item = pending.get(data.id);
        if (!item) return;
        pending.delete(data.id);
        if (data.error) item.rej(new Error(`${item.method}: ${data.error.message}`));
        else item.res(data.result);
      } else if (data.method) events.push(data);
    });
    ws.addEventListener('error', reject);
  });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'gta2-he-qa-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-address=${CHROME_HOST}`, `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let cdp;
  try {
    let version;
    for (let i = 0; i < 100; i++) {
      try { version = await json(`http://${CDP_HOST}:${PORT}/json/version`); break; }
      catch { await wait(200); }
    }
    if (!version) throw new Error('isolated Chrome did not start its localhost DevTools endpoint');
    let targets = await json(`http://${CDP_HOST}:${PORT}/json/list`);
    let page = targets.find((target) => target.type === 'page');
    if (!page) page = await json(`http://${CDP_HOST}:${PORT}/json/new?about:blank`, { method: 'PUT' });
    cdp = await connectCdp(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: Number(process.env.GTA2_QA_WIDTH) || 1200,
      height: Number(process.env.GTA2_QA_HEIGHT) || 800,
      deviceScaleFactor: 1, mobile: false,
    });
    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'page evaluation failed');
      return result.result?.value;
    };
    const navigate = async (url) => {
      if (process.env.GTA2_QA_GXT_AUDIT) {
        try {
          const snapshot = await evaluate('window.gta2GxtAudit?.snapshot() || []');
          if (snapshot.length) auditSnapshots.push({ page: await evaluate('location.href'), missing: snapshot });
        } catch { /* initial about:blank has no app diagnostics */ }
      }
      const target = process.env.GTA2_QA_GXT_AUDIT
        ? `${url}${url.includes('?') ? '&' : '?'}gxt-audit`
        : url;
      await cdp.send('Page.navigate', { url: target });
    };
    const waitFor = async (probe, predicate, label, timeoutMs = 45000) => {
      const timeoutOverride = Number(process.env.GTA2_QA_TIMEOUT_MS);
      const effectiveTimeout = Number.isFinite(timeoutOverride) && timeoutOverride > 0
        ? Math.min(timeoutOverride, timeoutMs)
        : timeoutMs;
      const end = Date.now() + effectiveTimeout;
      let value;
      while (Date.now() < end) {
        try { value = await evaluate(probe); } catch { /* startup may briefly block Runtime.evaluate */ }
        if (predicate(value)) return value;
        await wait(150);
      }
      if (process.env.GTA2_QA_DIAGNOSTICS) {
        try {
          const diagnostics = await evaluate(`(() => ({url: location.href, title: document.title,
            status: document.querySelector('#status')?.innerText, body: document.body?.innerText?.slice(0,1200),
            module: typeof window.gta2?.Module, renderer: typeof window.gta2?.Module?.gta2HebrewGxtDraw,
            player: window.gta2?.dev?.state()?.player,
            resources: performance.getEntriesByType('resource').slice(-20).map(x=>({name:x.name, duration:Math.round(x.duration), transferSize:x.transferSize})),
            errors: window.__gta2QaErrors||[]}))()`);
          console.error(`QA diagnostics for ${label}: ${JSON.stringify(diagnostics)}`);
        } catch (error) { console.error(`QA diagnostics unavailable: ${error.message}`); }
      }
      throw new Error(`timed out waiting for ${label}; last value=${JSON.stringify(value)}`);
    };
    const capture = async (name) => {
      if (process.env.GTA2_QA_CLEAN_SCREENSHOTS) {
        await cdp.send('Runtime.evaluate', { expression: `(() => {
          let s=document.getElementById('gta2-qa-clean-capture');
          if(!s){s=document.createElement('style');s.id='gta2-qa-clean-capture';document.head.append(s)}
          s.textContent='#tools,#mission-history{visibility:hidden!important}';return true;
        })()` });
      }
      await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(outDir, `${name}.png`);
      await fs.writeFile(file, Buffer.from(result.data, 'base64'));
      return file;
    };
    const visibleTranslated = `(() => { const p=document.querySelector('#mission-brief'); const t=p?.querySelector('.mission-brief-text'); return p && !p.hidden && t?.innerText ? {text:t.innerText,dir:p.dir} : null; })()`;
    if (process.env.GTA2_QA_MAIN_MENU_ONLY) {
      await navigate(`${BASE}?devdata`);
      await waitFor(`(() => {const m=window.gta2?.Module;return !!m&&m.ccall('gta2_port_frontend_menu_state','number',[],[])>=0&&document.documentElement.lang==='he'&&!document.querySelector('#main-menu-hebrew')?.hidden})()`, Boolean, 'Hebrew native main menu', 120000);
      await evaluate(`document.fonts.load('30px "GTA2 Impact Pixel"')`);
      const probe = await evaluate(`(() => {
        const root=document.querySelector('#main-menu-hebrew');
        const rows=[...root.querySelectorAll('[data-option]')].map(node=>{
          const range=document.createRange();range.selectNodeContents(node);
          const r=range.getBoundingClientRect();
          return {text:node.innerText.trim(),x:r.x,right:r.right,y:r.y,color:getComputedStyle(node).color};
        });
        return {rect:root.getBoundingClientRect().toJSON(),align:getComputedStyle(root).textAlign,direction:getComputedStyle(root).direction,rows};
      })()`);
      const expectedLeft = probe.rect.x;
      if (probe.align !== 'left' || probe.rows.length !== 3 || probe.rows.some(row => Math.abs(row.x - expectedLeft) > 4)) {
        throw new Error(`Hebrew menu rows do not start at the original text anchor: ${JSON.stringify(probe)}`);
      }
      const screenshot = await capture('main-menu-hebrew-fixed');
      const menuKey = async (key, code, virtualKey) => {
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey });
        await wait(160);
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey });
        await wait(220);
      };
      await evaluate(`document.querySelector('#screen')?.focus()`);
      await menuKey('ArrowDown', 'ArrowDown', 0x28);
      const selected = await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`, value => value >= 0 && value % 16 === 1, 'second Hebrew menu selection');
      const selectionScreenshot = await capture('main-menu-hebrew-selection');
      await menuKey('ArrowUp', 'ArrowUp', 0x26);
      await menuKey('Enter', 'Enter', 0x0d);
      const submenuState = await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`, value => value >= 0 && Math.floor(value / 16) === 1, 'native Play submenu');
      await wait(120);
      const submenu = await evaluate(`(() => {const state=window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[]);const rows=[...document.querySelectorAll('#hebrew-gxt-layer .hebrew-gxt-text')].filter(n=>n.innerText.trim()).map(n=>({text:n.innerText.trim(),fontType:Number(n.dataset.fontType),color:getComputedStyle(n).color,selected:n.classList.contains('native-menu-selected'),cursor:getComputedStyle(n,'::before').content,rect:n.getBoundingClientRect().toJSON()}));return {overlayHidden:document.querySelector('#main-menu-hebrew')?.hidden,translated:rows.map(row=>row.text),rows,mainMenuState:state}})()`);
      if (!submenu.overlayHidden || !submenu.translated.some(text => /מחוז|התחל|דאונטאון|Residential|Industrial/i.test(text))) {
        throw new Error(`native Play submenu did not switch cleanly to Hebrew GXT text: ${JSON.stringify({submenuState,submenu})}`);
      }
      const highlighted = submenu.rows.filter((row) => row.selected);
      if (highlighted.length !== 1 || highlighted[0].color !== 'rgb(237, 32, 36)' || highlighted[0].cursor !== '"◀"') {
        throw new Error(`the native selected submenu option needs its original red color and visible RTL cursor: ${JSON.stringify({submenuState,submenu})}`);
      }
      submenu.missingGxt = await evaluate(`window.gta2GxtAudit?.snapshot() || []`);
      const submenuScreenshot = await capture('main-menu-hebrew-play-submenu');
      await menuKey('ArrowUp', 'ArrowUp', 0x26);
      const movedSubmenuState = await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`, (value) => value === 18, 'Hebrew submenu selection moves to the previous row');
      await wait(120);
      const movedSubmenu = await evaluate(`(() => [...document.querySelectorAll('#hebrew-gxt-layer .hebrew-gxt-text')].filter(n=>n.classList.contains('native-menu-selected')).map(n=>({text:n.innerText.trim(),color:getComputedStyle(n).color,cursor:getComputedStyle(n,'::before').content})))()`);
      if (movedSubmenu.length !== 1 || movedSubmenu[0].text !== 'הצגת שיאים' || movedSubmenu[0].color !== 'rgb(237, 32, 36)' || movedSubmenu[0].cursor !== '"◀"') {
        throw new Error(`the red selection indicator did not move with keyboard navigation: ${JSON.stringify({movedSubmenuState,movedSubmenu})}`);
      }
      const movedSubmenuScreenshot = await capture('main-menu-hebrew-play-submenu-selection-moved');
      await evaluate(`localStorage.setItem('gta2-port-lang', 'en')`);
      await navigate(`${BASE}?devdata`);
      await waitFor(`(() => {const m=window.gta2?.Module;return !!m&&document.documentElement.lang==='en'&&m.ccall('gta2_port_frontend_menu_state','number',[],[])===0})()`, Boolean, 'English native main menu');
      await evaluate(`document.querySelector('#screen')?.focus()`);
      await menuKey('Enter', 'Enter', 0x0d);
      const englishSubmenuState = await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`, (value) => value >= 16 && Math.floor(value / 16) === 1, 'English Play submenu');
      await wait(120);
      const englishSubmenu = await evaluate(`(() => ({state:window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[]),translated:[...document.querySelectorAll('#hebrew-gxt-layer .hebrew-gxt-text')].map(n=>n.innerText.trim()).filter(Boolean),overlayHidden:document.querySelector('#main-menu-hebrew')?.hidden}))()`);
      if (englishSubmenu.translated.length || !englishSubmenu.overlayHidden) throw new Error(`English submenu shows Hebrew overlays: ${JSON.stringify(englishSubmenu)}`);
      const englishSubmenuScreenshot = await capture('main-menu-english-play-submenu');
      console.log(JSON.stringify({ hebrewMainMenu: { probe, screenshot, selected, selectionScreenshot, submenuState, submenu, submenuScreenshot,
        movedSubmenuState, movedSubmenu, movedSubmenuScreenshot,
        englishSubmenuState, englishSubmenu, englishSubmenuScreenshot,
        note: 'Same 1200x800 game viewport; original frontend handles menu selection and submenu.' } }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_COOP_TWO_TABS) {
      const browserCdp = await connectCdp(version.webSocketDebuggerUrl);
      const created = await browserCdp.send('Target.createTarget', { url: 'about:blank' });
      let guestTarget;
      for (let i = 0; i < 100 && !guestTarget; i++) {
        guestTarget = (await json(`http://${CDP_HOST}:${PORT}/json/list`)).find((target) => target.id === created.targetId);
        if (!guestTarget) await wait(100);
      }
      if (!guestTarget) throw new Error('could not create the isolated second browser tab');
      const guest = await connectCdp(guestTarget.webSocketDebuggerUrl);
      await guest.send('Page.enable');
      await guest.send('Runtime.enable');
      await guest.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
      const guestEvaluate = async (expression) => {
        const result = await guest.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'guest page evaluation failed');
        return result.result?.value;
      };
      const guestWaitFor = async (probe, predicate, label, timeoutMs = 45000) => {
        const end = Date.now() + timeoutMs;
        let value;
        while (Date.now() < end) {
          try { value = await guestEvaluate(probe); } catch { /* page is loading */ }
          if (predicate(value)) return value;
          await wait(150);
        }
        throw new Error(`timed out waiting for ${label}; last value=${JSON.stringify(value)}`);
      };
      await navigate(`${BASE}?coop&devdata`);
      await waitFor(`!!document.querySelector('#coop-host') && !document.querySelector('#coop')?.hidden && !document.body.classList.contains('booting')`, Boolean, 'host lobby controls ready');
      await evaluate(`(() => {document.querySelector('#coop-name').value='QA Host';document.querySelector('#coop-host').click();return true})()`);
      const code = await waitFor(`window.gta2Lobby?.host ? window.gta2Lobby.code : ''`, Boolean, 'host room code', 15000)
        .catch(async (error) => {
          const diagnostics = await evaluate(`(() => ({url:location.href,status:document.querySelector('#status')?.innerText,connectState:document.querySelector('#coop-state')?.innerText,hostDisabled:document.querySelector('#coop-host')?.disabled,errors:window.gta2Errors||[],scripts:[...performance.getEntriesByType('resource')].map(r=>r.name).filter(n=>/tracker|torrent|trystero|webrtc/i.test(n)).slice(-15)}))()`);
          throw new Error(`${error.message}; WebRTC host diagnostics=${JSON.stringify(diagnostics)}`);
        });
      await guest.send('Page.navigate', { url: `${BASE}?coop&devdata` });
      await guestWaitFor(`!!document.querySelector('#coop-join') && !document.querySelector('#coop')?.hidden && !document.body.classList.contains('booting')`, Boolean, 'guest lobby controls ready');
      await guestEvaluate(`(() => {document.querySelector('#coop-name').value='QA Guest';document.querySelector('#coop-code').value=${JSON.stringify(code)};document.querySelector('#coop-join').click();return true})()`);
      const players = await waitFor(`window.gta2Lobby?.players?.length`, (value) => value === 2, 'host sees the second WebRTC peer', 60000);
      const guestPlayers = await guestWaitFor(`window.gta2Lobby?.players?.length`, (value) => value === 2, 'guest receives the two-player roster', 60000);
      await wait(2500); // allow the transport's peer ping and roster refresh
      const lobbyState = await evaluate(`(() => ({code:window.gta2Lobby.code,host:window.gta2Lobby.host,players:window.gta2Lobby.players.map(p=>({name:p.name,id:p.id,ping:p.ping??null})),startProblem:window.gta2Lobby.startProblem()}))()`);
      const guestState = await guestEvaluate(`(() => ({host:window.gta2Lobby.host,players:window.gta2Lobby.players.map(p=>({name:p.name,id:p.id})),startProblem:window.gta2Lobby.startProblem()}))()`);
      if (lobbyState.players.length !== 2 || guestState.players.length !== 2 || lobbyState.startProblem) {
        throw new Error(`two-tab WebRTC lobby failed its roster/start checks: ${JSON.stringify({lobbyState,guestState,players,guestPlayers})}`);
      }
      const hostLobbyCapture = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const lobbyHostScreenshot = path.join(outDir, 'coop-two-tab-host-lobby.png');
      await fs.writeFile(lobbyHostScreenshot, Buffer.from(hostLobbyCapture.data, 'base64'));
      const guestLobbyCapture = await guest.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const lobbyGuestScreenshot = path.join(outDir, 'coop-two-tab-guest-lobby.png');
      await fs.writeFile(lobbyGuestScreenshot, Buffer.from(guestLobbyCapture.data, 'base64'));
      if (!process.env.GTA2_QA_COOP_START_MATCH) {
        await guest.send('Page.close');
        guest.ws.close();
        browserCdp.ws.close();
        console.log(JSON.stringify({ twoTabWebRtcLobby: { lobbyState, guestState, lobbyHostScreenshot, lobbyGuestScreenshot,
          gameplayStarted: false, note: 'P2P room, peer roster, and start readiness verified; full game startup requires loading 455 MB per tab in this local dev-data profile and was intentionally not attempted.' } }, null, 2));
        return;
      }
      await evaluate(`document.querySelector('#coop-start')?.click()`);
      await waitFor(`window.gta2?.coop && window.gta2?.Module && window.gta2?.map`, Boolean, 'host entered the multiplayer game', 120000);
      await guestWaitFor(`window.gta2?.coop && window.gta2?.Module && window.gta2?.map`, Boolean, 'guest entered the multiplayer game', 120000);
      await waitFor(`window.gta2.dev?.state()?.player === true`, Boolean, 'host game player spawn', 45000);
      await guestWaitFor(`window.gta2.dev?.state()?.player === true`, Boolean, 'guest game player spawn', 45000);
      await wait(4000);
      const match = await evaluate(`(() => ({players:window.gta2.coop.players.map(p=>p.name),mySlot:window.gta2.coop.mySlot,mode:window.gta2.coop.mode,district:window.gta2.coop.district,banner:document.querySelector('#coop-banner')?.innerText||'',state:window.gta2.dev.state()}))()`);
      const guestMatch = await guestEvaluate(`(() => ({players:window.gta2.coop.players.map(p=>p.name),mySlot:window.gta2.coop.mySlot,mode:window.gta2.coop.mode,district:window.gta2.coop.district,banner:document.querySelector('#coop-banner')?.innerText||'',state:window.gta2.dev.state()}))()`);
      if (match.mySlot === guestMatch.mySlot || match.players.length !== 2 || guestMatch.players.length !== 2) {
        throw new Error(`multiplayer match did not start consistently on both peers: ${JSON.stringify({match,guestMatch})}`);
      }
      const hostScreenshot = await capture('coop-two-tab-host-in-game');
      const guestScreenshotResult = await guest.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const guestScreenshot = path.join(outDir, 'coop-two-tab-guest-in-game.png');
      await fs.writeFile(guestScreenshot, Buffer.from(guestScreenshotResult.data, 'base64'));
      await guest.send('Page.close');
      guest.ws.close();
      browserCdp.ws.close();
      console.log(JSON.stringify({ twoTabWebRtcMatch: { lobbyState, guestState, match, guestMatch, hostScreenshot, guestScreenshot } }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_CROSS_VERSION_SAVE) {
      const oldBuild = process.env.GTA2_QA_OLD_BUILD || '0e12350cadd27f59f6af8a3a';
      await navigate(`${BASE}old/${oldBuild}/?devdata&autostart`);
      await waitFor(`typeof window.gta2?.states?.save === 'function'`, Boolean, 'archived version save API');
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player spawn in archived version', 120000);
      const oldRules = await evaluate(`window.gta2.states.rules()`);
      if (!oldRules.player || oldRules.stars || oldRules.onJob) throw new Error(`archived save test needs safe gameplay: ${JSON.stringify(oldRules)}`);
      const oldState = await evaluate(`window.gta2.dev.state()`);
      const oldSaved = await evaluate(`window.gta2.states.save('s1',{free:true,quiet:true})`);
      if (!oldSaved) throw new Error('archived version could not create a real game save');
      const oldRecord = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('gta2-port-states');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const q=r.result.transaction('states','readonly').objectStore('states').get('s1');q.onsuccess=()=>resolve({slot:q.result?.slot,build:q.result?.build,size:q.result?.size,blob:q.result?.data?.size});q.onerror=()=>reject(q.error)}})`);
      if (oldRecord.slot !== 's1' || oldRecord.build !== oldBuild || !oldRecord.blob) {
        throw new Error(`archived version save metadata is unexpected: ${JSON.stringify({oldBuild,oldRecord})}`);
      }
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`typeof window.gta2?.states?.load === 'function'`, Boolean, 'current version save UI');
      const newBuild = await evaluate(`new Promise((resolve,reject)=>{fetch('gta2.wasm').then(r=>r.arrayBuffer()).then(b=>crypto.subtle.digest('SHA-256',b)).then(d=>resolve(Array.from(new Uint8Array(d).slice(0,12),x=>x.toString(16).padStart(2,'0')) .join(''))).catch(reject)})`);
      const currentRecord = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('gta2-port-states');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const q=r.result.transaction('states','readonly').objectStore('states').get('s1');q.onsuccess=()=>resolve({slot:q.result?.slot,build:q.result?.build,size:q.result?.size});q.onerror=()=>reject(q.error)}})`);
      if (currentRecord.build !== oldBuild || currentRecord.build === newBuild) throw new Error(`current app did not retain the archived save as an older build: ${JSON.stringify({oldBuild,newBuild,currentRecord})}`);
      await evaluate(`document.querySelector('#saves-open')?.click()`);
      const button = await waitFor(`(() => [...document.querySelectorAll('#saves-screen button')].find(b=>b.textContent.includes('פתיחה בגרסה המקורית'))?.textContent)()`, Boolean, 'open-in-original-version action');
      const openRect = await evaluate(`(() => [...document.querySelectorAll('#saves-screen button')].find(b=>b.textContent.includes('פתיחה בגרסה המקורית')).getBoundingClientRect().toJSON())()`);
      const targetBefore = (await json(`http://${CDP_HOST}:${PORT}/json/list`)).map((t) => t.id);
      // Use actual CDP mouse input so window.open is covered by transient user activation.
      const openX = openRect.x + openRect.width / 2, openY = openRect.y + openRect.height / 2;
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: openX, y: openY });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: openX, y: openY, button: 'left', clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: openX, y: openY, button: 'left', clickCount: 1 });
      let oldTab;
      for (let i = 0; i < 100 && !oldTab; i++) {
        const targets = await json(`http://${CDP_HOST}:${PORT}/json/list`);
        oldTab = targets.find((t) => t.type === 'page' && !targetBefore.includes(t.id) && t.url.includes(`/old/${oldBuild}/`));
        if (!oldTab) await wait(100);
      }
      if (!oldTab) throw new Error('the save card did not open its archived game in a new tab');
      const oldCdp = await connectCdp(oldTab.webSocketDebuggerUrl);
      await oldCdp.send('Page.enable');
      await oldCdp.send('Runtime.enable');
      const oldEval = async (expression) => {
        const result = await oldCdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'archived page evaluation failed');
        return result.result?.value;
      };
      const oldWaitFor = async (probe, predicate, label, timeoutMs = 120000) => {
        const end = Date.now() + timeoutMs;
        let value;
        while (Date.now() < end) {
          try { value = await oldEval(probe); } catch { /* archived tab is loading */ }
          if (predicate(value)) return value;
          await wait(150);
        }
        throw new Error(`timed out waiting for ${label}; last value=${JSON.stringify(value)}`);
      };
      await oldWaitFor(`typeof window.gta2?.states?.load === 'function'`, Boolean, 'archived game reopened from save card');
      const loaded = await oldEval(`window.gta2.states.load('s1')`);
      if (!loaded) throw new Error('archived game could not load the save it created');
      const restoredRules = await oldEval(`window.gta2.states.rules()`);
      const restoredGameplay = restoredRules.player === 1 && restoredRules.cash === oldRules.cash && restoredRules.stars === oldRules.stars;
      if (!restoredGameplay) {
        throw new Error(`archived save did not restore its gameplay state: ${JSON.stringify({oldRules,restoredRules})}`);
      }
      await oldCdp.send('Page.close');
      oldCdp.ws.close();
      console.log(JSON.stringify({ crossVersionSave: { oldBuild, newBuild, oldRecord, currentRecord, openButton: button,
        archivedTab: oldTab.url, loaded, restoredGameplay, restoredRules } }));
      return;
    }
    if (process.env.GTA2_QA_BRIEF_QUEUE_ONLY) {
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'release shell and Hebrew renderer', 180000);
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'gameplay spawn for native brief queue test', 120000);
      for (let i = 0; i < 4 && await evaluate('document.documentElement.lang') !== 'he'; i++) {
        await evaluate(`document.querySelector('#lang-toggle')?.click()`);
        await wait(80);
      }
      await waitFor(`document.documentElement.lang==='he'`, Boolean, 'Hebrew language selection');
      const enqueuedAt = Date.now();
      const firstQueued = await evaluate(`window.gta2.Module.ccall('gta2_dev_show_brief','number',['string','number'],['bdone',5000])`);
      const secondQueued = await evaluate(`window.gta2.Module.ccall('gta2_dev_show_brief','number',['string','number'],['arig',-1])`);
      if (firstQueued !== 1 || secondQueued !== 1) throw new Error(`native brief queue rejected a message: ${firstQueued}, ${secondQueued}`);
      const first = await waitFor(`${visibleTranslated}`, (value) => value?.text?.includes('הרכב ממולכד!') && value.text.includes('$5000'),
        'first native brief with its formatted cost', 15000);
      const firstAt = await evaluate('performance.now()');
      const firstScreenshot = await capture('native-brief-queue-first-bdone');
      const second = await waitFor(`${visibleTranslated}`, (value) => value?.text?.includes('הרכב הזה כבר ממולכד!'),
        'second brief after the first message expires', 25000);
      const secondAt = await evaluate('performance.now()');
      const secondScreenshot = await capture('native-brief-queue-second-arig');
      if (secondAt <= firstAt) throw new Error(`brief queue order/time was invalid: ${firstAt}, ${secondAt}`);
      console.log(JSON.stringify({ focusedBriefQueue: { firstQueued, secondQueued, enqueuedAt, first, firstAt,
        firstScreenshot, second, secondAt, secondScreenshot, jobBriefs: await evaluate('window.gta2.map.jobBriefs()') } }));
      return;
    }
    if (process.env.GTA2_QA_CONTEXTUAL_GXT_ONLY) {
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'release shell and Hebrew renderer', 180000);
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'gameplay spawn for contextual GXT checks', 120000);
      for (let i = 0; i < 4 && await evaluate('document.documentElement.lang') !== 'he'; i++) {
        await evaluate(`document.querySelector('#lang-toggle')?.click()`);
        await wait(80);
      }
      await waitFor(`document.documentElement.lang==='he'`, Boolean, 'Hebrew language selection');
      const checks = [
        { key: '1117', text: 'יש לך כבר משימה פעילה', screenshot: 'native-gxt-phone-active-mission' },
        { key: '1407', text: 'הטנק הושמד!', screenshot: 'native-gxt-stop-the-tank-result' },
        { key: '2818', text: 'כבר השלמת את המשימה הזאת', screenshot: 'native-gxt-phone-already-passed' },
        { key: '2819', text: 'המשימה הזאת כבר נכשלה', screenshot: 'native-gxt-phone-already-failed' },
      ];
      const displayed = [];
      for (const test of checks) {
        const queued = await evaluate(`window.gta2.Module.ccall('gta2_dev_show_brief','number',['string','number'],[${JSON.stringify(test.key)},-1])`);
        if (!queued) throw new Error(`contextual GXT ${test.key} was not queued`);
        const state = await waitFor(`(() => {const g=[...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText).join(' '),p=document.querySelector('#mission-brief'),b=p&&!p.hidden?p.querySelector('.mission-brief-text')?.innerText||'':'';return {g,b}})()`,
          (value) => `${value.g} ${value.b}`.includes(test.text), `contextual Hebrew GXT ${test.key}`);
        const inBriefPanel = state.b.includes(test.text);
        if (!inBriefPanel) await evaluate(`document.querySelector('#mission-brief')?.classList.add('qa-hide-brief-panel')`);
        const screenshot = await capture(test.screenshot);
        displayed.push({ key: test.key, text: test.text, route: inBriefPanel ? 'native brief panel' : 'native GXT draw hook', screenshot });
        if (!inBriefPanel) await evaluate(`document.querySelector('#mission-brief')?.classList.remove('qa-hide-brief-panel')`);
        await wait(1100);
      }
      console.log(JSON.stringify({ contextualGxtChecks: displayed }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_TITLE_ONLY) {
      const titleKey = Number(process.env.GTA2_QA_TITLE_TEST || 9002);
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'release shell and Hebrew renderer');
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'gameplay spawn for mission title comparison', 120000);
      const setLanguage = async (language) => {
        for (let i = 0; i < 4 && await evaluate('document.documentElement.lang') !== language; i++) {
          await evaluate(`document.querySelector('#lang-toggle')?.click()`);
          await wait(80);
        }
        await waitFor(`document.documentElement.lang==='${language}'`, Boolean, `${language} language selection`);
      };
      await setLanguage('he');
      const showTitle = async () => {
        const shown = await evaluate(`window.gta2.Module.ccall('gta2_dev_show_mission_title','number',['number'],[${titleKey}])`);
        if (!shown) throw new Error(`mission title ${titleKey} was rejected by the engine`);
        const visible = await waitFor(`window.gta2.Module.ccall('gta2_port_mission_title_key','number',[],[])===${titleKey}`, Boolean,
          `mission title ${titleKey} entered the native queue`, 5000).catch(() => false);
        const translatedVisible = await evaluate(`document.documentElement.lang==='he'&&(()=>{const n=document.querySelector('#mission-title');return n&&!n.hidden&&n.dataset.key==='${titleKey}'})()`);
        const nativeVisible = await evaluate(`document.documentElement.lang==='en'&&window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[])===0`);
        if (!visible || (await evaluate('document.documentElement.lang')) === 'he' && !translatedVisible || (await evaluate('document.documentElement.lang')) === 'en' && !nativeVisible) {
          const diagnostics = await evaluate(`(()=>{const n=document.querySelector('#mission-title');return {title:n?.outerHTML,engineKey:window.gta2.Module.ccall('gta2_port_mission_title_key','number',[],[]),nativeHidden:window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[]),frontend:window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[]),player:window.gta2.dev.state(),lang:document.documentElement.lang}})()`);
          const screenshot = await capture(`mission-title-${titleKey}-not-visible`);
          throw new Error(`mission title not visible after engine accepted it: ${JSON.stringify({ diagnostics, screenshot })}`);
        }
        return true;
      };
      await showTitle();
      const hebrewProbe = await evaluate(`(()=>{const n=document.querySelector('#mission-title');return {lang:document.documentElement.lang,text:n.getAttribute('aria-label'),key:n.dataset.key,rect:n.getBoundingClientRect().toJSON(),fontSize:n.dataset.fontSizeUsed,fitOverflow:n.dataset.fitOverflow}})()`);
      const hebrew = { probe: hebrewProbe, screenshot: await capture(`mission-title-${titleKey}-hebrew-release`) };
      let english = null;
      if (process.env.GTA2_QA_TITLE_ENGLISH_COMPARE) {
        await setLanguage('en');
        await showTitle();
        await wait(120);
        english = { screenshot: await capture(`mission-title-${titleKey}-english-release`),
          probe: await evaluate(`(()=>{const n=document.querySelector('#mission-title');return {lang:document.documentElement.lang,text:n.getAttribute('aria-label'),key:n.dataset.key,rect:n.getBoundingClientRect().toJSON(),nativeHidden:window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[])}})()`) };
        await setLanguage('he');
      }
      console.log(JSON.stringify({ focusedMissionTitle: { titleKey, hebrew, english } }));
      return;
    }
    if (process.env.GTA2_QA_PICKUP_RENDERER_ONLY) {
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'production GXT renderer');
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'live game view for pickup-position screenshot', 120000);
      const results = [];
      for (const item of [
        { source: 'Pistol', expected: 'אקדח', name: 'pickup-semantic-pistol' },
        { source: 'S-Uzi Machine Gun', expected: 'תת־מקלע S-Uzi', name: 'pickup-semantic-suzi' },
      ]) {
        const timer = await evaluate(`(() => {const draw=window.gta2.Module.gta2HebrewGxtDraw;return setInterval(()=>draw(${JSON.stringify(item.source)},5,32,24,1,1,8,5,255,0),40)})()`);
        await waitFor(`(() => [...document.querySelectorAll('.hebrew-gxt-text')].some(n=>n.innerText.trim()===${JSON.stringify(item.expected)}))()`, Boolean, `${item.source} translated renderer node`);
        const node = await evaluate(`(() => {
          const n=[...document.querySelectorAll('.hebrew-gxt-text')].find(x=>x.innerText.trim()===${JSON.stringify(item.expected)});
          const canvas=document.querySelector('#screen');
          const rect=canvas.getBoundingClientRect();
          const dpr=window.devicePixelRatio||1;
          const viewport=window.gta2.Module.gta2Renderer?.viewport||{x:0,w:canvas.width};
          const expectedCenter=rect.left+viewport.x/dpr+viewport.w/(2*dpr);
          const textRect=n.getBoundingClientRect();
          const title=document.querySelector('#mission-title');
          const titleRect=title?.getBoundingClientRect();
          const titleOverlap=!!(title&&!title.hidden&&titleRect&&textRect.left<titleRect.right&&textRect.right>titleRect.left&&textRect.top<titleRect.bottom&&textRect.bottom>titleRect.top);
          return {text:n.innerText,rect:textRect.toJSON(),centered:n.style.transform==='translateX(-50%)',color:n.style.color,expectedCenter,titleOverlap,titleHidden:!title||title.hidden,titleRect:titleRect?.toJSON()};
        })()`);
        if (!node.centered || Math.abs(node.rect.x + node.rect.width / 2 - node.expectedCenter) > 2) throw new Error(`${item.source} was not centered in the rendered viewport: ${JSON.stringify(node)}`);
        results.push({ ...item, node, screenshot: await capture(item.name) });
        await evaluate(`clearInterval(${timer})`);
        await evaluate(`document.querySelectorAll('.hebrew-gxt-text').forEach(n=>n.remove())`);
      }
      console.log(JSON.stringify({ semanticPickupRenderer: results }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_PICKUP_NATIVE_ONLY) {
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'production GXT renderer');
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'live game view for native pickup HUD test', 120000);
      const pickupIndices = (process.env.GTA2_QA_PICKUP_INDICES || '0,1,2,6,9,10')
        .split(',').map((value) => Number(value.trim())).filter(Number.isInteger);
      const viewportSizes = (process.env.GTA2_QA_PICKUP_VIEWPORTS || '')
        .split(',').map((value) => value.trim()).filter(Boolean)
        .map((value) => value.split('x').map(Number))
        .filter((size) => size.length === 2 && size.every((dimension) => Number.isInteger(dimension) && dimension > 0));
      if (!viewportSizes.length) viewportSizes.push([
        Number(process.env.GTA2_QA_WIDTH) || 1200,
        Number(process.env.GTA2_QA_HEIGHT) || 800,
      ]);
      const results = [];
      for (const [width, height] of viewportSizes) {
        await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await wait(350);
        for (const pickupIdx of pickupIndices) {
          const shown = await evaluate(`window.gta2.Module.ccall('gta2_qa_show_pickup','number',['number'],[${pickupIdx}])`);
          if (!shown) throw new Error(`native pickup HUD route rejected index ${pickupIdx}`);
          await waitFor(`(() => [...document.querySelectorAll('.hebrew-gxt-text')].some(n=>n.innerText.trim()))()`, Boolean, `native pickup GXT ${pickupIdx}`);
          await wait(80);
          const node = await evaluate(`(() => {
            const n=[...document.querySelectorAll('.hebrew-gxt-text')].find(x=>x.innerText.trim());
            const canvas=document.querySelector('#screen');
            const rect=canvas.getBoundingClientRect();
            const dpr=window.devicePixelRatio||1;
            const viewport=window.gta2.Module.gta2Renderer?.viewport||{x:0,w:canvas.width};
            const expectedCenter=rect.left+viewport.x/dpr+viewport.w/(2*dpr);
            const textRect=n.getBoundingClientRect();
            const title=document.querySelector('#mission-title');
            const titleRect=title?.getBoundingClientRect();
            const titleOverlap=!!(title&&!title.hidden&&titleRect&&textRect.left<titleRect.right&&textRect.right>titleRect.left&&textRect.top<titleRect.bottom&&textRect.bottom>titleRect.top);
            return {text:n.innerText,rect:textRect.toJSON(),centered:n.style.transform==='translateX(-50%)',color:n.style.color,expectedCenter,titleOverlap,titleHidden:!title||title.hidden,titleRect:titleRect?.toJSON()};
          })()`);
          if (!node.centered || Math.abs(node.rect.x + node.rect.width / 2 - node.expectedCenter) > 2) {
            throw new Error(`native pickup ${pickupIdx} was not centered at ${width}x${height}: ${JSON.stringify(node)}`);
          }
          if (node.titleOverlap) throw new Error(`native pickup ${pickupIdx} overlaps the visible mission title: ${JSON.stringify(node)}`);
          results.push({ viewport: `${width}x${height}`, pickupIdx, node, screenshot: await capture(`pickup-native-current-${width}x${height}-${pickupIdx}`) });
          await wait(900);
        }
      }
      console.log(JSON.stringify({ nativePickupHud: results }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_PICKUP_COLLISION_ONLY) {
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'production GXT renderer');
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'live game view for physical weapon pickup test', 120000);
      const target = await evaluate(`(() => {
        const m=window.gta2.Module;
        const ptr=m._malloc(2048*5*4);
        const count=m.ccall('gta2_port_map_objects','number',['number','number'],[ptr,2048]);
        const objects=[];
        for(let i=0;i<count;i++){
          const off=(ptr>>2)+i*5;
          const model=m.HEAP32[off],x=m.HEAP32[off+1],y=m.HEAP32[off+2],z=m.HEAP32[off+3];
          if(model>=200&&model<=227) objects.push({model,x,y,z});
        }
        m._free(ptr);
        const p=window.gta2.dev.state();
        objects.sort((a,b)=>Math.hypot(a.x/16384-p.x,a.y/16384-p.y)-Math.hypot(b.x/16384-p.x,b.y/16384-p.y));
        return {player:p,pickups:objects.slice(0,8)};
      })()`);
      if (!target.pickups.length) throw new Error(`no physical weapon pickups found in current map: ${JSON.stringify(target)}`);
      const hebrewIndex = Number(process.env.GTA2_QA_PICKUP_PHYSICAL_INDEX || 0);
      if (!Number.isInteger(hebrewIndex) || hebrewIndex < 0 || hebrewIndex >= target.pickups.length) {
        throw new Error(`invalid physical pickup index ${process.env.GTA2_QA_PICKUP_PHYSICAL_INDEX}; current map has ${target.pickups.length} pickups in the QA sample`);
      }
      const result = await evaluate(`(() => {
        const p=${JSON.stringify(target.pickups[hebrewIndex])};
        const x=Math.floor(p.x/16384),y=Math.floor(p.y/16384);
        const moved=window.gta2.dev.teleport(x,y);
        return {moved,x,y,target:p};
      })()`);
      if (!result.moved) throw new Error(`could not teleport the isolated QA player to a weapon pickup: ${JSON.stringify(result)}`);
      await wait(500);
      await evaluate(`window.gta2.dev.hold('ArrowUp',250)`);
      const observed = await waitFor(`(() => {
        const text=[...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText.trim()).find(Boolean);
        return text||null;
      })()`, Boolean, 'weapon pickup collision to produce native translated HUD text', 10000);
      const hebrewLayout = await evaluate(`(() => {
        const node=[...document.querySelectorAll('.hebrew-gxt-text')].find(n=>n.innerText.trim());
        const rect=node?.getBoundingClientRect();
        const canvas=document.querySelector('#screen');
        const canvasRect=canvas.getBoundingClientRect();
        return {text:node?.innerText.trim(),rect:rect?.toJSON(),canvasRect:canvasRect.toJSON(),centerDelta:rect?rect.left+rect.width/2-(canvasRect.left+canvasRect.width/2):null};
      })()`);
      const hebrewScreenshot = await capture(`pickup-physical-collision-hebrew-${hebrewIndex}`);
      let weaponSwitch = null;
      if (process.env.GTA2_QA_PICKUP_SWITCH_WEAPON) {
        const before = await evaluate(`window.gta2.dev.state()`);
        await evaluate(`window.gta2.dev.hold('KeyK',180)`);
        await wait(250);
        const afterNext = await evaluate(`(() => ({player:window.gta2.dev.state(),gxt:[...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText.trim()).filter(Boolean)}))()`);
        const nextScreenshot = await capture(`weapon-switch-next-after-pickup-${hebrewIndex}`);
        await evaluate(`window.gta2.dev.hold('KeyJ',180)`);
        await wait(250);
        const afterPrevious = await evaluate(`(() => ({player:window.gta2.dev.state(),gxt:[...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText.trim()).filter(Boolean)}))()`);
        weaponSwitch = { before, afterNext, nextScreenshot, afterPrevious, previousScreenshot: await capture(`weapon-switch-previous-after-pickup-${hebrewIndex}`) };
      }
      let englishComparison = null;
      if (target.pickups.length > 1) {
        await evaluate(`document.querySelector('#lang-toggle')?.click()`);
        await waitFor(`document.documentElement.lang==='en'`, Boolean, 'English toggle for physical pickup comparison');
        const englishIndex = (hebrewIndex + 1) % target.pickups.length;
        const englishTarget = target.pickups[englishIndex];
        const teleported = await evaluate(`(() => {const p=${JSON.stringify(englishTarget)};return {moved:window.gta2.dev.teleport(Math.floor(p.x/16384),Math.floor(p.y/16384)),target:p}})()`);
        if (!teleported.moved) throw new Error(`could not move the isolated QA player to the English comparison pickup: ${JSON.stringify(teleported)}`);
        await wait(500);
        await evaluate(`window.gta2.dev.hold('ArrowUp',250)`);
        const englishDomText = await waitFor(`(() => [...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText.trim()).find(Boolean)||'')()`,
          (value) => value === '', 'English pickup fallback without Hebrew overlay', 10000);
        englishComparison = { englishDomText, target: teleported, screenshot: await capture(`pickup-physical-collision-english-${englishIndex}`) };
      }
      console.log(JSON.stringify({ physicalPickupCollision: { target, hebrewIndex, teleportedTo: result, translatedText: observed, hebrewLayout, hebrewScreenshot, weaponSwitch, englishComparison } }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_FATAL_EVENTS_ONLY) {
      const events = [
        { name: 'arrest', hook: 'gta2_qa_bust_player', expected: 'נעצרת!', screenshot: 'fatal-event-arrest' },
        { name: 'death', hook: 'gta2_qa_kill_player', expected: 'חוסלת!', screenshot: 'fatal-event-death' },
      ];
      const results = [];
      for (const event of events) {
        await navigate(`${BASE}?devdata&autostart`);
        await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'production GXT renderer');
        await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, `live game view before ${event.name} event`, 120000);
        if (await evaluate('document.documentElement.lang') !== 'he') throw new Error('fatal-event QA expects Hebrew as the initial language');
        const triggered = await evaluate(`window.gta2.Module.ccall(${JSON.stringify(event.hook)},'number',[],[])`);
        if (!triggered) throw new Error(`engine rejected QA ${event.name} trigger`);
        const text = await waitFor(`(() => [...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText.trim()).filter(Boolean))()`,
          (values) => values.includes(event.expected), `translated ${event.name} HUD text`);
        results.push({ event: event.name, expected: event.expected, text, screenshot: await capture(event.screenshot) });
      }
      console.log(JSON.stringify({ fatalEventHud: results }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_KF_COLLISION_ONLY) {
      await navigate(`${BASE}?devdata`);
      await waitFor(`typeof window.gta2?.Module?.gta2HebrewGxtDraw === 'function'`, Boolean, 'production GXT renderer');
      await waitFor(`window.gta2?.Module?.ccall('gta2_port_frontend_menu_state','number',[],[]) >= 0`, Boolean, 'original frontend menu', 120000);
      const menuKey = async (name, code, virtualKey) => {
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: virtualKey });
        await wait(160);
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: virtualKey });
        await wait(220);
      };
      await evaluate(`document.querySelector('#screen')?.focus()`);
      let menuState = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
      if (Math.floor(menuState / 16) !== 0) throw new Error(`expected original start menu, got state ${menuState}`);
      while (menuState % 16 > 0) {
        await menuKey('ArrowUp', 'ArrowUp', 0x26);
        menuState = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
      }
      await menuKey('Enter', 'Enter', 0x0d);
      await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`, (v) => Math.floor(v / 16) === 1, 'original Play menu');
      const unlocked = await evaluate(`window.gta2.Module.ccall('gta2_dev_unlock_areas','number',[],[])`);
      if (unlocked !== 1) throw new Error(`could not unlock isolated QA districts: ${unlocked}`);
      await evaluate(`document.querySelector('#screen')?.focus()`);
      menuState = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
      while (menuState % 16 < 3) {
        await menuKey('ArrowDown', 'ArrowDown', 0x28);
        menuState = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
      }
      while (menuState % 16 > 3) {
        await menuKey('ArrowUp', 'ArrowUp', 0x26);
        menuState = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
      }
      let district = await evaluate(`window.gta2.Module.ccall('gta2_qa_main_stage','number',[],[])`);
      for (let i = 0; district !== 0 && i < 4; i++) {
        const right = (3 - district) % 3 <= 1;
        await menuKey(right ? 'ArrowRight' : 'ArrowLeft', right ? 'ArrowRight' : 'ArrowLeft', right ? 0x27 : 0x25);
        district = await evaluate(`window.gta2.Module.ccall('gta2_qa_main_stage','number',[],[])`);
      }
      if (district !== 0) throw new Error(`could not select Downtown for Kill Frenzy test: ${district}`);
      await menuKey('Enter', 'Enter', 0x0d);
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'Downtown gameplay for Kill Frenzy test', 120000);
      if (await evaluate('document.documentElement.lang') !== 'he') throw new Error('Kill Frenzy QA requires Hebrew as the initial language');
      await evaluate(`(() => {window.__gta2QaSeenGxt=[];window.__gta2QaSeenGxtDetails=[];window.__gta2QaDirectDraws=[];const m=window.gta2.Module,original=m.gta2HebrewGxtDraw;m.gta2HebrewGxtDraw=function(...args){const result=original(...args);if(args[0]==='K.F.'&&window.__gta2QaDirectDraws.length<12)window.__gta2QaDirectDraws.push({args,result});return result};const root=document.getElementById('hebrew-gxt-layer');if(!root)return false;new MutationObserver(()=>{for(const n of root.querySelectorAll('.hebrew-gxt-text')){const text=n.innerText.trim();if(text&&!window.__gta2QaSeenGxt.includes(text))window.__gta2QaSeenGxt.push(text);if(text==='חיסול')window.__gta2QaSeenGxtDetails.push({rect:n.getBoundingClientRect().toJSON(),computed:{display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility,opacity:getComputedStyle(n).opacity,color:getComputedStyle(n).color,fontSize:getComputedStyle(n).fontSize,lineHeight:getComputedStyle(n).lineHeight},dataset:{...n.dataset},html:n.innerHTML,clientRects:n.getClientRects().length})}}).observe(root,{childList:true,subtree:true,characterData:true});return true})()`);
      const target = await evaluate(`(() => {
        const m=window.gta2.Module,ptr=m._malloc(2048*5*4);
        const count=m.ccall('gta2_port_map_objects','number',['number','number'],[ptr,2048]);
        const objects=[];
        for(let i=0;i<count;i++){const off=(ptr>>2)+i*5;const model=m.HEAP32[off];if(model===286)objects.push({x:m.HEAP32[off+1],y:m.HEAP32[off+2],z:m.HEAP32[off+3]})}
        m._free(ptr);
        const player=window.gta2.dev.state();
        objects.sort((a,b)=>Math.abs(a.z/16384-player.z)-Math.abs(b.z/16384-player.z)||
          Math.hypot(a.x/16384-player.x,a.y/16384-player.y)-Math.hypot(b.x/16384-player.x,b.y/16384-player.y));
        return {player,objects};
      })()`);
      if (!target.objects.length) throw new Error(`no live Kill Frenzy marker (model 286) on the current map: ${JSON.stringify(target)}`);
      const position = await evaluate(`(() => {const p=${JSON.stringify(target.objects[0])};return {moved:window.gta2.dev.teleport(Math.floor(p.x/16384),Math.floor(p.y/16384)),target:p}})()`);
      position.playerBefore = target.player;
      if (!position.moved) throw new Error(`could not move the isolated player to the native Kill Frenzy marker: ${JSON.stringify(position)}`);
      await wait(500);
      const probe = `(() => {const panel=document.querySelector('#mission-brief'),text=panel?.querySelector('.mission-brief-text'),title=document.querySelector('#mission-title');return {gxt:[...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText.trim()).filter(Boolean),gxtDetails:[...document.querySelectorAll('.hebrew-gxt-text')].filter(n=>n.innerText.trim()==='חיסול').map(n=>({rect:n.getBoundingClientRect().toJSON(),computed:{display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility,opacity:getComputedStyle(n).opacity,color:getComputedStyle(n).color,fontSize:getComputedStyle(n).fontSize,lineHeight:getComputedStyle(n).lineHeight,transform:getComputedStyle(n).transform},dataset:{...n.dataset},html:n.innerHTML,clientRects:n.getClientRects().length})),seen:window.__gta2QaSeenGxt||[],seenDetails:window.__gta2QaSeenGxtDetails||[],directDraws:window.__gta2QaDirectDraws||[],brief:text?.innerText||'',briefVisible:!!panel&&!panel.hidden&&!!text?.getClientRects().length,briefRect:text?.getBoundingClientRect().toJSON()||null,title:title?.dataset.text||'',titleKey:title?.dataset.key||'',titleVisible:!!title&&!title.hidden,player:window.gta2.dev.state()}})()`;
      const beforeInteraction = await evaluate(probe);
      const preInteractionScreenshot = await capture('kill-frenzy-before-interaction');
      await evaluate(`window.gta2.dev.hold('ArrowUp',250)`);
      await evaluate(`window.gta2.dev.hold('Enter',700)`);
      const startState = await waitFor(probe, (value) => value.player.weapon >= 0, 'native Kill Frenzy weapon/timer activation', 12000);
      const screenshot = await capture('kill-frenzy-native-start');
      if (process.env.GTA2_QA_KF_NATIVE_MESSAGE) {
        const cases = [
          { key: 'kfstart', title: 'אתגר חיסול!', name: 'start' },
          { key: 'kfpass', title: 'אתגר החיסול הושלם!', name: 'pass' },
          { key: 'kffail', title: 'אתגר החיסול נכשל!', name: 'fail' },
        ];
        const messages = [];
        for (const item of cases) {
          const shown = await evaluate(`window.gta2.Module.ccall('gta2_qa_show_hud_gxt','number',['string'],[${JSON.stringify(item.key)}])`);
          if (shown !== 1) throw new Error(`engine rejected native ${item.key} HUD message probe`);
          const messageState = await waitFor(probe, (value) => value.title === item.title && value.titleVisible,
            `translated ${item.key} through native HUD message queue`, 5000);
          const messageScreenshot = await capture(`kill-frenzy-native-hud-${item.name}`);
          messages.push({ key: item.key, shown, messageState, messageScreenshot });
        }
        console.log(JSON.stringify({ nativeKillFrenzyHudMessages: messages }, null, 2));
        return;
      }
      if (process.env.GTA2_QA_KF_TRY_PASS) {
        const spawned = await evaluate(`(() => {const spots=[[2,-2],[2,0],[2,2],[3,-3],[3,-1],[3,1],[3,3],[4,-2],[4,0],[4,2],[5,-3],[5,-1],[5,1],[5,3],[6,0],[6,2],[6,-2],[7,0]];return spots.map(([x,y])=>({x,y,ok:window.gta2.dev.spawnCar(10,x,y,720)}))})()`);
        const modelCounts = await evaluate(`(() => {const m=window.gta2.Module,p=m._malloc(300*4),n=m.ccall('gta2_dev_object_models','number',['number'],[p]),c=Array.from(m.HEAP32.subarray(p>>2,(p>>2)+300));m._free(p);return {objects:n,model10:c[10],cars:c.slice(0,64).reduce((a,b)=>a+b,0)}})()`);
        const combatSamples = [];
        if (spawned.some((car) => car.ok)) {
          // Default browser controls are WASD; ArrowRight only affects frontend
          // menus. Sweep the player aim while firing, so this exercises the
          // real weapon and vehicle-destruction objective rather than timing out
          // after shooting in one direction.
          for (let i = 0; i < 24; i++) {
            await evaluate(`window.gta2.dev.hold('KeyL',220)`);
            const afterFire = await evaluate('window.gta2.dev.state()');
            await evaluate(`window.gta2.dev.hold('KeyD',120)`);
            const afterTurn = await evaluate('window.gta2.dev.state()');
            combatSamples.push({
              shot: i + 1,
              afterFire: { weapon: afterFire.weapon, ammo: afterFire.ammo, rot: afterFire.rot, x: afterFire.x, y: afterFire.y },
              afterTurn: { weapon: afterTurn.weapon, ammo: afterTurn.ammo, rot: afterTurn.rot, x: afterTurn.x, y: afterTurn.y },
            });
          }
        }
        const modelCountsAfter = await evaluate(`(() => {const m=window.gta2.Module,p=m._malloc(300*4),n=m.ccall('gta2_dev_object_models','number',['number'],[p]),c=Array.from(m.HEAP32.subarray(p>>2,(p>>2)+300));m._free(p);return {objects:n,model10:c[10],cars:c.slice(0,64).reduce((a,b)=>a+b,0)}})()`);
        const result = await waitFor(probe,
          (value) => value.title === 'אתגר החיסול הושלם!' || value.title === 'אתגר החיסול נכשל!',
          'natural Kill Frenzy result after using the weapon', 70000).catch(async (error) => ({ error: error.message, ...(await evaluate(probe)) }));
        const resultScreenshot = await capture('kill-frenzy-try-pass-result');
        console.log(JSON.stringify({ nativeKillFrenzyTryPass: { spawned, modelCounts, modelCountsAfter, combatSamples, result, resultScreenshot } }, null, 2));
        return;
      }
      if (process.env.GTA2_QA_KF_WAIT_FOR_FAIL) {
        if (process.env.GTA2_QA_KF_FAST_FORWARD) {
          await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 65000, maxVirtualTimeTaskStarvationCount: 10000 });
        }
        const failed = await waitFor(probe,
          (value) => value.gxt.includes('אתגר החיסול נכשל!') || value.seen.includes('אתגר החיסול נכשל!') || value.title === 'אתגר החיסול נכשל!',
          'natural Kill Frenzy timeout/failure message', 70000);
        const failureScreenshot = await capture('kill-frenzy-natural-fail');
        console.log(JSON.stringify({ nativeKillFrenzy: { start: startState, startScreenshot: screenshot, fail: failed, failureScreenshot } }, null, 2));
        return;
      }
      console.log(JSON.stringify({ nativeKillFrenzyStart: { position, beforeInteraction, preInteractionScreenshot, active: startState, screenshot } }, null, 2));
      return;
    }
    if (process.env.GTA2_QA_DISTRICT_SWEEP === '1') {
      const districts = ['Downtown', 'Residential', 'Industrial'];
      const requested = process.env.GTA2_QA_DISTRICT_INDEX;
      const targets = requested === undefined ? [0, 1, 2] : [Number(requested)];
      if (targets.some((n) => !Number.isInteger(n) || n < 0 || n > 2)) throw new Error(`invalid district index: ${requested}`);
      const key = async (name, code, virtualKey) => {
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: virtualKey });
        await wait(160);
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: virtualKey });
        await wait(220);
      };
      const sweep = [];
      for (const target of targets) {
        await navigate(`${BASE}?devdata`);
        await waitFor(`(() => {const m=window.gta2?.Module;return !!m && m.ccall('gta2_port_frontend_menu_state','number',[],[]) >= 0})()`, Boolean, `${districts[target]} original frontend menu`, 120000);
        await evaluate(`document.querySelector('#screen')?.focus()`);
        await wait(300);
        let state = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
        if (Math.floor(state / 16) !== 0) throw new Error(`expected start menu before district selection, got ${state}`);
        while (state % 16 > 0) {
          await key('ArrowUp', 'ArrowUp', 0x26);
          state = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
        }
        await key('Enter', 'Enter', 0x0d);
        await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`, (v) => Math.floor(v / 16) === 1, 'Play menu');
        const unlocked = await evaluate(`window.gta2.Module.ccall('gta2_dev_unlock_areas','number',[],[])`);
        if (unlocked !== 1) throw new Error(`could not unlock test districts in isolated profile: ${unlocked}`);
        await evaluate(`document.querySelector('#screen')?.focus()`);
        await wait(250);
        state = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
        while (state % 16 < 3) {
          await key('ArrowDown', 'ArrowDown', 0x28);
          state = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
        }
        while (state % 16 > 3) {
          await key('ArrowUp', 'ArrowUp', 0x26);
          state = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
        }
        let current = await evaluate(`window.gta2.Module.ccall('gta2_qa_main_stage','number',[],[])`);
        const stageArrows = [];
        for (let guard = 0; current !== target && guard < 4; guard++) {
          const right = (target - current + 3) % 3 <= 1;
          await key(right ? 'ArrowRight' : 'ArrowLeft', right ? 'ArrowRight' : 'ArrowLeft', right ? 0x27 : 0x25);
          current = await evaluate(`window.gta2.Module.ccall('gta2_qa_main_stage','number',[],[])`);
          stageArrows.push({current, state: await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`)});
        }
        let stageSelectionMethod = 'keyboard arrows';
        if (current !== target) {
          // QA-only fallback: set the selected district directly, then let the
          // original menu action load its authentic map and mission scripts.
          stageSelectionMethod = 'debug QA stage setter (CDP arrows did not change it)';
          const set = await evaluate(`window.gta2.Module.ccall('gta2_qa_force_main_stage','number',['number'],[${target}])`);
          if (set) current = await evaluate(`window.gta2.Module.ccall('gta2_qa_main_stage','number',[],[])`);
        }
        if (current !== target) throw new Error(`district selector ended at ${current}, expected ${target}; menu state=${state}; arrow probes=${JSON.stringify(stageArrows)}`);
        const selectorScreenshot = await capture(`district-selector-${target}`);
        await key('Enter', 'Enter', 0x0d);
        await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, `${districts[target]} player spawn`, 120000);
        const gameStartScreenshot = await capture(`district-game-start-${target}`);
        for (let gang = 0; gang < 10; gang++) await evaluate(`window.gta2.Module.ccall('gta2_dev_set_respect','number',['number','number'],[${gang},100])`);
        await waitFor(`window.gta2.map.jobs().active.length > 0`, Boolean, `${districts[target]} active mission phone`, 15000);
        const initial = await evaluate(`(() => ({map:window.gta2.map.state(),jobs:window.gta2.map.jobs(),briefs:window.gta2.map.jobBriefs()}))()`);
        const phone = initial.jobs.active.find((item) => item.shown) || initial.jobs.active[0] || null;
        let phoneAccepted = false;
        if (!initial.jobs.onMission && phone) {
          await evaluate(`window.gta2.dev.teleport(${phone.x}, ${phone.y})`);
          await wait(700);
          await evaluate(`window.gta2.dev.hold('Enter', 900)`);
          await waitFor(`window.gta2.map.jobs().onMission === true`, Boolean, `${districts[target]} mission accepted through the original phone`, 12000);
          phoneAccepted = true;
        }
        const postPhoneTimeline = [];
        const settleMs = Math.max(0, Number(process.env.GTA2_QA_DISTRICT_SETTLE_MS) || 0);
        const settleUntil = Date.now() + settleMs;
        while (Date.now() < settleUntil) {
          postPhoneTimeline.push(await evaluate(`(() => ({at:performance.now(),titleKey:window.gta2.Module.ccall('gta2_port_mission_title_key','number',[],[]),briefs:window.gta2.map.jobBriefs().briefs.map(({gxtKey,text})=>({gxtKey,text})),onMission:window.gta2.map.jobs().onMission}))()`));
          await wait(500);
        }
        const liveState = await evaluate(`(() => ({mission:window.gta2.map.jobs(),briefs:window.gta2.map.jobBriefs(),gxt:[...document.querySelectorAll('.hebrew-gxt-text')].map(x=>x.innerText).filter(Boolean)}))()`);
        const title = await waitFor(`window.gta2.Module.ccall('gta2_port_mission_title_key','number',[],[])`, (v) => v > 0, `${districts[target]} native mission title`, 5000).catch(() => 0);
        const titleScreenshot = title ? await capture(`district-mission-title-${target}`) : null;
        const brief = await waitFor(visibleTranslated, Boolean, `${districts[target]} translated mission brief`, 10000).catch(() => null);
        const briefScreenshot = brief ? await capture(`district-mission-brief-${target}`) : null;
        const gxtAudit = process.env.GTA2_QA_GXT_AUDIT ? await evaluate('window.gta2GxtAudit?.snapshot() || []') : null;
        const result = { district: districts[target], stage: current, stageSelectionMethod, mapId: initial.map?.mapId, startupOnMission: initial.jobs.onMission, startupBriefs: initial.briefs.briefs.map((item) => ({ gxtKey: item.gxtKey, face: item.face, text: item.text })), phone, phoneAccepted, postPhoneTimeline, liveState, gxtAudit, titleKey: title, brief, selectorScreenshot, gameStartScreenshot, titleScreenshot, briefScreenshot };
        sweep.push(result);
        console.log(JSON.stringify({ districtLaunchAndMissionCheck: result }));
      }
      const currentGxtAudit = process.env.GTA2_QA_GXT_AUDIT ? await evaluate('window.gta2GxtAudit?.snapshot() || []') : null;
      console.log(JSON.stringify({ districtLaunchAndMissionChecks: sweep, auditSnapshots, currentGxtAudit, note: 'The original Play menu action started each district. If headless Chrome arrow events did not change the district, a debug-only setter selected it; this is not a normal input-path check. Only when no mission was already active did the test accept a gang-phone mission. Area unlock and respect changes occurred only in the isolated QA profile; no release gameplay rules were changed.' }, null, 2));
      return;
    }
    const expected = (process.env.GTA2_QA_ONLY_PICKUP || process.env.GTA2_QA_SAVE_ONLY ? [] : [
      { key: '2306', text: 'קדימה, עלו!', name: 'short-hebrew' },
      { key: '2026', text: '50 מדענים', name: 'numbers-names' },
      { key: '3727', text: 'המאפיה הרוסית', name: 'long-industrial' },
      { key: '1011', text: 'השטח של היאקוזה', name: 'supplemental-yakuza', area: 'Downtown' },
      { key: '1663', text: 'הירושי מת', name: 'supplemental-safehouse', area: 'Downtown' },
      { key: '2042', text: '20 מדענים', name: 'supplemental-kill-frenzy', area: 'Residential' },
      { key: '2043', text: '20 מאנשי זייבאצו', name: 'supplemental-srs', area: 'Residential' },
      { key: '2226', text: 'השוטרים באים', name: 'supplemental-escape', area: 'Residential' },
    ]).filter((item) => !process.env.GTA2_QA_KEYS || process.env.GTA2_QA_KEYS.split(',').includes(item.key));

    if (process.env.GTA2_QA_COMPARE_KEY) {
      const compareKey = process.env.GTA2_QA_COMPARE_KEY;
      await navigate(`${BASE}?devdata&autostart&brief-test=${compareKey}`);
      let hebrew;
      try { hebrew = await waitFor(visibleTranslated, (v) => v && v.text, `Hebrew comparison brief ${compareKey}`); }
      catch (error) {
        const diagnostics = await evaluate(`(() => ({lang:document.documentElement.lang,status:document.querySelector('#status')?.innerText,brief:document.querySelector('#mission-brief')?.outerHTML,game:document.querySelector('#game')?.hidden,tools:document.querySelector('#tools')?.hidden,gameState:window.gta2?.dev?.state?.(),jobBriefs:window.gta2?.map?.jobBriefs?.()}))()`);
        console.log(JSON.stringify({ comparisonFailure: diagnostics }));
        throw error;
      }
      await waitFor(`window.gta2.map.jobBriefs().briefs.some((b) => b.gxtKey === '${compareKey}')`, Boolean, `source GXT ${compareKey}`);
      const hebrewProbe = await evaluate(`(() => { const p=document.querySelector('#mission-brief'),t=p?.querySelector('.mission-brief-text'),m=window.gta2.map;return {panel:p?.getBoundingClientRect().toJSON(),text:t?.getBoundingClientRect().toJSON(),style:t?{font:getComputedStyle(t).font,fontFamily:getComputedStyle(t).fontFamily,lineHeight:getComputedStyle(t).lineHeight,whiteSpace:getComputedStyle(t).whiteSpace,direction:getComputedStyle(t).direction}:null,scrollWidth:t?.scrollWidth,clientWidth:t?.clientWidth,runs:[...(t?.children||[])].map(e=>({text:e.innerText,rect:e.getBoundingClientRect().toJSON()})),canvas:m.gameCanvas.getBoundingClientRect().toJSON(),viewport:m.renderer.viewport,scale:m.renderer.scale};})()`);
      const hebrewShot = await capture('font-compare-hebrew-after');
      let sameStateDialogComparison = null;
      if (process.env.GTA2_QA_DIALOG_SIZE_COMPARE) {
        await evaluate(`(() => {const t=document.querySelector('#mission-brief .mission-brief-text');let s=document.getElementById('gta2-qa-old-dialog-size');if(!s){s=document.createElement('style');s.id='gta2-qa-old-dialog-size';document.head.append(s)}s.textContent='#mission-brief .mission-brief-text{font-size:clamp(20px,2.65vh,22px)!important;line-height:1.38!important;word-spacing:.1em!important}';return true})()`);
        const beforeProbe = await evaluate(`(() => {const t=document.querySelector('#mission-brief .mission-brief-text');return {font:getComputedStyle(t).font,rect:t.getBoundingClientRect().toJSON(),scrollHeight:t.scrollHeight,clientHeight:t.clientHeight}})()`);
        const beforeScreenshot = await capture('dialog-size-before-same-state');
        await evaluate(`(() => {document.getElementById('gta2-qa-old-dialog-size')?.remove();const t=document.querySelector('#mission-brief .mission-brief-text');t.removeAttribute('style');window.gta2.map.positionNativeBriefText(document.querySelector('#mission-brief'));return true})()`);
        await wait(100);
        const afterProbe = await evaluate(`(() => {const t=document.querySelector('#mission-brief .mission-brief-text');return {font:getComputedStyle(t).font,rect:t.getBoundingClientRect().toJSON(),scrollHeight:t.scrollHeight,clientHeight:t.clientHeight}})()`);
        const afterScreenshot = await capture('dialog-size-after-same-state');
        sameStateDialogComparison = {beforeProbe,beforeScreenshot,afterProbe,afterScreenshot};
      }
      const fontFiles = process.env.GTA2_QA_FONT_FILES ? JSON.parse(process.env.GTA2_QA_FONT_FILES) : null;
      const fontComparisons = [];
      if (fontFiles) {
        for (const [name, file] of Object.entries(fontFiles)) {
          const data = (await fs.readFile(file)).toString('base64');
          const family = `GTA2 QA ${name}`;
          const rules = `@font-face{font-family:${JSON.stringify(family)};src:url(data:font/ttf;base64,${data}) format('truetype');font-weight:400;font-display:block}\n#mission-brief .mission-brief-text{font-family:${JSON.stringify(family)},monospace!important}`;
          const styleId = `gta2-qa-font-${name.replace(/[^a-z0-9_-]/gi, '-')}`;
          await evaluate(`(() => { let s=document.getElementById(${JSON.stringify(styleId)});if(!s){s=document.createElement('style');s.id=${JSON.stringify(styleId)};document.head.append(s)}s.textContent=${JSON.stringify(rules)};return true})()`);
          await evaluate(`document.fonts.load('20px ${JSON.stringify(family)}')`);
          await wait(250);
          const probe = await evaluate(`(() => {const t=document.querySelector('#mission-brief .mission-brief-text'),r=document.createRange();r.selectNodeContents(t);const ys=[...r.getClientRects()].map(x=>Math.round(x.y));return {font:getComputedStyle(t).font,fontFamily:getComputedStyle(t).fontFamily,letterSpacing:getComputedStyle(t).letterSpacing,wordSpacing:getComputedStyle(t).wordSpacing,renderedLines:new Set(ys).size,scrollWidth:t.scrollWidth,clientWidth:t.clientWidth,scrollHeight:t.scrollHeight,clientHeight:t.clientHeight}})()`);
          const screenshot = await capture(`font-compare-${name}`);
          fontComparisons.push({ name, screenshot, probe });
        }
        await evaluate(`document.querySelectorAll('[id^="gta2-qa-font-"]').forEach((e)=>e.remove())`);
      }
      await evaluate(`document.querySelector('#lang-toggle')?.click()`);
      await waitFor(`document.documentElement.lang === 'en' && document.querySelector('#mission-brief')?.hidden`, Boolean, 'English language mode and native brief path');
      await waitFor(`window.gta2.map.jobBriefs().briefs.some((b) => b.gxtKey === '${compareKey}')`, Boolean, `same source GXT ${compareKey} in English`);
      await wait(250);
      const englishShot = await capture('font-compare-english-native');
      await evaluate(`localStorage.setItem('gta2-port-lang', 'he')`);
      console.log(JSON.stringify({ fontComparison: { gxtKey: compareKey, hebrew: hebrew.text, hebrewProbe, hebrewShot, sameStateDialogComparison, fontComparisons, englishShot } }));
    }

    if (process.env.GTA2_QA_MAP_TEST) {
      await navigate(`${BASE}?devdata&autostart&brief-test=3727,3727`);
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player before opening map');
      await waitFor(visibleTranslated, (v) => v && v.text, 'translated mission brief before map layout test');
      await waitFor(`window.gta2?.map?.image !== null`, Boolean, 'map image ready', 120000);
      await evaluate(`window.gta2.map.show()`);
      const mapSizes = (process.env.GTA2_QA_MAP_SIZES || '1366x768,1200x800,1920x1080').split(',');
      const mapShots = [];
      for (const size of mapSizes) {
        const [width, height] = size.split('x').map(Number);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await wait(300);
        const metrics = await evaluate(`(() => ({w:innerWidth,h:innerHeight,legend:window.gta2.map.legendBox,briefs:window.gta2.map.jobBriefBox,legendScroll:window.gta2.map.legendMaxScroll,briefScroll:window.gta2.map.jobBriefMaxScroll,tools:document.querySelector('#tools').getBoundingClientRect().toJSON()}))()`);
        mapShots.push({size, metrics, screenshot: await capture(`map-layout-${size}`)});
      }
      await evaluate(`window.gta2.map.close()`);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
      console.log(JSON.stringify({ mapLayoutShots: mapShots }));
    }
    // Keep one page and queue four real GXT briefs via Hud_Brief_704.
    await navigate(`${BASE}?devdata&autostart&brief-test=${expected.map((item) => item.key).join(',')}`);
    if (process.env.GTA2_QA_SAVE_ONLY) {
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player spawn before focused save round trip', 120000);
    }
    const sequence = [];
    for (const item of expected) {
      let state;
      try {
        state = await waitFor(visibleTranslated, (v) => v && v.text.includes(item.text), `translated brief ${item.key}`);
      } catch (error) {
        const diagnostics = await evaluate(`(() => ({lang:document.documentElement.lang,status:document.querySelector('#status')?.innerText,brief:document.querySelector('#mission-brief')?.outerHTML,gameState:window.gta2?.dev?.state?.(),jobBriefs:window.gta2?.map?.jobBriefs?.(),missionStats:window.gta2?.missionText?.stats?.(),hebrewGxtReady:window.gta2?.Module?.gta2HebrewGxtReady,layer:document.querySelector('#hebrew-gxt-layer')?.innerHTML}))()`);
        console.log(JSON.stringify({ briefFailure: { key: item.key, diagnostics, screenshot: await capture(`brief-failure-${item.key}`) } }));
        throw error;
      }
      const visual = await evaluate(`(() => {const p=document.querySelector('#mission-brief'),t=p?.querySelector('.mission-brief-text'),s=t&&getComputedStyle(t),r=t?.getBoundingClientRect();let hit=[];if(r){p.style.pointerEvents='auto';hit=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).slice(0,6).map(e=>({tag:e.tagName,id:e.id,class:e.className,z:getComputedStyle(e).zIndex,opacity:getComputedStyle(e).opacity,display:getComputedStyle(e).display}));p.style.pointerEvents='none'}return {hidden:p?.hidden,rect:r?.toJSON(),text:t?.innerText,color:s?.color,font:s?.font,visibility:s?.visibility,opacity:s?.opacity,overflow:s?.overflow,layoutOverflow:t?.dataset.layoutOverflow,layoutLines:t?.dataset.layoutLines,portrait:document.querySelector('#mission-brief-speaker')?.getBoundingClientRect().toJSON(),hit}})()`);
      const file = await capture(item.name);
      if (process.env.GTA2_QA_CLIP_BRIEF === '1') {
        const clip = await cdp.send('Page.captureScreenshot', {
          format: 'png', clip: { x: visual.rect.x, y: visual.rect.y, width: visual.rect.width, height: visual.rect.height, scale: 2 },
          captureBeyondViewport: false,
        });
        await fs.writeFile(path.join(outDir, `${item.name}-brief-region.png`), Buffer.from(clip.data, 'base64'));
      }
      const area = item.area || (item.key === '3727' ? 'Industrial District' : 'Residential');
      sequence.push({ area, gxtKey: item.key, text: state.text, dir: state.dir, visual, screenshot: file });
      console.log(`captured translated GXT ${item.key}`);
    }

    if (process.env.GTA2_QA_EXTRA_BRIEF === '1105') {
      await navigate(`${BASE}?devdata&autostart&brief-test=1105`);
      const extra = await waitFor(visibleTranslated, (v) => v && v.text.includes('קקי־קקי'), 'supplemental Loonies brief 1105');
      const screenshot = await capture('supplemental-loonies');
      sequence.push({ area: 'Downtown', gxtKey: '1105', text: extra.text, dir: extra.dir, screenshot });
      console.log('captured supplemental GXT 1105 in its own queue run');
    }

    let missionTitleTest = null;
    if (process.env.GTA2_QA_TITLE_TEST) {
      const titleKey = process.env.GTA2_QA_TITLE_TEST;
      await navigate(`${BASE}?devdata&autostart&mission-title-test=${titleKey}`);
      const title = await waitFor(`(() => { const p=document.querySelector('#mission-title'); return p && !p.hidden ? p.getAttribute('aria-label') : ''; })()`, (v) => !!v, `translated mission title ${titleKey}`);
      const titleProbe = await evaluate(`(() => { const p=document.querySelector('#mission-title'); const brief=document.querySelector('#mission-brief'); return {text:p?.getAttribute('aria-label'),rect:p?.getBoundingClientRect().toJSON(),nativeHidden:window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[]),briefRect:brief?.getBoundingClientRect().toJSON(),briefText:brief?.querySelector('.mission-brief-text')?.getBoundingClientRect().toJSON()}; })()`);
      missionTitleTest = { gxtKey: titleKey, text: title, screenshot: await capture(`mission-title-${titleKey}`), probe: titleProbe };
      if (process.env.GTA2_QA_TITLE_ENGLISH_COMPARE) {
        await evaluate(`document.querySelector('#lang-toggle')?.click()`);
        await waitFor(`document.documentElement.lang === 'en' && window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[]) === 0`, Boolean, 'native English mission title');
        await wait(250);
        missionTitleTest.englishNativeScreenshot = await capture(`mission-title-${titleKey}-english-native`);
        await evaluate(`(() => { const b=document.querySelector('#lang-toggle'); for(let i=0;i<3;i++) b?.click(); return true; })()`);
        await waitFor(`document.documentElement.lang === 'he'`, Boolean, 'Hebrew language restored');
        // The native banner expires after its original short display period. Reissue it so this
        // comparison tests the Hebrew renderer, not whether a transient banner stayed alive.
        const restored = await evaluate(`window.gta2.Module.ccall('gta2_dev_show_mission_title','number',['number'],[${titleKey}])`);
        if (!restored) throw new Error(`mission title ${titleKey} could not be reissued after language switch`);
        await waitFor(`!document.querySelector('#mission-title')?.hidden`, Boolean, 'Hebrew mission title restored');
      }
      if (process.env.GTA2_QA_TITLE_FONT_FILE) {
        const file = process.env.GTA2_QA_TITLE_FONT_FILE;
        const data = (await fs.readFile(file)).toString('base64');
        const family = 'GTA2 QA Noto Title';
        await evaluate(`(() => {const s=document.createElement('style');s.id='gta2-qa-title-font';s.textContent=${JSON.stringify(`@font-face{font-family:"${family}";src:url(data:font/ttf;base64,${data}) format('truetype');font-weight:900;font-display:block}`)};document.head.append(s);return true})()`);
        await evaluate(`document.fonts.load('900 36px "${family}"')`);
        const productionRenderer = await evaluate(`window.gta2.map.renderMissionTitle.toString()`);
        const candidateRenderer = productionRenderer.replaceAll('GTA2 Impact Pixel', family);
        await evaluate(`(() => {const m=window.gta2.map,c=document.querySelector('#mission-title');m.renderMissionTitle=new Function('return ({'+${JSON.stringify(candidateRenderer)}+'}).renderMissionTitle')();m.renderMissionTitle(c,${JSON.stringify(title)});return true})()`);
        const titleFontProbe = await evaluate(`(() => {const c=document.querySelector('#mission-title');return {rect:c.getBoundingClientRect().toJSON(),pixelWidth:c.width,pixelHeight:c.height,fontLoaded:document.fonts.check('900 36px "${family}"')}})()`);
        missionTitleTest.candidateFont = { family, probe: titleFontProbe, screenshot: await capture('mission-title-1975-noto-sans-hebrew-black') };
        await evaluate(`(() => {const m=window.gta2.map,c=document.querySelector('#mission-title');m.renderMissionTitle=new Function('return ({'+${JSON.stringify(productionRenderer)}+'}).renderMissionTitle')();m.renderMissionTitle(c,${JSON.stringify(title)});document.getElementById('gta2-qa-title-font')?.remove();return true})()`);
      }
      if (process.env.GTA2_QA_TITLE_RESOLUTIONS) {
        missionTitleTest.resolutionShots = [];
        for (const size of [{ width: 1200, height: 800 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
          await cdp.send('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile: false });
          await wait(450);
          const shown = await evaluate(`window.gta2.Module.ccall('gta2_dev_show_mission_title','number',['number'],[${titleKey}])`);
          if (!shown) throw new Error(`could not show title ${titleKey} at ${size.width}x${size.height}`);
          await wait(120);
          missionTitleTest.resolutionShots.push({ ...size, screenshot: await capture(`mission-title-${titleKey}-${size.width}x${size.height}`), probe: await evaluate(`(()=>{const c=document.querySelector('#mission-title');return {rect:c.getBoundingClientRect().toJSON(),fontSize:c.dataset.fontSizeUsed,fitOverflow:c.dataset.fitOverflow,rendererScale:window.gta2.map.renderer.scale}})()`) });
        }
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
      }
      if (process.env.GTA2_QA_BIDI_TEST) {
        const variants = ['חילוץ זיטזאקי!', 'איפה טריי?', 'נקודה, פסיק: (2)', 'חילוץ Yakuza 50!'];
        const bidiShots = [];
        const first = variants[0];
        const currentTitleFn = await evaluate(`window.gta2.map.renderMissionTitle.toString()`);
        const legacyTitleFn = currentTitleFn.replaceAll("ctx.direction = 'rtl';", "ctx.direction = 'ltr';");
        await evaluate(`(() => {const m=window.gta2.map,c=document.querySelector('#mission-title');m.renderMissionTitle=new Function('return ({'+${JSON.stringify(legacyTitleFn)}+'}).renderMissionTitle')();m.renderMissionTitle(c,${JSON.stringify(first)});return true})()`);
        bidiShots.push({ text: first, screenshot: await capture('bidi-title-before') });
        await evaluate(`(() => {const m=window.gta2.map,c=document.querySelector('#mission-title');m.renderMissionTitle=new Function('return ({'+${JSON.stringify(currentTitleFn)}+'}).renderMissionTitle')();m.renderMissionTitle(c,${JSON.stringify(first)});return true})()`);
        for (let i = 0; i < variants.length; i++) {
          const text = variants[i];
          await evaluate(`(() => {const c=document.querySelector('#mission-title');window.gta2.map.renderMissionTitle(c,${JSON.stringify(text)});c.setAttribute('aria-label',${JSON.stringify(text)});return true})()`);
          bidiShots.push({ text, screenshot: await capture(`bidi-title-${i + 1}`) });
        }
        missionTitleTest.bidiShots = bidiShots;
      }
      console.log(`captured translated mission title GXT ${titleKey}`);
    }

    let nativeGxtDraw = null;
    if (process.env.GTA2_QA_NATIVE_GXT) {
      await navigate(`${BASE}?devdata&autostart`);
      try {
        await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player spawn before native GXT draw test', 120000);
      } catch (error) {
        const startup = await evaluate(`(() => ({status:document.querySelector('#status')?.innerText,landingHidden:document.querySelector('#landing')?.hidden,gameHidden:document.querySelector('#game')?.hidden,hasModule:!!window.gta2?.Module,hasCanvas:!!window.gta2?.map?.gameCanvas,devState:window.gta2?.dev?.state?.(),gxtReady:window.gta2?.Module?.gta2HebrewGxtReady}))()`);
        console.log(JSON.stringify({ nativeGxtStartupFailure: startup }));
        throw error;
      }
      await evaluate(`window.gta2.Module.ccall('gta2_port_set_native_brief_text_hidden','void',['number'],[0])`);
      await evaluate(`(() => {const s=document.createElement('style');s.textContent='#mission-brief.qa-hide-brief-panel{visibility:hidden!important}';document.head.append(s);return true})()`);
      const nativeGxtTests = [
        { key: 'bdone', cost: 5000, expected: 'הרכב ממולכד! זה יעלה', name: 'native-gxt-bdone-cost-5000' },
        { key: 'arig', expected: 'הרכב הזה כבר ממולכד', name: 'native-gxt-arig' },
        { key: 'c00', expected: 'אקדח', name: 'native-gxt-weapon' },
        { key: '1901', expected: 'בקבוקי תבערה', name: 'native-gxt-colored-frenzy' },
        { key: '1902', expected: 'כל הכבוד! הצלחת, מותק!', name: 'native-gxt-review-1902' },
        { key: '1904', expected: 'איזה בלגן עשית', name: 'native-gxt-review-1904' },
        { key: '3202', expected: 'איך בכלל הצלחת לעבור?', name: 'native-gxt-review-3202' },
        { key: '3204', expected: 'איך בכלל הצלחת להיכשל?', name: 'native-gxt-review-3204' },
        { key: '801', expected: 'תצוגה מקדימה של GTA2', name: 'native-gxt-review-801' },
        { key: '802', expected: 'בטן מלאה בחומר נפץ', name: 'native-gxt-review-802' },
        { key: '1014', expected: 'אתה חסר תועלת!', name: 'native-gxt-review-1014' },
        { key: '1115', expected: 'זייבאצו לא מנהלים משא ומתן', name: 'native-gxt-review-1115' },
        { key: '1117', expected: 'יש לך כבר משימה פעילה', name: 'native-gxt-phone-active-mission' },
        { key: '1121', expected: '$40,000', name: 'native-gxt-review-1121' },
        { key: '1201', expected: 'לשחד את השוטרים', name: 'native-gxt-review-1201' },
        { key: '1242', expected: 'כמה פעמים עוד תצליח לפשל?', name: 'native-gxt-review-1242' },
        { key: '6102', expected: 'וואו, חבר! הצלחת!', name: 'native-gxt-review-6102' },
        { key: '6104', expected: 'חבל, חבר! פישלת.', name: 'native-gxt-review-6104' },
        { key: '6180', expected: 'לעזאזל, בן אדם', name: 'native-gxt-review-6180' },
        { key: '7002', expected: 'צריך להחנות את ה־Ice-Cream Van', name: 'native-gxt-review-7002' },
        { key: '7012', expected: 'היי! חכה לי!', name: 'native-gxt-review-7012' },
        { key: '8002', expected: 'הקו נכשל!', name: 'native-gxt-review-8002' },
        { key: '1407', expected: 'הטנק הושמד!', name: 'native-gxt-stop-the-tank-result' },
        { key: '2818', expected: 'כבר השלמת את המשימה הזאת', name: 'native-gxt-phone-already-passed' },
        { key: '2819', expected: 'המשימה הזאת כבר נכשלה', name: 'native-gxt-phone-already-failed' },
        { key: 'repdemo', expected: 'צפה שוב', name: 'native-gxt-review-repdemo' },
        { key: '1290', expected: '$5,000', name: 'native-gxt-ice-cream-van-cost' },
        { key: '1402', expected: 'הטנק הזה לא משחק', name: 'native-gxt-tank-warning' },
        { key: '5000', expected: 'הארכת זמן', name: 'native-gxt-time-extended' },
        { key: '5001', expected: 'מקום ראשון', name: 'native-gxt-frenzy-result' },
        { key: '5028', expected: 'לוזר עלוב', name: 'native-gxt-frenzy-failure' },
        { key: '5030', expected: 'אסוף כמה שיותר בונוסים', name: 'native-gxt-frenzy-objective' },
        { key: '5013', expected: 'רכבי הגלידה', name: 'native-gxt-ice-cream-frenzy' },
      ];
      const selectedNativeGxtTests = process.env.GTA2_QA_CONTEXTUAL_GXT_ONLY
        ? nativeGxtTests.filter((test) => ['1117', '1407', '2818', '2819'].includes(String(test.key)))
        : nativeGxtTests;
      for (const test of selectedNativeGxtTests) {
        const cost = Number.isInteger(test.cost) ? test.cost : -1;
        const shown = await evaluate(`window.gta2.Module.ccall('gta2_dev_show_brief','number',['string','number'],[${JSON.stringify(test.key)},${cost}])`);
        if (!shown) throw new Error(`native GXT test key ${test.key} was not queued`);
        const displayState = await waitFor(`(() => {const g=[...document.querySelectorAll('.hebrew-gxt-text')].map(n=>n.innerText).join(' '),p=document.querySelector('#mission-brief'),b=p&&!p.hidden?p.querySelector('.mission-brief-text')?.innerText||'':'';return {g,b}})()`,
          (value) => `${value.g} ${value.b}`.includes(test.expected), `native Hebrew draw ${test.key}`);
        const inBriefPanel = displayState.b.includes(test.expected);
        const text = inBriefPanel ? displayState.b : displayState.g;
        if (test.key === 'bdone' && !/\$5,?000/.test(text)) {
          throw new Error(`native bdone draw omitted the dynamic $5000 parameter: ${text}`);
        }
        if (!inBriefPanel) await evaluate(`document.querySelector('#mission-brief')?.classList.add('qa-hide-brief-panel')`);
        const screenshot = await capture(test.name);
        nativeGxtDraw ||= [];
        nativeGxtDraw.push({ key: test.key, text, route: inBriefPanel ? 'native HUD brief + integrated Hebrew renderer' : 'native GXT draw renderer', screenshot });
        if (!inBriefPanel) await evaluate(`document.querySelector('#mission-brief')?.classList.remove('qa-hide-brief-panel')`);
        await wait(900);
      }
      console.log(JSON.stringify({ nativeGxtDraw }));
      if (process.env.GTA2_QA_NATIVE_GXT_ONLY) return;
    }

    if (process.env.GTA2_QA_PICKUP) {
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player spawn before native pickup-text test');
      const pickupIndices = (process.env.GTA2_QA_PICKUP_INDICES || process.env.GTA2_QA_PICKUP_INDEX || '0')
        .split(',').map((x) => Number(x.trim())).filter(Number.isInteger);
      const triggerPickup = async (pickupIdx, language) => {
        const shown = await evaluate(`window.gta2.Module.ccall('gta2_qa_show_pickup','number',['number'],[${pickupIdx}])`);
        if (!shown) throw new Error(`native pickup HUD route rejected index ${pickupIdx}`);
        await waitFor(`(() => {const n=[...document.querySelectorAll('.hebrew-gxt-text')].find(x=>x.innerText.trim());return document.documentElement.lang==='${language}' && ${language === 'he' ? '!!n' : '!n'} ? true : false})()`, Boolean, `${language} native pickup text route`);
        await wait(80);
        const probe = await evaluate(`(() => {const nodes=[...document.querySelectorAll('.hebrew-gxt-text')].filter(x=>x.innerText.trim()).map(n=>({text:n.innerText,rect:n.getBoundingClientRect().toJSON(),dataset:{x:n.dataset.gxtX,y:n.dataset.gxtY,lineHeight:n.dataset.lineHeight,fontType:n.dataset.fontType,palette:n.dataset.palette}}));return {language:document.documentElement.lang,layer:document.querySelector('#hebrew-gxt-layer')?.getBoundingClientRect().toJSON(),nodes,viewport:window.gta2.Module.gta2Renderer.viewport,scale:window.gta2.Module.gta2Renderer.scale}})()`);
        return { probe, screenshot: await capture(`pickup-native-${language}-${pickupIdx}`) };
      };
      const setLanguage = async (language) => {
        for (let i = 0; i < 4; i++) {
          if (await evaluate('document.documentElement.lang') === language) return;
          await evaluate(`document.querySelector('#lang-toggle')?.click()`);
          await wait(80);
        }
        await waitFor(`document.documentElement.lang === '${language}'`, Boolean, `switch to ${language}`);
      };
      const initialLanguage = await evaluate('document.documentElement.lang');
      if (initialLanguage !== 'he') throw new Error('pickup QA starts in Hebrew; reset the test profile language to he');
      const comparisons = [];
      for (const pickupIdx of pickupIndices) {
        const hebrewBefore = await triggerPickup(pickupIdx, 'he');
        await setLanguage('en');
        const english = await triggerPickup(pickupIdx, 'en');
        await setLanguage('he');
        const hebrewAfter = await triggerPickup(pickupIdx, 'he');
        comparisons.push({ pickupIdx, hebrewBefore, english, hebrewAfter });
      }
      console.log(JSON.stringify({ nativePickup: comparisons }));
    }

    if (process.env.GTA2_QA_ONLY_PICKUP) return;

    let saveRoundTrip = null;
    if (process.env.GTA2_QA_SAVE_ROUNDTRIP) {
      const rules = await evaluate(`window.gta2.states.rules()`);
      if (!rules.player || rules.stars || rules.onJob) throw new Error(`save test needs an ordinary safe state: ${JSON.stringify(rules)}`);
      const stateBefore = await evaluate(`window.gta2.dev.state()`);
      const saved = await evaluate(`window.gta2.states.save('s1',{free:true,quiet:true})`);
      if (!saved) throw new Error('a real single-player game snapshot could not be saved');
      const before = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('gta2-port-states');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result, q=db.transaction('states','readonly').objectStore('states').get('s1');q.onsuccess=()=>resolve({slot:q.result?.slot,build:q.result?.build,size:q.result?.size,blob:q.result?.data?.size});q.onerror=()=>reject(q.error)}})`);
      if (before.slot !== 's1' || !before.build || !before.blob) throw new Error(`saved snapshot is missing from IndexedDB: ${JSON.stringify(before)}`);
      const downloadPath = path.join(profile, 'downloads');
      await fs.mkdir(downloadPath, { recursive: true });
      await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath });
      await evaluate(`document.querySelector('#export-saves').click()`);
      let exportedPath = '';
      for (let i = 0; i < 100 && !exportedPath; i++) {
        const files = await fs.readdir(downloadPath);
        const file = files.find((name) => name.endsWith('.json') && !name.endsWith('.crdownload'));
        if (file) exportedPath = path.join(downloadPath, file);
        else await wait(100);
      }
      if (!exportedPath) throw new Error('export saves did not produce a JSON download');
      const exported = JSON.parse(await fs.readFile(exportedPath, 'utf8'));
      if (exported.format !== 'gta2-port-saves' || !exported.states?.some((state) => state.slot === 's1')) {
        throw new Error('export file does not contain the actual game snapshot');
      }
      await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('gta2-port-states');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('states','readwrite');tx.objectStore('states').delete('s1');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)}})`);
      const root = await cdp.send('DOM.getDocument');
      const input = await cdp.send('DOM.querySelector', { nodeId: root.root.nodeId, selector: '#import-saves' });
      await cdp.send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [exportedPath] });
      await evaluate(`document.querySelector('#import-saves').dispatchEvent(new Event('change',{bubbles:true}))`);
      const imported = await waitFor(`document.querySelector('#status')?.innerText`, (value) => /import/i.test(value || '') || /יובא/.test(value || ''), 'save import status');
      const after = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('gta2-port-states');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result, q=db.transaction('states','readonly').objectStore('states').get('s1');q.onsuccess=()=>resolve({slot:q.result?.slot,build:q.result?.build,size:q.result?.size});q.onerror=()=>reject(q.error)}})`);
      if (after.slot !== 's1' || after.build !== before.build || after.size !== before.size) throw new Error(`imported snapshot differs: ${JSON.stringify(after)}`);
      await evaluate(`location.reload()`);
      await waitFor(`typeof window.gta2?.states?.load === 'function' && window.gta2?.dev?.state()?.player === true`, Boolean,
        'game startup after reloading the page with imported save data', 120000);
      const loaded = await evaluate(`window.gta2.states.load('s1')`);
      if (!loaded) throw new Error('imported game snapshot could not be loaded');
      const stateAfter = await evaluate(`window.gta2.dev.state()`);
      const rulesAfter = await evaluate(`window.gta2.states.rules()`);
      const restoredPosition = Math.abs(stateAfter.x - stateBefore.x) < 0.05 && Math.abs(stateAfter.y - stateBefore.y) < 0.05;
      if (!restoredPosition || rulesAfter.cash !== rules.cash || rulesAfter.stars !== rules.stars) {
        throw new Error(`save did not restore the same safe player state: ${JSON.stringify({stateBefore,stateAfter,rules,rulesAfter})}`);
      }
      saveRoundTrip = { rules, stateBefore, before, exportedFileBytes: (await fs.stat(exportedPath)).size, importStatus: imported, after, reloadCompleted: true, loaded, stateAfter, rulesAfter, restoredPosition };
      console.log(JSON.stringify({ saveRoundTrip }));
      if (process.env.GTA2_QA_SAVE_ONLY) return;
    }

    let missionAttempt = null;
    if (process.env.GTA2_QA_TRY_MISSION) {
      // Start a clean gameplay session so queued QA injections cannot be mistaken
      // for a brief generated by the genuine phone mission.
      await navigate(`${BASE}?devdata&autostart`);
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player spawn before trying a genuine gang phone');
      await waitFor(`window.gta2.map.jobBriefs().briefs.length === 0`, Boolean,
        'QA brief queue cleared before genuine mission attempt', 90000);
      const jobState = await evaluate(`window.gta2.map.jobs()`);
      const phone = jobState.active.find((row) => row.shown) || jobState.active[0];
      if (!phone) {
        missionAttempt = { status: 'no-available-phone', jobs: jobState.jobs };
      } else {
        await evaluate(`window.gta2.dev.teleport(${phone.x}, ${phone.y})`);
        await wait(1500);
        await evaluate(`window.gta2.dev.hold('Enter', 900)`);
        try {
          await waitFor(`window.gta2.map.jobs().onMission === true`, Boolean, 'a mission accepted through the original phone/game flow', 12000);
          const titleTimeline = [];
          let liveTitleScreenshot = null;
          for (let i = 0; i < 24; i++) {
            const titleFrame = await evaluate(`(() => ({key:window.gta2.Module.ccall('gta2_port_mission_title_key','number',[],[]),nativeHidden:window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[]),briefCount:window.gta2.map.jobBriefs().briefs.length}))()`);
            titleTimeline.push(titleFrame);
            if (!liveTitleScreenshot && titleFrame.key && titleFrame.nativeHidden) {
              await wait(250);
              liveTitleScreenshot = await capture('real-downtown-mission-title');
            }
            await wait(100);
          }
          const actualBriefState = await evaluate(`window.gta2.map.jobBriefs()`);
          const live = await evaluate(visibleTranslated);
          const missionTitleState = await evaluate(`(() => ({key:window.gta2.Module.ccall('gta2_port_mission_title_key','number',[],[]),nativeHidden:window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[]),translatedTitle:document.querySelector('#mission-title')?.getAttribute('aria-label'),titleHidden:document.querySelector('#mission-title')?.hidden}))()`);
          let liveBriefOnly = null;
          try {
            await waitFor(`document.querySelector('#mission-title')?.hidden && (${visibleTranslated})`, Boolean,
              'genuine mission brief after the short title banner expires', 9000);
            liveBriefOnly = { status: 'captured-after-title-expiry', screenshot: await capture('real-downtown-live-brief'), state: await evaluate(visibleTranslated) };
          } catch { liveBriefOnly = { status: 'not-captured-before-brief-expired' }; }
          missionAttempt = { status: 'mission-flag-observed', phone, jobBriefs: actualBriefState.briefs, translatedLayer: live, missionTitleState, titleTimeline, liveTitleScreenshot, liveBriefOnly, screenshot: await capture('real-downtown-mission') };
        } catch {
          missionAttempt = { status: 'phone-approach-attempted-no-mission-flag', phone };
        }
      }
      console.log(`mission attempt: ${JSON.stringify(missionAttempt)}`);
    }

    if (process.env.GTA2_QA_FOCUS) {
      const currentGxtAudit = process.env.GTA2_QA_GXT_AUDIT
        ? await evaluate('window.gta2GxtAudit?.snapshot() || []') : null;
      console.log(JSON.stringify({ focusedQa: true, sequence, missionTitleTest, missionAttempt, auditSnapshots, currentGxtAudit }));
      return;
    }

    // An untranslated but valid GXT placeholder must keep the original draw path.
    await navigate(`${BASE}?devdata&autostart&brief-test=1117`);
    const end = Date.now() + 45000;
    let queuedAt = 0;
    while (Date.now() < end && !queuedAt) {
      queuedAt = cdp.events.filter((e) => e.method === 'Runtime.consoleAPICalled')
        .map((e) => (e.params.args || []).map((a) => a.value || a.description || '').join(' '))
        .some((line) => line.includes('queued GXT 1117')) ? Date.now() : 0;
      if (!queuedAt) await wait(100);
    }
    if (!queuedAt) throw new Error('fallback GXT 1117 was not queued by the native HUD hook');
    await waitFor(`document.querySelector('#tools')?.hidden === false`, Boolean, 'game HUD startup after fallback queue');
    await wait(350);
    const fallback = await capture('english-fallback');
    console.log('captured untranslated English fallback GXT 1117');

    // Pause while a translated brief is current: the external HTML text layer must be hidden.
    await navigate(`${BASE}?devdata&autostart&brief-test=3727`);
    await waitFor(visibleTranslated, (v) => v && v.text.includes('המאפיה הרוסית'), 'translated brief before pause');
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    const paused = await waitFor(`!!document.querySelector('#mission-brief')?.hidden`, (v) => v === true, 'Hebrew layer hidden after opening the original pause menu', 15000);
    const pauseMenu = await capture('pause-menu');
    console.log('captured pause menu with Hebrew brief layer hidden');

    // Reload the same page into the original front-end to inspect the menu UI
    // and confirm the mission renderer does not remain over it.
    await navigate(`${BASE}?devdata`);
    await waitFor(`(() => {const m=window.gta2?.Module;return !!m && m.ccall('gta2_port_frontend_menu_state','number',[],[]) >= 0})()`, Boolean, 'original frontend main menu ready', 120000);
    await wait(500);
    const mainMenuProbe = await evaluate(`(() => { const p=document.querySelector('#main-menu-hebrew'), t=document.querySelector('#tools'),g=document.querySelector('#hebrew-gxt-layer'); return {lang:document.documentElement.lang, menuState:window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[]), manualOverlay:p?{hidden:p.hidden,text:p.innerText,rect:p.getBoundingClientRect().toJSON()}:null, nativeGxt:[...(g?.querySelectorAll('.hebrew-gxt-text')||[])].map(e=>({text:e.innerText,rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,color:getComputedStyle(e).color,gxtX:e.dataset.gxtX,gxtY:e.dataset.gxtY,lineHeight:e.dataset.lineHeight,fontType:e.dataset.fontType,paletteType:e.dataset.paletteType,palette:e.dataset.palette})), tools:t?{hidden:t.hidden,display:getComputedStyle(t).display,rect:t.getBoundingClientRect().toJSON()}:null}; })()`);
    const mainMenu = await capture('main-menu');
    console.log('captured original main menu after gameplay reload');

    let mainMenuFontCompare = null;
    if (process.env.GTA2_QA_MENU_FONT_COMPARE) {
      await evaluate(`document.fonts.load('21px "GTA2 Impact Pixel"')`);
      const probeBefore = await evaluate(`(() => {const e=document.querySelector('#main-menu-hebrew');return {rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,fontFamily:getComputedStyle(e).fontFamily}})()`);
      await evaluate(`(() => {let s=document.getElementById('gta2-qa-menu-font');if(!s){s=document.createElement('style');s.id='gta2-qa-menu-font';document.head.append(s)}s.textContent='#main-menu-hebrew{font-family:"GTA2 Impact Pixel",monospace!important;font-weight:400!important}';return true})()`);
      await wait(100);
      const probePixel = await evaluate(`(() => {const e=document.querySelector('#main-menu-hebrew');return {rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,fontFamily:getComputedStyle(e).fontFamily}})()`);
      const pixelScreenshot = await capture('main-menu-hebrew-impact-pixel');
      await evaluate(`document.getElementById('gta2-qa-menu-font').textContent='#main-menu-hebrew{font:400 40px/32.4px "GTA2 Impact Pixel",monospace!important}';document.fonts.load('40px "GTA2 Impact Pixel"')`);
      await wait(100);
      const probeScaled = await evaluate(`(() => {const e=document.querySelector('#main-menu-hebrew');return {rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,fontFamily:getComputedStyle(e).fontFamily}})()`);
      mainMenuFontCompare = { probeBefore, systemScreenshot: mainMenu, probePixel, pixelScreenshot, probeScaled, scaledScreenshot: await capture('main-menu-hebrew-impact-pixel-scaled') };
      await evaluate(`document.getElementById('gta2-qa-menu-font')?.remove()`);
    }

    let mainMenuEnglishCompare = null;
    if (process.env.GTA2_QA_MENU_COMPARE) {
      await evaluate(`localStorage.setItem('gta2-port-lang', 'en')`);
      await navigate(`${BASE}?devdata`);
      await waitFor(`document.documentElement.lang === 'en' && (() => {const m=window.gta2?.Module;return !!m && m.ccall('gta2_port_frontend_menu_state','number',[],[]) >= 0})()`, Boolean, 'English native main menu');
      const englishProbe = await evaluate(`(() => {const p=document.querySelector('#main-menu-hebrew'),g=document.querySelector('#hebrew-gxt-layer');return {lang:document.documentElement.lang,menuState:window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[]),hebrewOverlayHidden:p?.hidden,hebrewOverlayRect:p?.getBoundingClientRect().toJSON(),translatedNodes:[...(g?.querySelectorAll('.hebrew-gxt-text')||[])].filter(e=>e.innerText.trim()).map(e=>e.innerText)}})()`);
      mainMenuEnglishCompare = { englishProbe, englishScreenshot: await capture('main-menu-english-native') };
      await evaluate(`localStorage.setItem('gta2-port-lang', 'he')`);
      await navigate(`${BASE}?devdata`);
      await waitFor(`document.documentElement.lang === 'he' && (() => {const m=window.gta2?.Module;return !!m && m.ccall('gta2_port_frontend_menu_state','number',[],[]) >= 0})()`, Boolean, 'Hebrew main menu restored after comparison');
    }

    if (process.env.GTA2_QA_MENU_COMPARE_ONLY) {
      console.log(JSON.stringify({ mainMenu, mainMenuProbe, mainMenuFontCompare, mainMenuEnglishCompare }, null, 2));
      return;
    }

    const menuNavigation = [];
    await evaluate(`document.querySelector('#screen')?.focus()`);
    const menuKey = async (key, code, virtualKey) => {
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey });
      await wait(180);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey });
      await wait(250);
    };
    await menuKey('ArrowDown', 'ArrowDown', 0x28);
    const selectedOption = await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`,
      (value) => value >= 0 && value % 16 === 1, 'keyboard selection moves to the second main-menu option');
    menuNavigation.push({ state: selectedOption, screenshot: await capture('main-menu-keyboard-selection') });
    await menuKey('Enter', 'Enter', 0x0d);
    await wait(500);
    const afterEnter = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
    const optionsProbe = await evaluate(`(() => ({lang:document.documentElement.lang,menuState:window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[]),menuHidden:document.querySelector('#main-menu-hebrew')?.hidden,menuText:document.querySelector('#main-menu-hebrew')?.innerText,controlsHidden:document.querySelector('#controls-screen')?.hidden}))()`);
    menuNavigation.push({ action: 'Enter on Options', state: afterEnter, probe: optionsProbe, screenshot: await capture('main-menu-options-after-enter') });
    await menuKey('Escape', 'Escape', 0x1b);
    await wait(1200);
    const returnedMenuState = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
    const returnedMenuProbe = await evaluate(`(() => ({lang:document.documentElement.lang,menuState:window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[]),menuHidden:document.querySelector('#main-menu-hebrew')?.hidden,menuText:document.querySelector('#main-menu-hebrew')?.innerText,selected:document.querySelector('#main-menu-hebrew [data-option].selected')?.innerText,controlsHidden:document.querySelector('#controls-screen')?.hidden,toolsHidden:document.querySelector('#tools')?.hidden}))()`);
    menuNavigation.push({ action: 'Escape after Options', state: returnedMenuState, probe: returnedMenuProbe, screenshot: await capture('menu-after-options-escape') });

    const currentGxtAudit = process.env.GTA2_QA_GXT_AUDIT
      ? await evaluate('window.gta2GxtAudit?.snapshot() || []') : null;
    console.log(JSON.stringify({ sequence, missionTitleTest, nativeGxtDraw, saveRoundTrip, missionAttempt, fallback, pauseMenu, paused, mainMenu, mainMenuProbe, mainMenuFontCompare, mainMenuEnglishCompare, menuNavigation, auditSnapshots, currentGxtAudit, notes: 'Injected briefs and mission titles use their native HUD message queues; native GXT tests enqueue GXT strings in the live game and observe the production DrawText hook. A genuine mission is counted only when the engine mission flag changes after using an original gang phone.' }, null, 2));
  } finally {
    if (cdp?.ws.readyState === WebSocket.OPEN) cdp.ws.close();
    chrome.kill();
    await new Promise((resolve) => {
      if (chrome.exitCode !== null) resolve();
      else { const timer = setTimeout(resolve, 3000); chrome.once('exit', () => { clearTimeout(timer); resolve(); }); }
    });
    try { await fs.rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 }); }
    catch (error) { console.warn(`could not remove isolated temporary Chrome profile ${profile}: ${error.message}`); }
  }
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
