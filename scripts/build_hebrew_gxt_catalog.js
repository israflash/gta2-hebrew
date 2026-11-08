#!/usr/bin/env node
// Generate the small, player-facing Hebrew GXT catalog from a locally supplied
// original e.gxt. The game data itself is deliberately never copied to Git.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const input = process.argv[2] || path.join(root, 'game/data/e.gxt');
const output = path.join(root, 'web/gxt-gameplay.he.json');

const he = {
  // Front-end and basic flow
  play: 'שחק', options: 'אפשרויות', quit: 'יציאה', loading: 'היכון…', yes: 'כן!', no: 'אין סיכוי!',
  sure: 'בטוח?', pause: 'השהיה', contnue: 'המשך', strtlev: 'התחל במחוז', nxt_lvl: 'עבור למחוז הבא',
  savepos: 'המשך מהשמירה', replay: 'שחק שוב במחוז הקודם', mainmen: 'חזרה לתפריט הראשי',
  charctr: 'שחקן', clrchar: 'מחק שחקן', entrnam: 'הזן שם', edtname: 'ערוך שם', ed_det: 'ערוך שם',
  back: 'חזרה', quit1: 'זה הכול?', quit2: 'לחץ ENTER כדי לצאת מהמשחק.', quit3: 'לחץ ESC כדי להמשיך לשחק.',
  tport: 'העברה מיידית!', connect: 'מתחבר…', hi_scre: 'הצגת שיאים', hi_for: 'שיאי המחוז', hi_empt: 'ריק',
  leagtab: 'הצגת טבלת הליגה', tot_hi: 'טבלת השיאים הכללית', league: 'טבלת הליגה',
  bnslevs: 'שחק בשלבי הבונוס', nexbons: 'שחק בשלב הבונוס הבא', repbons: 'שחק שוב בשלב הבונוס', bonslev: 'שלב בונוס',
  esc_i: 'ESC', del_i: 'DELETE', ent_i: 'ENTER', bspc_i: 'BACKSPACE', up_i: 'UP', down_i: 'DOWN', left_i: 'LEFT', right_i: 'RIGHT',
  clrsl_i: 'מחק שחקן', edtnm_i: 'ערוך שם', delch_i: 'מחק אות', name_i: 'הזן שם',
  // Outcomes, arrest/death, timers, bonuses and multiplayer
  g_over: 'המשחק נגמר!', plr_ded: 'חוסלת!', plr_qut: 'השחקן יצא!', cmpltd: 'המחוז הושלם!',
  gam_cmp: 'המשחק הושלם!', nicetry: 'ניסיון יפה!', mfail: 'המשימה נכשלה!', kfstart: 'אתגר חיסול!',
  kfpass: 'האתגר הושלם!', kffail: 'האתגר נכשל!', wasted: 'חוסלת!', fried: 'נשרפת!', shocked: 'התחשמלת!',
  nicked: 'נעצרת!', yourit: 'תורך!', wrngway: 'בונוס נסיעה לאחור!', fly_car: 'בונוס פעלול מטורף!',
  bomb_on: 'הפצצה הופעלה!', bonus_w: 'הבונוס הושלם!', bonus_l: 'הזמן נגמר!', b_pass: 'שלב הבונוס הושלם!',
  b_fail: 'שלב הבונוס נכשל!', timeup: 'הזמן נגמר!', demtime: 'הזמן נגמר!', demded: 'השחקן חוסל!', demquit: 'השחקן יצא!',
  svcanc: 'השמירה בוטלה!', fined: 'קנס משטרתי!', fined1: 'נקנסת!', comms1: 'השחקן {s} יצא מהמשחק!',
  mult_w: 'ניצחת!', mult_l: 'הפסדת!', mult_q: 'פרשת!', mult_d: 'תיקו!',
  // Garages and save-point messages; retain formatting and dynamic amounts.
  nspray: 'תחזור כשיהיה לך מספיק כסף!', nspraya: 'אין לך מספיק כסף! צריך #$%d#.',
  nespray: 'אני לא נוגע בזה! עוף מפה!', sdone: 'הנה, צבע יפה! זה יעלה #$%d#.',
  cdone: 'נקי — החלפנו את לוחיות הרישוי. זה יעלה #$%d#.', bdone: 'הרכב ממולכד! זה יעלה #$%d#.',
  arig: 'הרכב הזה כבר ממולכד!', svdone: '#המצב שלך #נשמר#!#',
  svscore: '#עוף מפה, קבצן! שמירת המשחק כאן עולה #$50,000#!#',
  svmiss: '#אי אפשר לשמור# את מצב המשחק בזמן #משימה#. תחזור לעבודה!',
  // Score screens and player-facing stats
  score: 'ניקוד', best: 'שיא', last: 'אחרון', kills_h: 'חיסולים', frags_h: 'הריגות', pnts_h: 'נקודות', times_h: 'פעמים',
  pscore: 'ניקוד יעד: %d', pgmiss: 'משימות של {s} שהושלמו: %d/%d', pmiss: 'כל המשימות שהושלמו: %d/%d',
  psec: 'אתגרי חיסול שהושלמו: %d/%d', pbon: 'פריטי בונוס שנאספו: %d/%d',
  // The pause screen inserts these names into the translated pgmiss template.
  ganga1: 'לוניז', ganga2: 'יאקוזה', ganga3: 'זייבאצו', ganga4: 'רדנקס',
  ganga5: 'מדענים', ganga6: 'קרישנה', ganga7: 'רוסים',
  car_cst: 'עלות תיקון נזקי רכב', car_dam: 'כלי רכב שניזוקו', carjack: 'כלי רכב שנגנבו', carjaka: 'גנב רכבים!',
  run_ovr: 'אזרחים שנדרסו', murder: 'אזרחים שנרצחו', cop_kl: 'שוטרים שנהרגו', copkill: 'קוטל שוטרים!',
  gng_kl: 'חברי כנופיה שנהרגו', evsnrtg: 'מקדם בריחה', excutin: 'הוצאה להורג מהירה!', gencide: 'טבח!',
  accurcy: 'בונוס דיוק!', elvis_d: 'אלביס עזב את הבניין!', em_dest: 'מצב חירום רפואי!',
  stl_all: 'גניבת מכוניות!', dst_all: 'השמדה מוחלטת!', bnk_job: 'שוד בנקים', slfkils: 'התאבדויות שחקן',
  firearm: 'עבירות נשק', unconc: 'הולכי רגל שהוכו עד אובדן הכרה', stl_car: 'כלי רכב ריקים שנגנבו',
  car_des: 'כלי רכב שהושמדו', hijack: 'חטיפות רכב', bus_hi: 'אוטובוסים שנחטפו', trn_hi: 'רכבות שנחטפו',
  // Weapon names and weaponized vehicles. Vehicle models themselves stay English.
  c00: 'אקדח', c01: 'תת־מקלע S-Uzi', c02: 'מטול רקטות', c03: 'אקדח חשמלי', c04: 'בקבוקי תבערה',
  c05: 'רימונים', c06: 'רובה ציד', c07: 'אלת חשמל', c08: 'להביור', c09: 'תת־מקלע S-Uzi מושתק', c10: 'שני אקדחים',
  c15: 'פצצת רכב', c16: 'כתם שמן לרכב', c17: 'מוקשים לרכב', c18: 'מקלעי רכב', c19: 'תותח טנק',
  c20: 'תותח מים', c21: 'להביור לרכב', c22: 'תותח ג׳יפ', c23: 'פצצת רכב מיידית',
  // Pickups and player bonuses
  c28: 'מכפיל ניקוד +1', c29: 'חיים +1', c30: 'בריאות', c31: 'שריון', c32: 'כרטיס יציאה מהכלא',
  c33: 'שוחד לשוטר', c34: 'חסינות זמנית*', c35: 'נזק כפול', c36: 'טעינה מהירה', c37: 'אצבעות חשמליות',
  c38: 'כבוד!', c39: 'אי־נראות', c40: 'תגבורת כנופיה מיידית',
  // Duplicate system strings and standalone outcomes used by several screens.
  '1015': 'נעצרת!', '1124': 'המשימה הושלמה!', '1125': 'המשימה נכשלה!',
  '2997': 'המצב שלך נשמר!', '2998': 'המשימה נכשלה!', '2999': 'המשימה הושלמה!',
  '1902': 'כל הכבוד! הצלחת, מותק!', '1904': 'איזה בלגן עשית, יא חמור!',
  '2052': 'אחד כבר נפל, רוסטר! לעזאזל, עוד שבעה בדרך!', '2053': 'בחיי, עונת הציד נפתחה! נשארו שישה!',
  '2054': 'איזה בן זונה מכוער! נשארו חמישה לחסל, רוסטר!', '2055': 'מה, אתה לועס ג׳רקי מיוחד, רוסטר? נשארו עוד ארבעה לחסל!',
  '2056': 'לעזאזל, אתה מהיר! נשארו עוד שלושה רוצחי זייבאצו!', '2057': 'הם כבר גדולים עליי, רוסטר! נשארו שני מתנקשים!',
  '2058': 'קדימה, רוסטר — נשאר עוד רוצח אחד!', '2059': 'אלוהים אדירים, רוסטר! ראיתי בחיים שלי דברים מטומטמים, אבל זה שובר שיאים!',
  '3202': 'איך בכלל הצלחת לעבור?', '3204': 'איך בכלל הצלחת להיכשל?',
  '2215': 'בדרך לכלא!', '2232': 'כלא',
};

