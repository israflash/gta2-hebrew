#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function readGxt(file) {
  const b = fs.readFileSync(file);
  let keys, data;
  for (let at = 6; at + 8 <= b.length;) {
    const tag = b.toString('ascii', at, at + 4), size = b.readUInt32LE(at + 4);
    if (tag === 'TKEY') keys = { at: at + 8, size };
    if (tag === 'TDAT') data = { at: at + 8, size };
    at += 8 + size;
  }
  const entries = new Map();
  for (let at = keys.at; at < keys.at + keys.size; at += 12) {
    const offset = b.readUInt32LE(at);
    let end = data.at + offset;
    while (end + 1 < data.at + data.size && (b[end] || b[end + 1])) end += 2;
    entries.set(b.toString('ascii', at + 4, at + 11).split('\0')[0], b.toString('utf16le', data.at + offset, end));
  }
  return entries;
}

// Commercial game data is intentionally excluded from GitHub. When it exists locally,
// perform exact source matching; on CI, validate catalog shape and runtime-hook coverage.
const gxtPath = process.env.GTA2_GXT_PATH || path.join(root, 'game/data/e.gxt');
const gxt = fs.existsSync(gxtPath) ? readGxt(gxtPath) : null;
const titles = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-titles.he.json'), 'utf8')).titles;
assert.equal(Object.keys(titles).length, 88, 'all original, active title, and HUD result keys are cataloged');
const namedSources = { 9001: 'mfail', 9002: 'kfstart', 9003: 'kfpass', 9004: 'kffail' };
for (const [key, row] of Object.entries(titles)) {
  assert.ok(row.source && row.text, `title source/translation is empty: ${key}`);
  if (gxt) assert.equal(gxt.get(namedSources[key] || key), row.source, `title source mismatch: ${key}`);
}

const messages = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8')).records;
for (const key of ['1989', '2910', '2911', '3489', '3752', '3753', '1125', '1150', '1240', '1256',
  '1262', '1271', '1647', '1699', '7005', '7006', '7010', '6146', '6181', '6182', '6183']) {
  const row = messages.find((r) => r.gxtKey === key);
  assert.ok(row, `new gameplay message missing: ${key}`);
  assert.ok(row.source && row.text, `gameplay message source/translation is empty: ${key}`);
  if (gxt) assert.equal(gxt.get(key), row.source, `gameplay message source mismatch: ${key}`);
}
assert.equal(messages.length, 1175);
assert.equal(new Set(messages.map((r) => `${r.area}:${r.gxtKey}`)).size, messages.length);
const sinkOrSwimExpected = {
  '2272': 'שלום, THC-303, כאן ד״ר לה־בראט. סוכני זייבאצו מחזיקים במידע הסודי של אס־אר־אס, ואני רוצה אותו בחזרה. #גנוב# את ה־#Taxi# ושמור עליו שלם — נזק רב מדי יזעיק את השוטרים.',
  '2280': 'טוב, THC-303. אסוף את הפעיל #השני# של זייבאצו.',
  '2282': 'יפה, THC-303. עכשיו מצא את איש זייבאצו #השלישי#.',
  '2283': 'לקח לך זמן! הנה תעודת הזיהוי שלי מזייבאצו.',
  '2284': 'נותר לך לאסוף רק פעיל זייבאצו #אחד#, THC-303.',
  '2285': 'אה, יש פה מסיבה?',
  '2288': 'עבודה יעילה ואפקטיבית, THC-303. הנה #$30,000#. השתמש בכסף בתבונה.',
};
for (const [key, expected] of Object.entries(sinkOrSwimExpected)) {
  const row = messages.find((message) => message.mission === 'Sink or Swim!' && message.gxtKey === key);
  assert.ok(row, `Sink or Swim! sequence is missing GXT ${key}`);
  assert.equal(row.text, expected, `Sink or Swim! GXT ${key} translation drifted`);
}

const gameplayGxt = JSON.parse(fs.readFileSync(path.join(root, 'web/gxt-gameplay.he.json'), 'utf8')).records;
const gameplayCatalog = JSON.parse(fs.readFileSync(path.join(root, 'web/gxt-gameplay.he.json'), 'utf8'));
const gxtExtras = JSON.parse(fs.readFileSync(path.join(__dirname, 'gxt-extra-translations.he.json'), 'utf8'));
const missionExtras = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-extras.he.json'), 'utf8')).records;
assert.equal(gameplayGxt.length, 812, 'native gameplay GXT plus supplemental dialogue, challenge, menu, parental-lock, contextual phone fallbacks, and pause-screen gang labels are present');
assert.equal(gameplayCatalog.directRecords?.length, 1, 'direct player-facing HUD literals are cataloged separately from GXT keys');
assert.deepEqual(gameplayCatalog.directRecords[0], {
  key: 'HUD.KF', source: 'K.F.', text: 'חיסול', sourceFile: 'research/gta2_re/Source/Hud.cpp',
  sourceLiteral: 'L"K.F."',
  context: 'Short HUD label drawn instead of the ammo count while a Kill Frenzy weapon has unlimited ammo.',
}, 'direct Kill Frenzy HUD text must stay source-linked and contextual');
assert.ok(fs.readFileSync(path.join(root, gameplayCatalog.directRecords[0].sourceFile), 'utf8').includes(gameplayCatalog.directRecords[0].sourceLiteral),
  'direct HUD source literal must still exist in engine source');
