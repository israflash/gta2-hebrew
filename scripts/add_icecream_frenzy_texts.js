#!/usr/bin/env node
// Add the previously unlisted Ice-Cream Van challenge results/taunts using the
// same native DrawText replacement catalog. Translation source text is read
// from the checked inventory, then verified against e.gxt by the test suite.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function parseCsv(text) {
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

const translations = {
  5001: 'מקום ראשון! אתה תותח, מותק! 12 ואנים!',
  5002: 'מקום שני! איזה נהג חלקלק! 11 ואנים!',
  5003: 'מקום שלישי! איזה שוויצר! 10 ואנים!',
  5004: 'מקום רביעי! חם, חם! 9 ואנים!',
  5005: 'מקום חמישי! איזה זריז! 8 ואנים!',
  5006: 'מקום שישי! אתה הגיבור שלי! 7 ואנים!',
  5007: 'מקום שביעי! ספאם על הזמן! 6 ואנים!',
  5008: 'מקום שמיני! תישרף בגיהינום, מותק! 5 ואנים!',
  5009: 'מקום תשיעי! איזה פחדן! נשארו רק 4 ואנים!',
  5010: 'מקום עשירי! בתחתית הטבלה. נשארו רק 3 ואנים!',
  5011: 'מקום אחד־עשר! בשביל מה לטרוח, חבר? נשארו 2 ואנים עלובים!',
  5012: 'מקום שנים־עשר! יצור ביצה. נשאר ואן עלוב אחד!',
  5014: 'אתה מלך!',
  5015: 'נגמר הזמן, חבר!',
  5016: 'מקום ראשון! אלוף העולם! 12 ואנים!',
  5017: 'מקום שני! איזה בן־זונה קשוח! 11 ואנים!',
  5018: 'מקום שלישי! אלמן שחור! 10 ואנים!',
  5019: 'מקום רביעי! תן לי את זה, מותק! 9 ואנים!',
  5020: 'מקום חמישי! תשרוף, מותק, תשרוף! 8 ואנים!',
  5021: 'מקום שישי! אלוף ההצתות! שרפת 7 ואנים!',
  5022: 'מקום שביעי! הלילה צולים! 6 ואנים!',
  5023: 'מקום שמיני! מהר, חתלתולה — להרוג, להרוג! 5 ואנים!',
  5024: 'מקום תשיעי! אפילו לא ניסית, יא אפס! 4 ואנים!',
  5025: 'מקום עשירי! אפילו כלבים מתים נוהגים מהר ממך! 3 ואנים!',
  5026: 'מקום אחד־עשר! אתה נוסע רק בימי ראשון? נסה שוב! 2 ואנים!',
  5027: 'מקום שנים־עשר! המהירות מפחידה אותך, ילד? תתאמץ יותר! ואן אחד!',
  5028: 'איזה לוזר עלוב! כמה ואני גלידה של ילדים וחבורת שוטרים זוללי סופגניות עשו ממך צחוק. אתה פשוט בזבוז של עור. עוף מכאן!',
  5029: 'כל הכבוד, יא אפס! עכשיו שוואני הגלידה האלה מחוץ לתמונה, נכניס לעיר מהומת גלידת פטל משלנו ונראה לכולם מה זה „אני צורח”!',
  5030: 'אסוף כמה שיותר בונוסים לפני שהשוטרים ישיגו אותך ויהפכו אותך לאוכל לחתולים.',
  5031: 'אוי, סליחה... זה כאב?',
  5032: 'יפה מאוד!',
  5033: 'מקום ראשון! אלוף העולם! 12 ואנים!',
  5034: 'מקום שני! מהיר כמו טיל! 11 ואנים!',
  5035: 'מקום שלישי! מר סימני הצמיגים! 10 ואנים!',
  5036: 'מקום רביעי! מר חלקלק! 9 ואנים!',
  5037: 'מקום חמישי! אל פומפו הגדול! 8 ואנים!',
  5038: 'מקום שישי! חתיכת מסריח! 7 ואנים!',
  5039: 'מקום שביעי! חוסך בדלק? בפעם הבאה תן גז! 6 ואנים!',
  5040: 'מקום שמיני! אפילו לא שווה לבזבז עליך כדור! 5 ואנים!',
  5041: 'מקום תשיעי! קח את המכונית שלך ותירה בה! 4 ואנים!',
  5042: 'מקום עשירי! לך לצופים, לוזר! נשארו 3 ואנים עלובים!',
  5043: 'מקום אחד־עשר! איזה סמרטוט רטוב! נשארו 2 ואנים עלובים!',
  5044: 'מקום שנים־עשר! למה בכלל לנסות? נשאר ואן עלוב אחד!',
  5045: 'לוזררר! אתה על סמים קלים? תתאמץ יותר!',
  5050: 'שוקולטסטי!',
  5051: 'גלידת פטל!',
  5052: 'בזבזת את כל התחמושת!',
  5053: 'אוי... זה כאב?',
  5054: 'מוות לוואני הגלידה!',
  5055: 'פריך לגמרי!',
  5056: 'אתה שרוף, חבר!',
  5057: 'תטעם עופרת, חלאה!',
  5058: 'זה בטח כאב!',
  5059: 'סליחה על זה!',
  5060: 'סין לוי, אחי!',
  5061: 'נהגי יום ראשון ארורים!',
  5062: 'תטעם ותראה!',
  5063: 'תטעם את זעמי, ילד גלידה!',
};
const injectionVerified = new Set(['5001', '5028', '5030']);
const generatorExtras = {
  1290: 'צריך $5,000 כדי למלכד את רכב הגלידה בחומר נפץ.',
  1402: 'לעזאזל, קוסאי! הטנק הזה לא משחק.',
  5000: 'קיבלת הארכת זמן!',
  5013: 'השמד את כל רכבי הגלידה בזמן המוקצב. עקוב אחרי הסימונים כדי למצוא אותם. תיכשל, וגם אותך יקררו! הא! הא! הא!',
  ...translations,
};
fs.writeFileSync(path.join(__dirname, 'icecream-frenzy-translations.json'), `${JSON.stringify(generatorExtras, null, 2)}\n`);