function translateFrenzy(source) {
  const clean = source.replace(/^[\u2160-\u2188]+\s*/, '').replace(/#/g, '').replace(/\s+/g, ' ').trim();
  if (/^KILL FRENZY!?$/i.test(clean)) return 'אתגר חיסול!';
  if (/^FRENZY PASSED!?$/i.test(clean)) return 'אתגר החיסול הושלם!';
  if (/^FRENZY FAILED!?$/i.test(clean)) return 'אתגר החיסול נכשל!';

  let match = clean.match(/^Kill (\d+) people with (.+?) in (\d+) seconds!?$/i);
  if (match) {
    const weapon = frenzyWeapon(match[2]);
    return colorParts(source, `חסל ${match[1]} אנשים באמצעות ${weapon} בתוך ${match[3]} שניות!`, [match[1], weapon, `${match[3]} שניות`]);
  }
  match = clean.match(/^Use (?:the |a |an )?(.+?) to (shoot|kill|destroy|torch|fry|run over) (\d+) (people|vehicles|cops|cop cars) in (\d+) seconds!?$/i);
  if (!match) return null;
  const weapon = frenzyWeapon(match[1]);
  const noun = ({ people: 'אנשים', vehicles: 'כלי רכב', cops: 'שוטרים', 'cop cars': 'ניידות משטרה' })[match[4].toLowerCase()];
  const sourceVerb = match[2].toLowerCase();
  const targetIsVehicle = ['vehicles', 'cop cars'].includes(match[4].toLowerCase());
  const verb = sourceVerb === 'torch' ? 'לשרוף'
    : sourceVerb === 'fry' ? 'לחשמל'
      : sourceVerb === 'run over' ? 'לדרוס'
        : targetIsVehicle ? 'להשמיד' : 'לחסל';
  return colorParts(source, `השתמש ב${weapon} כדי ${verb} ${match[3]} ${noun} בתוך ${match[5]} שניות!`, [weapon, `${match[3]} ${noun}`, `${match[5]} שניות`]);
}

function frenzyWeapon(source) {
  const value = source.replace(/^#|#$/g, '').trim().toLowerCase();
  const known = {
    'molotov cocktails': 'בקבוקי תבערה', 'rocket launcher': 'מטול רקטות', 's-uzi machine gun': 'תת־מקלע S-Uzi',
    'silenced s-uzi machine gun': 'תת־מקלע S-Uzi מושתק', 'silenced machine gun': 'מקלע מושתק', 'machine gun': 'מקלע',
    'vehicle machine guns': 'מקלעי רכב', 'vehicle mines': 'מוקשים לרכב', 'tank': 'טנק', 'this vehicle': 'הרכב הזה', 'this car': 'הרכב הזה',
    'vehicle': 'רכב', 'flamethrower': 'להביור', 'electrogun': 'אקדח חשמלי', 'shotgun': 'רובה ציד', 'taxi': 'מונית',
    'this s-uzi machine gun': 'תת־מקלע S-Uzi הזה',
  };
  if (!known[value]) throw new Error(`Untranslated Kill Frenzy weapon: ${source}`);
  return known[value];
}

function colorParts(source, translated, phrases) {
  if (!source.includes('#')) return translated;
  let output = translated;
  for (const phrase of phrases) output = output.replace(phrase, `#${phrase}#`);
  return output;
}

function readGxt(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 3) !== 'GBL') throw new Error(`Not a GXT: ${file}`);
  let keys, data;
  for (let at = 6; at + 8 <= b.length;) {
    const tag = b.toString('ascii', at, at + 4), size = b.readUInt32LE(at + 4);
    if (tag === 'TKEY') keys = { at: at + 8, size };
    if (tag === 'TDAT') data = { at: at + 8, size };
    at += 8 + size;
  }
  if (!keys || !data || keys.size % 12) throw new Error(`Malformed GXT: ${file}`);
  const entries = new Map();
  for (let at = keys.at; at < keys.at + keys.size; at += 12) {
    const start = data.at + b.readUInt32LE(at);
    let end = start;
    while (end + 1 < data.at + data.size && (b[end] || b[end + 1])) end += 2;
    entries.set(b.toString('ascii', at + 4, at + 11).split('\0')[0], b.toString('utf16le', start, end));
  }
  return entries;
}

const gxt = readGxt(input);
const byKey = new Map(Object.entries(he));
// Additional player-facing GXT messages are maintained in one keyed source file;
// the generated runtime catalog is still the sole catalog consumed by the renderer.
const extraTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, 'gxt-extra-translations.he.json'), 'utf8'));
for (const [key, text] of Object.entries(extraTranslations)) byKey.set(key, text);
const challengeExtras = JSON.parse(fs.readFileSync(path.join(__dirname, 'icecream-frenzy-translations.json'), 'utf8'));
for (const [key, text] of Object.entries(challengeExtras)) byKey.set(key, text);
for (const [key, source] of gxt) {
  const frenzyText = translateFrenzy(source);
  if (frenzyText) byKey.set(key, frenzyText);
}

const records = [...byKey].map(([key, text]) => {
  const source = gxt.get(key);
  if (!source) throw new Error(`GXT key missing from source: ${key}`);
  return { key, source, text };
});
fs.writeFileSync(output, `${JSON.stringify({ version: 1, language: 'he', method: 'in-place browser text draw hook; original GXT remains English fallback', records }, null, 2)}\n`);
console.log(`wrote ${records.length} Hebrew gameplay GXT records to ${path.relative(root, output)}`);
