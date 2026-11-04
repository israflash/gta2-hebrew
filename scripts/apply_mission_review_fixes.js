#!/usr/bin/env node
// Targeted context review edits; source meaning stays in the catalog for audit.
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'web/mission-translations.he.json');
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
const edits = new Map([
  ['1600', 'היי, זר! ברוך הבא למחוז דאונטאון. תישאר בסביבה אם בא לך לגלות מה הולך פה...'],
  ['1251', 'הכנופייה הקטנה של היוטס נהיית חצופה ומרסקת את מכוניות זייבאצו החדשות שלנו לגרוטאות. אני רוצה תשובות. יש מלשן בשם לפטי ליד הקזינו. תברר מה הוא יודע.'],
  ['2026', 'יאללה, הגיע זמן להרוג, רוסטר! דרוס 50 מדענים עם ה־Z-Type של זייבאצו.'],
  ['2517', 'כל הכבוד, THC-303. חברת המים H2000 התייבשה, ואפשר להמשיך בתוכנית המתוחכמת שלנו. קבל $70,000 על תרומתך המצוינת.'],
  ['6009', 'לא ייאמן! ניצחת את שלושתם! כדאי שתסתלק למחוז התעשייה לפני שהמצב יחמיר עוד יותר. (נדרשים $3,000,000)'],
]);
for (const [gxtKey, text] of edits) {
  const row = catalog.records.find((item) => String(item.gxtKey) === gxtKey);
  if (!row) throw new Error(`Missing reviewed GXT key ${gxtKey}`);
  row.text = text;
  row.reviewStatus = 'context-reviewed';
}
fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`apply_mission_review_fixes: applied ${edits.size} contextual edits`);
