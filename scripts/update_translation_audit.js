#!/usr/bin/env node
// Refresh the deliverable inventory from the runtime catalogs after a translation pass.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function parseCsv(text) {
  const rows = [], row = [];
  let current = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') quoted = false;
      else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(current); current = ''; }
    else if (ch === '\n') { row.push(current.replace(/\r$/, '')); rows.push([...row]); row.length = 0; current = ''; }
    else current += ch;
  }
  if (current || row.length) { row.push(current.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function extractObject(source, from) {
  const start = source.indexOf('{', from);
  if (start < 0) throw new Error('Could not find dictionary body');
  let depth = 0, quote = '', escape = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return vm.runInNewContext(`(${source.slice(start, i + 1)})`);
  }
  throw new Error('Unterminated dictionary object');
}

function heDictionary(file, objectName = null) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const at = objectName ? source.indexOf(`${objectName} =`) : source.indexOf('registerDict(');
  if (at < 0) throw new Error(`Dictionary declaration not found in ${file}`);
  const he = source.indexOf('he: {', at);
  return extractObject(source, he + 3);
}

const csvPath = path.join(root, 'docs/translation-inventory.csv');
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = rows.shift();
header[0] = header[0].replace(/^\uFEFF+/, '');
const column = Object.fromEntries(header.map((value, i) => [value.replace(/^\uFEFF/, ''), i]));
const idx = {
  kind: column['סוג טקסט'], area: column['מקור/אזור'], id: column['מזהה'], source: column['מקור אנגלי (כפי שנמצא)'],
  text: column['תרגום/נוסח עברי קיים'], status: column['מצב נוכחי'], importance: column['חשיבות'],
  recommendation: column['המלצה'], context: column['הקשר/הערות'], tech: column['מקור טכני'],
};
const mission = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8')).records;
const titles = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-titles.he.json'), 'utf8')).titles;
const byMission = new Map(mission.map((m) => [`${m.area}:${m.gxtKey}`, m]));
const titleArea = (key) => Number(key) >= 3840 && Number(key) <= 3861 ? 'Industrial District'
  : ([...Array.from({ length: 11 }, (_, i) => String(2460 + i)), '2473', ...Array.from({ length: 4 }, (_, i) => String(2671 + i)), ...Array.from({ length: 6 }, (_, i) => String(2954 + i))].includes(String(key)) ? 'Residential' : 'Downtown');
const reviewedKeys = new Set('1162 1165 1168 1221 1225 1261 1277 1334 1335 1535 1614 1674 1689 1752 1753 1757 2005 2016 2026 2032 2034 2301 2305 2307 2311 2512 2514 2515 2516 2517 2648 2650 2656 2657 2658 2660 2664 2667 2962 3164 3166 3181'.split(' '));
const titleKinds = new Set(Object.keys(titles).filter((key) => Number(key) < 9000));
const statusKeys = new Set(['1016','1017','1018','1124','1125','1338','1339','2998','2999','3100','3730','3670','3672','3674','6147','6184','6185','6186','9001','9002','9003','9004']);
const namedStatusKeys = { mfail: '9001', kfstart: '9002', kfpass: '9003', kffail: '9004' };
const visuallyVerifiedBriefs = new Set(['1600', '2306', '2026', '3727', '1251', '1631']);
const visuallyVerifiedTitles = new Set(['9002', '1975']);

const dictFiles = [
  ['web/strings.js', 'UI'], ['web/shell.js'], ['web/landing.js'], ['web/saves.js'], ['web/savestate.js'],
  ['web/controls.js'], ['web/gamefiles.js'], ['web/map.js'], ['web/net.js'], ['web/storage.js'],
];
const uiHe = Object.assign({}, ...dictFiles.map(([file, objectName]) => heDictionary(file, objectName)));

let changedMission = 0, changedTitles = 0, changedUi = 0;
for (const row of rows) {
  const id = row[idx.id];
  const area = row[idx.area];
  const titleKey = id in titles ? id : namedStatusKeys[id];
  const missionRecord = byMission.get(`${area}:${id}`) || mission.find((m) => String(m.gxtKey) === id);
  if (missionRecord && (!(titleKey) || row[idx.kind] === 'הודעת משימה/דיאלוג')) {
    const record = missionRecord;
    row[idx.kind] = 'הודעת משימה/דיאלוג'; row[idx.area] = record.area; row[idx.source] = record.source; row[idx.text] = record.text;
    row[idx.status] = visuallyVerifiedBriefs.has(id) ? 'תורגם; הוזרק למנגנון HUD ונצפה בדפדפן' : reviewedKeys.has(id) ? 'תורגם ואומת בבדיקת הקשר ממוקדת' : 'תורגם; התאמת מפתח אומתה, לא נבדק חזותית';
    row[idx.importance] = 'חיוני להבנת משימה/סיפור';
    row[idx.recommendation] = 'לשמר את ההקשר ואת שמות היעד; לאמת חזותית במסגרת בדיקות משחק.';
    row[idx.tech] = `game/data/e.gxt; script refs; web/mission-translations.he.json · GXT ${id}`;
    changedMission++;
  } else if (titleKey) {
    const entry = titles[titleKey];
    const isNamed = Boolean(namedStatusKeys[id]) || Number(titleKey) >= 9000;
    const key = isNamed ? 'מחרוזת HUD/אתגר' : statusKeys.has(titleKey) ? 'הודעת תוצאה/סטטוס' : 'כותרת משימה גרפית';
    row[idx.kind] = key; row[idx.area] = isNamed ? 'כל האזורים' : titleArea(titleKey);
    row[idx.source] = entry.source; row[idx.text] = entry.text;
    row[idx.status] = visuallyVerifiedTitles.has(String(titleKey)) ? 'תורגם ונצפה ב-HUD בדפדפן; בדיקה חזותית מדגמית' : 'תורגם ואומת מול מפתח GXT; לא אומת חזותית לכל המצבים';
    row[idx.importance] = statusKeys.has(id) || Number(id) >= 9000 ? 'חיוני להתקדמות/תוצאה' : 'חיוני להבנת המשימה';
    row[idx.recommendation] = 'לשמר; ה־renderer מחליף רק מחרוזות מזוהות ומציג fallback למקור.';
    row[idx.context] = isNamed ? 'C++ HUD key (mfail/kfstart/kfpass/kffail); exact string hook' : row[idx.context];
    row[idx.tech] = isNamed ? `game/data/e.gxt; port/platform/jobs_web.cpp; GXT ${id}` : `game/data/e.gxt; active mission script; port/platform/jobs_web.cpp; GXT ${id}`;
    changedTitles++;
  } else if (id in uiHe) {
    row[idx.text] = uiHe[id]; row[idx.status] = 'תורגם; המפתח נקשר למילון runtime; לא אומת חזותית';
    row[idx.importance] = /saves|save|files|control|keys|net|coop|map|weapon|help/i.test(id) ? 'משפר שימושיות ישירה' : row[idx.importance];
    row[idx.recommendation] = 'להשאיר את שם המקש/היעד באנגלית כשהוא מופיע כך במשחק.';
    changedUi++;
  }
}

const output = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
fs.writeFileSync(csvPath, `\uFEFF${output}`);
console.log(`audit inventory refreshed: ${changedMission} game-message rows, ${changedTitles} title/status rows, ${changedUi} UI rows`);
