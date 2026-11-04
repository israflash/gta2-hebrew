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
const PORT = 9223;
const BASE = 'http://127.0.0.1:8876/';
const outDir = path.join(__dirname, '..', 'game', 'qa-screenshots');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'page evaluation failed');
      return result.result?.value;
    };
    const navigate = async (url) => {
      await cdp.send('Page.navigate', { url });
    };
    const waitFor = async (probe, predicate, label, timeoutMs = 45000) => {
      const end = Date.now() + timeoutMs;
      let value;
      while (Date.now() < end) {
        try { value = await evaluate(probe); } catch { /* startup may briefly block Runtime.evaluate */ }
        if (predicate(value)) return value;
        await wait(150);
      }
      throw new Error(`timed out waiting for ${label}; last value=${JSON.stringify(value)}`);
    };
    const capture = async (name) => {
      const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(outDir, `${name}.png`);
      await fs.writeFile(file, Buffer.from(result.data, 'base64'));
      return file;
    };
    const visibleTranslated = `(() => { const p=document.querySelector('#mission-brief'); const t=p?.querySelector('.mission-brief-text'); return p && !p.hidden && t?.innerText ? {text:t.innerText,dir:p.dir} : null; })()`;
    const expected = [
      { key: '1600', text: 'ברוך הבא למחוז דאונטאון', name: 'downtown-opening' },
      { key: '2306', text: 'קדימה, עלו!', name: 'short-hebrew' },
      { key: '2026', text: '50 מדענים', name: 'numbers-names' },
      { key: '3727', text: 'המאפיה הרוסית', name: 'long-industrial' },
      { key: '1251', text: 'היוטס', name: 'wrapped-downtown' },
    ].filter((item) => !process.env.GTA2_QA_KEYS || process.env.GTA2_QA_KEYS.split(',').includes(item.key));

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
      console.log(JSON.stringify({ fontComparison: { gxtKey: compareKey, hebrew: hebrew.text, hebrewProbe, hebrewShot, fontComparisons, englishShot } }));
    }

    // Keep one page and queue four real GXT briefs via Hud_Brief_704.
    await navigate(`${BASE}?devdata&autostart&brief-test=${expected.map((item) => item.key).join(',')}`);
    const sequence = [];
    for (const item of expected) {
      const state = await waitFor(visibleTranslated, (v) => v && v.text.includes(item.text), `translated brief ${item.key}`);
      const file = await capture(item.name);
      const area = ['1600', '1251'].includes(item.key) ? 'Downtown' : item.key === '3727' ? 'Industrial District' : 'Residential';
      sequence.push({ area, gxtKey: item.key, text: state.text, dir: state.dir, screenshot: file });
      console.log(`captured translated GXT ${item.key}`);
    }

    let missionTitleTest = null;
    if (process.env.GTA2_QA_TITLE_TEST) {
      const titleKey = process.env.GTA2_QA_TITLE_TEST;
      await navigate(`${BASE}?devdata&autostart&mission-title-test=${titleKey}`);
      const title = await waitFor(`(() => { const p=document.querySelector('#mission-title'); return p && !p.hidden ? p.getAttribute('aria-label') : ''; })()`, (v) => !!v, `translated mission title ${titleKey}`);
      const titleProbe = await evaluate(`(() => { const p=document.querySelector('#mission-title'); const brief=document.querySelector('#mission-brief'); return {text:p?.getAttribute('aria-label'),rect:p?.getBoundingClientRect().toJSON(),nativeHidden:window.gta2.Module.ccall('gta2_port_native_mission_title_text_hidden','number',[],[]),briefRect:brief?.getBoundingClientRect().toJSON(),briefText:brief?.querySelector('.mission-brief-text')?.getBoundingClientRect().toJSON()}; })()`);
      missionTitleTest = { gxtKey: titleKey, text: title, screenshot: await capture(`mission-title-${titleKey}`), probe: titleProbe };
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

    let missionAttempt = null;
    if (process.env.GTA2_QA_TRY_MISSION) {
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player spawn before trying a genuine gang phone');
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
          missionAttempt = { status: 'mission-flag-observed', phone, jobBriefs: actualBriefState.briefs, translatedLayer: live, missionTitleState, titleTimeline, liveTitleScreenshot, screenshot: await capture('real-downtown-mission') };
        } catch {
          missionAttempt = { status: 'phone-approach-attempted-no-mission-flag', phone };
        }
      }
      console.log(`mission attempt: ${JSON.stringify(missionAttempt)}`);
    }

    if (process.env.GTA2_QA_FOCUS) {
      console.log(JSON.stringify({ focusedQa: true, missionTitleTest, missionAttempt }));
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
    await waitFor(`document.readyState === 'complete' && !!window.gta2`, Boolean, 'front-end startup');
    await waitFor(`document.querySelector('#main-menu-hebrew') && !document.querySelector('#main-menu-hebrew').hidden`, Boolean, 'Hebrew main menu state');
    await waitFor(`document.querySelector('#tools')?.hidden === true && getComputedStyle(document.querySelector('#tools')).display === 'none'`, Boolean, 'main menu without game controls');
    await wait(1000);
    const mainMenuProbe = await evaluate(`(() => { const p=document.querySelector('#main-menu-hebrew'), t=document.querySelector('#tools'); return {lang:document.documentElement.lang, text:p.innerText, rect:p.getBoundingClientRect().toJSON(), style:getComputedStyle(p).cssText, labels:[...p.children].map(e=>({text:e.innerText,rect:e.getBoundingClientRect().toJSON(),transform:getComputedStyle(e).transform,color:getComputedStyle(e).color})), tools:{hidden:t.hidden,display:getComputedStyle(t).display,rect:t.getBoundingClientRect().toJSON()}}; })()`);
    const mainMenu = await capture('main-menu');
    console.log('captured original main menu after gameplay reload');

    console.log(JSON.stringify({ sequence, missionTitleTest, missionAttempt, fallback, pauseMenu, paused, mainMenu, mainMenuProbe, notes: 'Injected briefs and mission titles use their native HUD message queues; a genuine mission is counted only when the engine mission flag changes after using an original gang phone.' }, null, 2));
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
