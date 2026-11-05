#!/usr/bin/env node
// Browser-measured audit of every translated brief, native GXT string, and title.
// Uses the production CSS/fonts and Gta2Map layout methods in one isolated Chrome.
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BASE = process.env.GTA2_QA_BASE || 'http://127.0.0.1:8876/';
const OUT = path.join(ROOT, 'docs/text-layout-audit.md');
const CHROME_CANDIDATES = process.platform === 'win32'
  ? [process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'), 'chrome.exe'].filter(Boolean)
  : ['google-chrome', 'chromium', 'chromium-browser', 'chrome'];
const CHROME = process.env.GTA2_CHROME || CHROME_CANDIDATES.find((x) => !path.isAbsolute(x) || fsSync.existsSync(x)) || CHROME_CANDIDATES[0];
const PORT = 9223;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(file) { return JSON.parse(await fs.readFile(path.join(ROOT, file), 'utf8')); }
async function json(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url), pending = new Map(); let nextId = 0;
    ws.addEventListener('open', () => resolve({ ws, send(method, params = {}) {
      const id = ++nextId; ws.send(JSON.stringify({ id, method, params }));
      return new Promise((res, rej) => pending.set(id, { res, rej, method }));
    } }));
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data); if (!data.id) return;
      const item = pending.get(data.id); if (!item) return; pending.delete(data.id);
      if (data.error) item.rej(new Error(`${item.method}: ${data.error.message}`)); else item.res(data.result);
    });
    ws.addEventListener('error', reject);
  });
}

function fontCoverage(ttf, chars) {
  const u16 = (n) => ttf.readUInt16BE(n), u32 = (n) => ttf.readUInt32BE(n);
  const tableCount = u16(4); let cmap = -1;
  for (let i = 0; i < tableCount; i++) {
    const p = 12 + i * 16;
    if (ttf.toString('ascii', p, p + 4) === 'cmap') cmap = u32(p + 8);
  }
  if (cmap < 0) return [...new Set(chars)];
  const encCount = u16(cmap + 2), tables = [];
  for (let i = 0; i < encCount; i++) {
    const p = cmap + 4 + i * 8, sub = cmap + u32(p + 4), format = u16(sub);
    if ([0, 3].includes(u16(p)) && [1, 10].includes(u16(p + 2)) || u16(p) === 0) tables.push({ sub, format });
  }
  const format12 = tables.find((x) => x.format === 12);
  const format4 = tables.find((x) => x.format === 4);
  const has = (cp) => {
    if (cp > 0xffff) return true;
    if (format12) {
      const { sub } = format12, groups = u32(sub + 12); let lo = 0, hi = groups - 1;
      while (lo <= hi) { const mid = (lo + hi) >> 1, p = sub + 16 + mid * 12, a = u32(p), b = u32(p + 4);
        if (cp < a) hi = mid - 1; else if (cp > b) lo = mid + 1; else return true; }
    }
    if (!format4 || cp > 0xffff) return false;
    const { sub } = format4, segCount = u16(sub + 6) / 2;
    const end = sub + 14, start = end + segCount * 2 + 2, delta = start + segCount * 2, range = delta + segCount * 2;
    for (let i = 0; i < segCount; i++) {
      const endCode = u16(end + i * 2); if (cp > endCode) continue;
      if (cp < u16(start + i * 2)) return false;
      const d = u16(delta + i * 2), r = u16(range + i * 2);
      if (!r) return ((cp + (d > 0x7fff ? d - 0x10000 : d)) & 0xffff) !== 0;
      const glyphAt = range + i * 2 + r + 2 * (cp - u16(start + i * 2));
      if (glyphAt + 2 > ttf.length) return false;
      const glyph = u16(glyphAt); return glyph !== 0 && ((glyph + (d > 0x7fff ? d - 0x10000 : d)) & 0xffff) !== 0;
    }
    return false;
  };
  return [...new Set(chars)].filter((c) => !has(c.codePointAt(0)));
}

