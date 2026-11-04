#!/usr/bin/env node
// Resolve the independent 31-item language audit against original GXT and SCR
// context; record per-row dispositions and the source-reference triage of the
// remaining GXT strings. This does not change mission logic or save data.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}
function writeCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const s = String(cell ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n') + '\r\n';
}
const stripSpeaker = (s) => String(s || '').replace(/^[\u2160-\u2188]\s*/, '');

const findingsPath = path.resolve(process.env.GTA2_QA_FINDINGS || 'C:/Users/Toshiba/Downloads/GTA2_hebrew_independent_QA_corrections.csv');
if (!fs.existsSync(findingsPath)) throw new Error(`Independent QA findings not found: ${findingsPath}`);
const findingsRows = parseCsv(fs.readFileSync(findingsPath, 'utf8'));
const findingsHead = findingsRows.shift();
const fcol = Object.fromEntries(findingsHead.map((name, i) => [name, i]));
if (findingsRows.length !== 31) throw new Error(`Expected 31 QA findings, found ${findingsRows.length}`);

const missionPath = path.join(root, 'web/mission-translations.he.json');
const mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
const titlePath = path.join(root, 'web/mission-titles.he.json');
const titles = JSON.parse(fs.readFileSync(titlePath, 'utf8'));
const fixes = {
  '1802': '#לעזאזל, ילד, ניצחת את כולם! הנה עצה: סע ל־#Residential District# לפני שהכול יתפוצץ לך בפרצוף.#',
  '6009': 'לא ייאמן! ניצחת את שלושתם! תעיף את התחת שלך ל־Industrial District של העיר, לפני שהמצב יחמיר עוד יותר.',
  '3968': 'התראה! יש כאן מישהו חמוש!',
  '2488': 'הבוגד של אס־אר־אס בתוך ה־Taxi, THC-303 — השמד את ה־Taxi!',
  '1689': 'האבטחה של Zaibatsu Way היא עבודה מסביב לשעון, גקו. קח $20,000 על עבודה טובה.',
};
const contextMissionNames = new Set(['Blow Job!', 'Fake Truce!', 'Informant Rescue']);
const contextMissionKeys = new Set();
const reviewedMissionKeys = new Set();
const dispositions = new Map([
  ['3788', 'ההצעה העברית החלופית לא אומצה: Z-Man, D-Man ו-D for Dead נשמרו כדי לא למחוק את משחק האותיות המקורי.'],
]);

for (const row of findingsRows) {
  const id = String(row[fcol['מזהה']]);
  const area = row[fcol['אזור לפי המלאי']];
  const english = stripSpeaker(row[fcol['מקור אנגלי']]);
  if (titles.titles[id]) {
    const title = titles.titles[id];
    if (title.source !== english) throw new Error(`Title source mismatch for QA ${id}: ${title.source}`);
    title.reviewStatus = 'context-reviewed';
    continue;
  }
  const record = mission.records.find((item) => String(item.gxtKey) === id && item.area === area);
  if (!record) throw new Error(`Missing mission record for QA ${id} (${area})`);
  if (stripSpeaker(record.source) !== english) throw new Error(`GXT source mismatch for QA ${id}`);
  if (fixes[id]) record.text = fixes[id];
  record.reviewStatus = 'context-reviewed';
  reviewedMissionKeys.add(id);
}
if (reviewedMissionKeys.size !== 27) throw new Error(`Expected 27 mission messages in QA findings, got ${reviewedMissionKeys.size}`);
for (const record of mission.records) {
  if (!contextMissionNames.has(record.mission)) continue;
  record.reviewStatus = 'context-reviewed';
  contextMissionKeys.add(`${record.area}:${record.gxtKey}`);
}

fs.writeFileSync(missionPath, `${JSON.stringify(mission, null, 2)}\n`);
fs.writeFileSync(titlePath, `${JSON.stringify(titles, null, 2)}\n`);