assert.equal(new Set(gameplayGxt.map((r) => String(r.key))).size, gameplayGxt.length, 'GXT keys are unique');
for (const row of gameplayGxt) {
  const preservedKeys = new Set(['esc_i', 'del_i', 'ent_i', 'bspc_i', 'up_i', 'down_i', 'left_i', 'right_i']);
  assert.ok(row.source && (/[\u0590-\u05ff]/u.test(row.text) || preservedKeys.has(String(row.key))), `GXT source/translation missing: ${row.key}`);
  if (gxt) assert.equal(gxt.get(String(row.key)), row.source, `gameplay GXT source mismatch: ${row.key}`);
}
const fatalEventTranslations = {
  wasted: ['WASTED!', 'חוסלת!'],
  fried: ['TOASTED!', 'נשרפת!'],
  nicked: ['BUSTED!', 'נעצרת!'],
  shocked: ['SHOCKING!', 'התחשמלת!'],
};
const contextualFallbackTranslations = {
  '1117': ['ⅺPLEASE REPORT DEAD BRIEF 1117 TO ALAN JACK AND WILLY MILLS!', 'יש לך כבר משימה פעילה. סיים אותה קודם.'],
  '1407': ['ⅹPLEASE REPORT DEAD BRIEF 1407 TO ALAN JACK AND WILLY MILLS!', 'הטנק הושמד!'],
  '2818': ['ⅺDEAD BRIEF', 'כבר השלמת את המשימה הזאת.'],
  '2819': ['ⅺDEAD BRIEF', 'המשימה הזאת כבר נכשלה.'],
};
const parentalLockTranslations = {
  fr_ent1: ['VEUILLEZ SAISIR LE CODE DE VERROUILLAGE', 'הזן את קוד בקרת ההורים'],
  fr_ent2: ['PARENTAL POUR JOUER A GTA2', 'כדי לשחק ב־GTA 2'],
  fr_pmpt: ['CODE DE VERROUILLAGE PARENTAL:', 'קוד בקרת הורים:'],
  fr_rnt1: ['CODE DE VERROUILLAGE PARENTAL', 'קוד בקרת ההורים שגוי'],
  fr_rnt2: ['INCORRECT, VEUILLEZ VERIFIER SUR LA', 'בדוק בחוברת המצורפת'],
  fr_rnt3: ['NOTICE JOINTE ET SAISISSEZ-LE A NOUVEAU', 'והזן את הקוד שוב'],
};
for (const [key, [source, text]] of Object.entries(parentalLockTranslations)) {
  const row = gameplayGxt.find((entry) => String(entry.key) === key);
  assert.ok(row, `parental-lock UI text missing from GXT catalog: ${key}`);
  assert.equal(row.source, source, `parental-lock UI source changed: ${key}`);
  assert.equal(row.text, text, `parental-lock UI translation changed: ${key}`);
  if (gxt) assert.equal(gxt.get(key), source, `parental-lock UI source mismatch: ${key}`);
}
for (const [key, [source, text]] of Object.entries(contextualFallbackTranslations)) {
  const row = gameplayGxt.find((entry) => String(entry.key) === key);
  assert.ok(row, `contextual mission fallback missing from GXT catalog: ${key}`);
  assert.equal(row.source, source, `contextual mission fallback source changed: ${key}`);
  assert.equal(row.text, text, `contextual mission fallback translation changed: ${key}`);
  if (gxt) assert.equal(gxt.get(key), source, `contextual mission fallback GXT source mismatch: ${key}`);
}
for (const [key, [source, text]] of Object.entries(fatalEventTranslations)) {
  const row = gameplayGxt.find((entry) => String(entry.key) === key);
  assert.ok(row, `player death/arrest text missing from GXT catalog: ${key}`);
  assert.equal(row.source, source, `player death/arrest source changed: ${key}`);
  assert.equal(row.text, text, `player death/arrest translation changed: ${key}`);
  if (gxt) assert.equal(gxt.get(key), source, `player death/arrest source mismatch: ${key}`);
}
for (const key of ['ganga1', 'ganga2', 'ganga3', 'ganga4', 'ganga5', 'ganga6', 'ganga7']) {
  const row = gameplayGxt.find((entry) => entry.key === key);
  assert.ok(row && /[\u0590-\u05ff]/u.test(row.text), `Hebrew pause-screen gang label missing: ${key}`);
}
for (const [key, text] of Object.entries(gxtExtras)) {
  const row = gameplayGxt.find((entry) => String(entry.key) === key);
  assert.ok(row, `supplemental GXT key missing from runtime catalog: ${key}`);
  assert.equal(row.text, text, `supplemental GXT translation changed: ${key}`);
  assert.equal((row.source.match(/#/g) || []).length % 2, (row.text.match(/#/g) || []).length % 2,
    `supplemental GXT color-marker parity changed: ${key}`);
}
const correctionExpectations = {
  '3913': 'שתי כוסיות שוות',
  '6166': 'הופעה עוצרת',
  '7002': 'Ice-Cream Van',
  '1290': 'Ice-Cream Van',
  '6156': 'לול תרנגולות',
  '7078': 'ג׳מבו־דמבו',
  '7091': 'אתה מפוטר',
  '7121': 'Fire Engine',
  '4209': 'סורגים לבדם לא עושים כלא',
  '4225': 'המערביים המחורבנים',
  '4226': 'הפריבילגיה להיעצר',
  '1201': 'יש לך מזל הפעם',
  '4206': 'להקשיב למצפון שלך',
  '4207': 'נמצא בלבנו מקום לקבל אותך שוב',
  '6172': 'זאת אכזבה מרה',
  '6174': 'אתה מפוטר',
  '6178': 'לחפש סוכן אחר',
  '7081': 'לא מתאימה לזייבאצו',
  '7083': 'הביצוע שלך לא מקובל',
  '7090': 'הביצוע שלך פתטי, קוסאי',
  '5500': 'חסל אנשים כדי לצבור',
  '3579': 'אתה גורם לזה להיראות קל, חבר!',
  '4200': 'המגושמות שלך קיצרה את העבודה',
  '4202': 'לנטוש את המשימה',
  '3202': 'איך בכלל הצלחת לעבור?',
  '3204': 'איך בכלל הצלחת להיכשל?',
  '1121': 'בהחלט הרווחת #$40,000#',
  '6180': 'לעזאזל, בן אדם, אתה יודע להגיע ברגע האחרון',
  '802': 'יש לך בטן מלאה בחומר נפץ',
  '1402': 'הטנק הזה לא משחק',
  '4209': 'אומרים שסורגים לא עושים כלא',
  '4224': 'כשלא תכננו את זה, חבר',
  '6159': 'יכסחו לך את התחת',
  '6160': 'רדנק פרימיטיבי',
  '6173': 'סולם הדרגות של זייבאצו',
  '7075': 'ההשתוללות המטורפת שלך',
  '8001': 'הקו הצליח!',
  'mpkill1': 'חיסלת את עצמך',
  'mpkill2': 'חיסלת את',
  'mpkill3': 'חיסל אותך',
  'mpkill4': 'חיסל את',
  'mpkill5': 'התאבד',
};
for (const [key, expected] of Object.entries(correctionExpectations)) {
  assert.ok(gameplayGxt.find((r) => String(r.key) === key)?.text.includes(expected),
    `contextual correction missing for GXT ${key}`);
}
assert.ok(messages.find((r) => r.gxtKey === '7070')?.text.includes('יצאת מהמרוץ, ג\'מבו'),
  'GXT 7070 keeps the arrest-context meaning of being out of the running');
for (const key of ['1290', '1402', '5000', '5001', '5013', '5014', '5015', '5028', '5029', '5030', '5045', '5050', '5063', '1015', '1900', '1901', '1903', '1905', '2070', '2071', '3200', '3210', '4310', '6100',
  '7020', '7130', '7230', '1902', '1904', '2052', '2059', '3202', '3204', '2215', '2232', '1124', '1125', '2997', '2998', '2999', 'c00', 'c02', 'c29', 'c31']) {
  assert.ok(gameplayGxt.some((r) => String(r.key) === key), `player-facing GXT entry missing: ${key}`);
}
assert.equal(missionExtras.length, 9, 'supplemental active dialogue/objective prompts are included');
for (const row of missionExtras) {
  assert.ok(row.source && /[\u0590-\u05ff]/u.test(row.text), `supplemental dialogue missing translation: ${row.gxtKey}`);
  if (gxt) assert.equal(gxt.get(String(row.gxtKey)), row.source, `supplemental source mismatch: ${row.gxtKey}`);
}
const requiredFrenzies = gameplayGxt.filter((r) => /FRENZY|seconds/i.test(r.source));
assert.ok(requiredFrenzies.length >= 150, 'Kill Frenzy outcomes and instructions across areas are covered');
for (const row of requiredFrenzies) {
  const sourceHashes = (row.source.match(/#/g) || []).length;
  const textHashes = (row.text.match(/#/g) || []).length;
  assert.equal(sourceHashes % 2, textHashes % 2, `GXT color-toggle parity changed: ${row.key}`);
}

const hook = fs.readFileSync(path.join(root, 'port/platform/jobs_web.cpp'), 'utf8');
assert.match(hook, /\{ 3840, 3861 \}/);
assert.match(hook, /\{ 2954, 2959 \}/);
assert.match(hook, /static int keys\[88\]/);
console.log(`test_gameplay_translation_additions: OK (${messages.length} script-indexed briefs + ${missionExtras.length} supplemental candidates, ${Object.keys(titles).length} titles/status, ${gameplayGxt.length} native GXT entries including ${Object.keys(gxtExtras).length} supplemental key translations and ${requiredFrenzies.length} challenge strings; ${gxt ? 'exact GXT sources matched' : 'catalog validated; exact GXT source matching skipped (game data not present)'})`);