const csvPath = path.join(root, 'docs/translation-inventory.csv');
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = rows.shift();
const columns = Object.fromEntries(header.map((name, i) => [name, i]));
const catalogPath = path.join(root, 'web/gxt-gameplay.he.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const existing = new Map(catalog.records.map((row) => [String(row.key), row]));
const pending = new Set(Object.keys(translations));

for (const row of rows) {
  const key = row[columns['מזהה']];
  if (!pending.has(key)) continue;
  const source = row[columns['מקור אנגלי (כפי שנמצא)']];
  if (!source || !translations[key]) throw new Error(`Missing inventory source/translation for ${key}`);
  const record = { key, source, text: translations[key] };
  if (existing.has(key)) Object.assign(existing.get(key), record);
  else catalog.records.push(record);
  row[columns['תרגום/נוסח עברי קיים']] = translations[key];
  row[columns['מצב נוכחי']] = injectionVerified.has(key)
    ? 'תורגם ואומת חזותית בהזרקת DrawText; לא אומת דרך טריגר משחק רגיל'
    : 'תורגם; מפתח GXT ותרגום נוספו לנתיב הציור; טרם אומת חזותית';
  row[columns['חשיבות']] = 'תוכן אתגר/הודעת משחק שמסייעת להבנת תוצאה והתקדמות';
  row[columns['המלצה']] = injectionVerified.has(key)
    ? `הוצג בנתיב DrawText המקורי בצילום QA; יש לבדוק בתוך האתגר. GXT ${key}`
    : `נוסף ל-gxt-gameplay.he.json; נדרשת בדיקה חזותית/משחקית. GXT ${key}`;
  pending.delete(key);
}
if (pending.size) throw new Error(`Inventory rows not found: ${[...pending].join(', ')}`);
catalog.records.sort((a, b) => String(a.key).localeCompare(String(b.key), 'en', { numeric: true }));
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(csvPath, writeCsv([header, ...rows]));
console.log(`Added ${Object.keys(translations).length} Ice-Cream Van challenge/result strings; GXT catalog now has ${catalog.records.length} entries.`);