async function main() {
  const mission = await readJson('web/mission-translations.he.json');
  const extras = await readJson('web/mission-extras.he.json');
  const gameplay = await readJson('web/gxt-gameplay.he.json');
  const titleData = await readJson('web/mission-titles.he.json');
  const missionRows = [...(mission.records || []), ...(extras.records || [])].map((r) => ({
    category: 'brief', id: `${r.area}/${r.gxtKey || r.id}`, source: r.source || '', text: r.text || '',
  }));
  const gameplayRows = (gameplay.records || []).map((r) => ({ category: 'GXT', id: r.key, source: r.source || '', text: r.text || '' }));
  const titleRows = Object.entries(titleData.titles || {}).map(([key, r]) => ({ category: 'כותרת', id: key, source: r.source || '', text: r.text || '' }));
  const rows = [...missionRows, ...gameplayRows, ...titleRows];
  const ttf = await fs.readFile(path.join(ROOT, 'web/fonts/ImpactfulBits.ttf'));
  const legacyTtf = await fs.readFile(path.join(ROOT, 'web/fonts/gta2-sevenish-he.ttf'));
  const titleTtf = await fs.readFile(path.join(ROOT, 'web/fonts/NotoSansHebrew-Black.ttf'));
  const allHebrew = [...new Set(rows.flatMap((r) => [...r.text]).filter((c) => /\p{Script=Hebrew}/u.test(c)))];
  const missingDialogGlyphs = fontCoverage(ttf, allHebrew);
  const fallbackDialogGlyphs = fontCoverage(legacyTtf, missingDialogGlyphs);
  const expectedFallbackGlyphs = missingDialogGlyphs.filter((c) => fallbackDialogGlyphs.includes(c));
  const missingTitleGlyphs = fontCoverage(titleTtf, allHebrew.filter((c) => titleRows.some((r) => r.text.includes(c))));

  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'gta2-layout-qa-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-address=127.0.0.1`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
  let cdp;
  try {
    let version;
    for (let i = 0; i < 100; i++) { try { version = await json(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await wait(200); } }
    if (!version) throw new Error('isolated Chrome did not expose DevTools');
    let pages = await json(`http://127.0.0.1:${PORT}/json/list`);
    let page = pages.find((x) => x.type === 'page');
    if (!page) page = await json(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
    cdp = await connectCdp(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    const evaluate = async (expression) => {
      const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'page evaluation failed');
      return result.result?.value;
    };
    const auditRowsJson = JSON.stringify(rows);
    const report = { catalogCounts: { brief: missionRows.length, gameplayGxt: gameplayRows.length, titles: titleRows.length, total: rows.length },
      glyphCoverage: { dialogueFallbackInSevenish: missingDialogGlyphs.filter((c) => !fallbackDialogGlyphs.includes(c)), dialogueStillMissing: expectedFallbackGlyphs, titleMissingHebrew: missingTitleGlyphs }, resolutions: [] };
    for (const { width, height } of [{ width: 1200, height: 800 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await cdp.send('Page.navigate', { url: `${BASE}?devdata&autostart&brief-test=3727` });
      for (let i = 0; i < 800; i++) {
        const ready = await evaluate(`!!window.gta2?.map?.fitBriefTypography && !!document.fonts` ).catch(() => false);
        if (ready) break; await wait(100);
      }
      await evaluate('document.fonts.ready');
      const result = await evaluate(`(async()=>{
        const rows=${JSON.stringify(auditRowsJson)};
        const data=JSON.parse(rows), map=window.gta2.map, canvas=map.gameCanvas, rect=canvas.getBoundingClientRect(), vp=map.renderer.viewport;
        const dpr=canvas.width/rect.width, scale=map.renderer.scale/dpr, viewLeft=rect.left+vp.x/dpr, viewTop=rect.top+(canvas.height-vp.y-vp.h)/dpr;
        const viewWidth=vp.w/dpr, viewHeight=vp.h/dpr, nativeWidth=Math.min(viewWidth,viewHeight*4/3), nativeLeft=viewLeft+(viewWidth-nativeWidth)/2;
        const radar=document.getElementById('map-radar'), radarLeft=radar&&!radar.hidden?radar.getBoundingClientRect().left:viewLeft+viewWidth;
        const left=nativeLeft+64*scale, right=Math.min(nativeLeft+nativeWidth-8*scale,radarLeft-8*scale,nativeLeft+520*scale);
        const boxWidth=Math.max(120*scale,Math.min(576*scale,right-left)), maxHeight=Math.max(96*scale,viewHeight*.58);
        const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;z-index:-1;';document.body.append(host);
        const panel=document.createElement('section');panel.dir='rtl';panel.style.cssText='display:block;position:static;visibility:visible;width:'+boxWidth+'px;';
        const node=document.createElement('div');node.className='mission-brief-text';panel.append(node);host.append(panel);
        const ctx=document.createElement('canvas').getContext('2d'), anomalies=[], tallies={tooTall:0,wordTooWide:0,measured:0,maxLines:0,minFontSizeUsed:Infinity};
        const plain=(s)=>String(s||'').replace(/^[\\u2160-\\u2188]+\\s*/,'').replace(/#([^#]*)#/g,'$1').replace(/#/g,'');
        for(const row of data.filter(r=>r.category!=='כותרת')){
          node.textContent=plain(row.text);node.style.removeProperty('font-size');map.fitBriefTypography(node,maxHeight);const cs=getComputedStyle(node),h=node.getBoundingClientRect().height,w=node.getBoundingClientRect().width;
          const range=document.createRange();range.selectNodeContents(node);const lines=new Set([...range.getClientRects()].map(r=>Math.round(r.top*2)/2)).size;
          ctx.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;const words=plain(row.text).match(/\\S+/gu)||[];const widest=words.map(word=>({word,width:ctx.measureText(word).width})).sort((a,b)=>b.width-a.width)[0];
          const tooWide=widest&&widest.width>w+1, tooTall=h>maxHeight+1; tallies.measured++;tallies.maxLines=Math.max(tallies.maxLines,lines);tallies.minFontSizeUsed=Math.min(tallies.minFontSizeUsed,parseFloat(cs.fontSize));
          if(tooTall)tallies.tooTall++;if(tooWide)tallies.wordTooWide++;
          if(tooTall||tooWide||node.scrollWidth>w+1)anomalies.push({category:row.category,id:row.id,reason:[tooTall?'height-exceeds-safe-area':'',tooWide?'single-word-exceeds-width':'',node.scrollWidth>w+1?'horizontal-overflow':''].filter(Boolean).join(','),lines,height:Math.round(h),maxHeight:Math.round(maxHeight),fontSize:cs.fontSize,widestWord:tooWide?widest.word:undefined});
        }
        const titleCanvas=document.createElement('canvas');host.append(titleCanvas);const titleAnomalies=[];let minTitleSize=36,maxTitleWidth=0;
        for(const row of data.filter(r=>r.category==='כותרת')){map.renderMissionTitle(titleCanvas,row.text);const w=parseFloat(titleCanvas.style.width)||titleCanvas.width*2;maxTitleWidth=Math.max(maxTitleWidth,w);minTitleSize=Math.min(minTitleSize,Number(titleCanvas.dataset.fontSizeUsed||36));if(titleCanvas.dataset.fitOverflow==='true'||w>innerWidth-32)titleAnomalies.push({id:row.id,text:row.text,width:Math.round(w),fitOverflow:titleCanvas.dataset.fitOverflow||'unset'});}
        const bidiSamples=['חילוץ זיטזאקי!','איפה טריי?','נקודה, פסיק: (2)','חילוץ Yakuza 50!'];
        const bidi=bidiSamples.map(sample=>{const probe=document.createElement('div');probe.dir='rtl';probe.style.cssText='position:absolute;width:560px;visibility:hidden;direction:rtl;unicode-bidi:plaintext;text-align:right;font:25px "GTA2 Impact Pixel","GTA2 Brief Pixel",monospace;';probe.textContent=sample;host.append(probe);const textNode=probe.firstChild,firstRange=document.createRange(),lastRange=document.createRange();firstRange.setStart(textNode,0);firstRange.setEnd(textNode,1);lastRange.setStart(textNode,sample.length-1);lastRange.setEnd(textNode,sample.length);const firstX=firstRange.getBoundingClientRect().left,lastX=lastRange.getBoundingClientRect().left;probe.remove();return {sample,firstX:Math.round(firstX),lastPunctuationX:Math.round(lastX),passed:lastX<firstX};});
        host.remove();return {resolution:innerWidth+'x'+innerHeight,viewport:{width:Math.round(viewWidth),height:Math.round(viewHeight),briefWidth:Math.round(boxWidth),maxTextHeight:Math.round(maxHeight)},tallies,bidi,anomalies,title:{count:data.filter(r=>r.category==='כותרת').length,minFontSize:minTitleSize,maxWidth:Math.round(maxTitleWidth),anomalies:titleAnomalies}};
      })()`);
      report.resolutions.push(result);
    }
    const all = report.resolutions.flatMap((r) => r.anomalies.map((x) => ({ resolution: r.resolution, ...x }))
      .concat(r.title.anomalies.map((x) => ({ resolution: r.resolution, category: 'כותרת', reason: 'title-exceeds-safe-width', ...x }))));
    const unique = new Map(); for (const item of all) unique.set(`${item.resolution}/${item.category}/${item.id}/${item.reason}`, item);
    report.anomalies = [...unique.values()];
    report.bidiAnomalies = report.resolutions.flatMap((r) => r.bidi.filter((x) => !x.passed).map((x) => ({ resolution: r.resolution, ...x })));
    const lines = [
      '# דוח בדיקת פריסה אוטומטית לטקסט', '',
      `נבדק: ${new Date().toISOString()}. המדידה בוצעה ב־Chrome מול CSS, הגופנים, פונקציית התאמת הדיאלוג ומצייר הכותרות של הפרויקט.`, '',
      `נבדקו ${report.catalogCounts.total} רשומות: ${report.catalogCounts.brief} הודעות brief, ${report.catalogCounts.gameplayGxt} מחרוזות GXT ו־${report.catalogCounts.titles} כותרות, בשלוש רזולוציות.`,
      `גליפים עבריים בדיאלוג: ${report.glyphCoverage.dialogueStillMissing.length ? `חסרים: ${report.glyphCoverage.dialogueStillMissing.map((x) => `U+${x.codePointAt(0).toString(16).toUpperCase()}`).join(', ')}` : `אין חסרים; ${report.glyphCoverage.dialogueFallbackInSevenish.length ? `הסימנים ${report.glyphCoverage.dialogueFallbackInSevenish.join(' ')} נלקחים מ־Sevenish כ־fallback` : 'ImpactfulBits מכסה את האותיות'}`}.`,
      `גליפים עבריים בכותרות Noto Sans Hebrew Black: ${missingTitleGlyphs.length ? `חסרים: ${missingTitleGlyphs.map((x) => `U+${x.codePointAt(0).toString(16).toUpperCase()}`).join(', ')}` : 'אין חסרים'}.`, '',
      '| רזולוציה | נמדדו | חריגות גובה | מילים רחבות מדי | שורות מרביות | גודל כותרת מזערי | חריגות כותרת | כשלי RTL |',
      '|---|---:|---:|---:|---:|---:|---:|---:|',
      ...report.resolutions.map((r) => `| ${r.resolution} | ${r.tallies.measured} | ${r.tallies.tooTall} | ${r.tallies.wordTooWide} | ${r.tallies.maxLines} | ${r.title.minFontSize}px | ${r.title.anomalies.length} | ${r.bidi.filter((x) => !x.passed).length} |`), '',
      `חריגות פריסה ייחודיות: ${report.anomalies.length}; דגימות כיווניות/פיסוק שנכשלו: ${report.bidiAnomalies.length}.`, '',
      '## חריגות הדורשות טיפול', '',
      ...(report.anomalies.length ? report.anomalies.map((a) => `- ${a.resolution} · ${a.category} · ${a.id} · ${a.reason}${a.text ? ` · ${a.text}` : ''}`) : ['לא נמצאו חריגות פריסה לפי בדיקות הרוחב, הגובה, המילים והכותרות.']), '',
      ...(report.bidiAnomalies.length ? ['## חריגות כיווניות ופיסוק', '', ...report.bidiAnomalies.map((a) => `- ${a.resolution} · ${a.sample} · סימן הסיום לא הופיע בצד המצופה`) , ''] : []),
      '## הערות מדידה', '',
      '- שבירת שורות נמדדה ב־DOM של Chrome לאחר טעינת גופני הפרויקט; מדדי שורות נאספו מ־Range.getClientRects, והגבלת אורך הדיאלוג הפעילה את אותה פונקציית fitBriefTypography המשמשת בזמן משחק.',
      '- אותיות עבריות נבדקו מול טבלת cmap של קובצי הגופן. סימני ניקוד/פיסוק שחסרים בגופן הראשי מותרים רק אם Sevenish מכסה אותם; לטינית ומספרים רשאים להשתמש ב־fallback של הדפדפן.',
      '- ארבע דגימות RTL/BiDi (כולל סימני שאלה/קריאה, סוגריים, מספרים ושם לטיני) נמדדו ב־DOM בכל רזולוציה. גם צילומי ה־Canvas של הכותרות נבדקים בנפרד.', '',
    ];
    await fs.writeFile(OUT, lines.join('\n'), 'utf8');
    console.log(JSON.stringify({ output: OUT, catalogCounts: report.catalogCounts, resolutions: report.resolutions.map(({ resolution, tallies, title }) => ({ resolution, tallies, title })), glyphCoverage: report.glyphCoverage, anomalyCount: report.anomalies.length }, null, 2));
    if (report.anomalies.length || report.bidiAnomalies.length || expectedFallbackGlyphs.length || missingTitleGlyphs.length) process.exitCode = 2;
  } finally {
    if (cdp?.ws.readyState === WebSocket.OPEN) cdp.ws.close();
    chrome.kill();
    await new Promise((resolve) => { if (chrome.exitCode !== null) resolve(); else { const t = setTimeout(resolve, 3000); chrome.once('exit', () => { clearTimeout(t); resolve(); }); } });
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 }).catch((e) => console.warn(`could not remove Chrome profile: ${e.message}`));
  }
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
