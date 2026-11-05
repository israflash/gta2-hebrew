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
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'page evaluation failed');
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
    const expected = [
      { key: '2306', text: 'קדימה, עלו!', name: 'short-hebrew' },
      { key: '2026', text: '50 מדענים', name: 'numbers-names' },
      { key: '3727', text: 'המאפיה הרוסית', name: 'long-industrial' },
      { key: '1011', text: 'השטח של היאקוזה', name: 'supplemental-yakuza', area: 'Downtown' },
      { key: '1663', text: 'הירושי מת', name: 'supplemental-safehouse', area: 'Downtown' },
      { key: '2042', text: '20 מדענים', name: 'supplemental-kill-frenzy', area: 'Residential' },
      { key: '2043', text: '20 מאנשי זייבאצו', name: 'supplemental-srs', area: 'Residential' },
      { key: '2226', text: 'השוטרים באים', name: 'supplemental-escape', area: 'Residential' },
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
      await waitFor(`window.gta2?.dev?.state()?.player === true`, Boolean, 'player spawn before native GXT draw test');
      await evaluate(`window.gta2.Module.ccall('gta2_port_set_native_brief_text_hidden','void',['number'],[0])`);
      await evaluate(`(() => {const s=document.createElement('style');s.textContent='#mission-brief.qa-hide-brief-panel{visibility:hidden!important}';document.head.append(s);return true})()`);
      for (const test of [
        { key: 'bdone', cost: 5000, expected: 'הרכב ממולכד! זה יעלה', name: 'native-gxt-bdone-cost-5000' },
        { key: 'arig', expected: 'הרכב הזה כבר ממולכד', name: 'native-gxt-arig' },
        { key: 'c00', expected: 'אקדח', name: 'native-gxt-weapon' },
        { key: '1901', expected: 'בקבוקי תבערה', name: 'native-gxt-colored-frenzy' },
        { key: '1290', expected: '$5,000', name: 'native-gxt-ice-cream-van-cost' },
        { key: '1402', expected: 'הטנק הזה רציני', name: 'native-gxt-tank-warning' },
        { key: '5000', expected: 'הארכת זמן', name: 'native-gxt-time-extended' },
        { key: '5001', expected: 'מקום ראשון', name: 'native-gxt-frenzy-result' },
        { key: '5028', expected: 'לוזר עלוב', name: 'native-gxt-frenzy-failure' },
        { key: '5030', expected: 'אסוף כמה שיותר בונוסים', name: 'native-gxt-frenzy-objective' },
        { key: '5013', expected: 'רכבי הגלידה', name: 'native-gxt-ice-cream-frenzy' },
      ]) {
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
    }

    let saveRoundTrip = null;
    if (process.env.GTA2_QA_SAVE_ROUNDTRIP) {
      const rules = await evaluate(`window.gta2.states.rules()`);
      if (!rules.player || rules.stars || rules.onJob) throw new Error(`save test needs an ordinary safe state: ${JSON.stringify(rules)}`);
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
      const loaded = await evaluate(`window.gta2.states.load('s1')`);
      if (!loaded) throw new Error('imported game snapshot could not be loaded');
      saveRoundTrip = { rules, before, exportedFileBytes: (await fs.stat(exportedPath)).size, importStatus: imported, after, loaded };
      console.log(JSON.stringify({ saveRoundTrip }));
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

    const menuNavigation = [];
    await evaluate(`document.querySelector('#screen')?.focus()`);
    const menuKey = async (scanCode, virtualKey) => {
      await evaluate(`window.gta2.Module.ccall('gta2_port_key','void',['number','number','number','number'],[${scanCode},${virtualKey},1,${virtualKey}])`);
      await wait(180);
      await evaluate(`window.gta2.Module.ccall('gta2_port_key','void',['number','number','number','number'],[${scanCode},${virtualKey},0,0])`);
      await wait(250);
    };
    await menuKey(0xd0, 0x28);
    const selectedOption = await waitFor(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`,
      (value) => value >= 0 && value % 16 === 1, 'keyboard selection moves to the second main-menu option');
    menuNavigation.push({ state: selectedOption, screenshot: await capture('main-menu-keyboard-selection') });
    await menuKey(0x1c, 0x0d);
    await wait(500);
    const afterEnter = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
    menuNavigation.push({ action: 'Enter on Options', state: afterEnter, screenshot: await capture('main-menu-options-after-enter') });
    await menuKey(0x01, 0x1b);
    await wait(500);
    const returnedMenuState = await evaluate(`window.gta2.Module.ccall('gta2_port_frontend_menu_state','number',[],[])`);
    menuNavigation.push({ action: 'Escape after Options', state: returnedMenuState, screenshot: await capture('menu-after-options-escape') });

    const currentGxtAudit = process.env.GTA2_QA_GXT_AUDIT
      ? await evaluate('window.gta2GxtAudit?.snapshot() || []') : null;
    console.log(JSON.stringify({ sequence, missionTitleTest, nativeGxtDraw, saveRoundTrip, missionAttempt, fallback, pauseMenu, paused, mainMenu, mainMenuProbe, menuNavigation, auditSnapshots, currentGxtAudit, notes: 'Injected briefs and mission titles use their native HUD message queues; native GXT tests enqueue GXT strings in the live game and observe the production DrawText hook. A genuine mission is counted only when the engine mission flag changes after using an original gang phone.' }, null, 2));
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