// Use the compiled SCR pointer scan, not GXT numbering, to classify remaining
// candidates. This scan covers DISPLAY_MESSAGE/BRIEF variants/PHONE_TEMPLATE.
const inventoryPath = path.join(root, 'build/mission-inventory.json');
if (!fs.existsSync(inventoryPath)) throw new Error('Run scripts/build_mission_inventory.js first');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const refs = new Map();
for (const record of inventory.messages) refs.set(String(record.gxtKey), record);
const csvPath = path.join(root, 'docs/translation-inventory.csv');
const csvRows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const head = csvRows.shift();
const col = Object.fromEntries(head.map((name, i) => [name, i]));
const qaById = new Map(findingsRows.map((row) => [String(row[fcol['מזהה']]), row]));
let placeholders = 0, deadFallbacks = 0, unresolvedSpeaker = 0, unresolvedOther = 0, intentionalDirect = 0;
const intentional = new Map([
  ['1954', 'RADIO ZA-ZA! הוא שם תחנת רדיו שמופיע כשם רשמי.'],
  ['2474', '1 הוא מספר ספירה לאחור; משאירים ספרה.'], ['2475', '2 הוא מספר ספירה לאחור; משאירים ספרה.'],
  ['2476', '3 הוא מספר ספירה לאחור; משאירים ספרה.'], ['2477', '4 הוא מספר ספירה לאחור; משאירים ספרה.'],
  ['2478', '5 הוא מספר ספירה לאחור; משאירים ספרה.'],
]);
const qaExtra = new Map([
  ['1802', 'תוקן: הוסרה דרישת $1,000,000 שאינה בדיאלוג המקורי; נשמרה הוראת המעבר ומחרוזת הצבע.'],
  ['6009', 'תוקן: הוסרה דרישת $3,000,000 שאינה בדיאלוג המקורי; נשמרה משמעות המעבר והסלנג.'],
  ['3968', 'תוקן לאחר קריאת bil_rh2.scr: בהקשר אבטחת המתקן “blower” הוא אדם חמוש, לא מחבל.'],
  ['3788', dispositions.get('3788')],
]);
const rowIds = new Set();
for (const row of csvRows) {
  const id = String(row[col['מזהה']]);
  const area = row[col['מקור/אזור']];
  const english = row[col['מקור אנגלי (כפי שנמצא)']];
  const status = row[col['מצב נוכחי']];
  const ref = refs.get(id);
  const contextRecord = mission.records.find((item) => String(item.gxtKey) === id && item.area === area);
  if (contextRecord && contextMissionKeys.has(`${area}:${id}`)) {
    row[col['תרגום/נוסח עברי קיים']] = contextRecord.text;
    row[col['מצב נוכחי']] = 'תורגם ואומת הקשרית מול רצף משימה מלא';
    row[col['הקשר/הערות']] = `${row[col['הקשר/הערות']]}; הגהה ידנית מול רצף ${contextRecord.mission} ומקור SCR`;
    if (qaById.has(id)) rowIds.add(id);
    continue;
  }
  if (qaById.has(id)) {
    const title = titles.titles[id];
    if (title) row[col['תרגום/נוסח עברי קיים']] = title.text;
    else if (contextRecord) row[col['תרגום/נוסח עברי קיים']] = contextRecord.text;
    row[col['מצב נוכחי']] = id === '3788'
      ? 'תורגם ואומת הקשרית; משחק האותיות באנגלית נשמר בכוונה'
      : 'תורגם ונבדק מול מקור GXT והקשר משימה';
    row[col['הקשר/הערות']] = `${row[col['הקשר/הערות']]}; ביקורת עצמאית: ${qaExtra.get(id) || 'הנוסח הושווה למקור ולרצף SCR; ההצעה נבדקה ולא הוחלה עיוור.'}`;
    rowIds.add(id);
    continue;
  }
  // The 791 unresolved candidates are the remaining GXT-only inventory rows.
  // Never reclassify already mapped mission, title, gameplay, or UI entries.
  if (row[col['סוג טקסט']] !== 'טקסט GXT אחר') continue;
  if (/REPORT DEAD BRIEF/i.test(english)) {
    placeholders++;
    row[col['מצב נוכחי']] = ref
      ? 'מציין מקום/פיתוח: REPORT DEAD BRIEF; הופיע כהפניית fallback בלבד, לא כתוכן לשחקן'
      : 'מציין מקום/פיתוח: REPORT DEAD BRIEF; אין הפניה לפקודת תצוגת SCR';
    row[col['חשיבות']] = 'מחרוזת debug/fallback, לא דיאלוג או הוראה לשחקן';
    row[col['המלצה']] = ref
      ? `להשאיר באנגלית כ-fallback למפתח חסר; scopes=${ref.scopes.join('|')}; ${id}`
      : 'להשאיר באנגלית; לא נמצאה הפניה בפקודות תצוגת SCR';
    continue;
  }
  if (intentional.has(id) && ref) {
    intentionalDirect++;
    row[col['מצב נוכחי']] = 'נשאר באנגלית/ספרה בכוונה; הפניית DISPLAY_MESSAGE אומתה';
    row[col['חשיבות']] = 'שם שידור רשמי או מספרי ספירה בלבד';
    row[col['המלצה']] = intentional.get(id);
    continue;
  }
  if (/^[\u2160-\u2188]/u.test(english)) {
    if (/DEAD BRIEF/i.test(english) && ref) {
      deadFallbacks++;
      row[col['מצב נוכחי']] = 'מציין מקום PHONE_TEMPLATE: DEAD BRIEF, לא דיאלוג פעיל';
      row[col['חשיבות']] = 'מחרוזת fallback לפיתוח, לא תוכן לשחקן';
      row[col['המלצה']] = `להשאיר באנגלית; source ref=${ref.scripts.join('|')}; phone template בלבד`;
    } else {
      unresolvedSpeaker++;
      row[col['מצב נוכחי']] = 'לא נמצאה הפניה ל-DISPLAY_BRIEF/DISPLAY_MESSAGE ב-SCR; לא סווג כלא פעיל בלי בדיקת נתיב דינמי';
      row[col['חשיבות']] = 'לא הוכח כתוכן שחקן; סיכון משוער נמוך ללא הפניית תצוגת משימה';
      row[col['המלצה']] = 'להשאיר לא מוכרע; אין לטעון שמדובר בטקסט פעיל בלי מקור תצוגה נוסף';
    }
    continue;
  }
  {
    if (ref) {
      // Unknown direct display references must not be silently dismissed.
      row[col['מצב נוכחי']] = `נמצאה הפניית SCR מסוג ${ref.scopes.join('|')}; דורש הכרעה לפי ההקשר`;
      row[col['חשיבות']] = 'מחרוזת מוצגת לפי SCR; יש לשמור לבדיקה נוספת';
      row[col['המלצה']] = `לבדוק את רצף ${ref.scripts.join(', ')} לפני סיווג`;
    } else {
      unresolvedOther++;
      row[col['מצב נוכחי']] = 'לא נמצאה הפניה ל-DISPLAY_BRIEF/DISPLAY_MESSAGE ב-SCR; נתיב דינמי לא הוכרע';
      row[col['חשיבות']] = 'לא הוכח כתוכן שחקן; לא להחשיב כמתורגם או לא פעיל';
      row[col['המלצה']] = 'להשאיר לא מוכרע; לבדוק רק אם נמצא נתיב קוד/ממשק שמשתמש במפתח';
    }
  }
}
if (rowIds.size !== 31) throw new Error(`Only matched ${rowIds.size}/31 QA inventory rows`);
fs.writeFileSync(csvPath, writeCsv([head, ...csvRows]));

console.log(JSON.stringify({
  findings: findingsRows.length, missionMessagesContextReviewed: reviewedMissionKeys.size,
  newFixes: Object.keys(fixes), titleFindings: 4, placeholders,
  deadPhoneTemplateFallbacks: deadFallbacks, unresolvedSpeakerCandidates: unresolvedSpeaker,
  intentionallyEnglishOrNumericDirectDisplay: intentionalDirect,
  unresolvedUnreferencedOther: unresolvedOther,
}, null, 2));
