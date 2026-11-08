#!/usr/bin/env node
// Add contextual corrections and newly discovered script-active game text.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const catalogPath = path.join(root, 'web/mission-translations.he.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const edits = new Map(Object.entries({
  1162: 'זוז מהר, גקו, ותסתכל על השעון! יש לך רק שלוש דקות להוציא את הסחורה לרחוב!',
  1165: 'מהר, גקו! נשארו עוד שלוש מסירות, ויש אנשים שצריכים את הסמים.',
  1168: 'אם רציתי סוחרים מתים, הייתי שוכר מתנקשים. הגיע תורך, גקו!',
  1221: 'זה טריי וולש. הלוניז החדירו סמים לאספקת המים ופגעו בעסק שלי. הנקמה תהיה פשוטה. קודם תשיג Loony Dementia מיוחדת.',
  1225: 'טוב, גקו, הנה התוכנית... קח את ה־Dementia ל־Bomb Shop וחמש אותה בחומר נפץ. אחר כך החזר אותה ל־Loony Garage ופוצץ את הלוניז עד הירח.',
  1261: 'נראה שמישהו חזק יותר עומד מאחורי גריסת המכוניות, גקו. הבא את הבוס של היוט למפקדת זייבאצו, ונשתמש בטיפול באלקטרודות כדי לגלות מה הוא יודע.',
  1277: 'נהנית? עכשיו סע איתו ל־Easy Rider Whore House!',
  1334: 'טוב, ג׳מבו, החזר את הלימוזינה ל־Asylum בלי למשוך תשומת לב, כן?',
  1335: 'תפסיק להשתטות וסע ל־Asylum בלי לבלוט, אחי.',
  1535: 'אתה יודע לבחור תוכניות גרועות, ג׳מבו. קח פיצה קייק מטוגנת ו־$20,000 לחגיגה.',
  1614: 'התחנה הבאה היא Loony Land, ביתם של החבר׳ה בחלוקי הלילה הירוקים. תזהה את המכוניות שלהם לפי הפרצופים המחייכים שעל הגג.',
  1674: 'אידיוט! אל תחשוב שאשכח את זה כל כך מהר!',
  1689: 'שמירה על דרך זייבאצו מאובטחת היא עבודה במשרה מלאה, גקו. קח $20,000 על עבודה טובה.',
  1752: 'עבודה טובה, ג׳מבו. עכשיו אשיג מוניות תוך רגע! קבל $60,000 כי אני מחבב אותך כל כך. שמור על קשר!',
  1753: 'תפסיק להשתהות, ג׳מבו. הגיע הזמן לגרוס!',
  1757: 'מה אתה מסתובב בחוץ? חזור למונית וסיים את העבודה.',
  2005: 'הפעל את המטען בלחיצה על ההדק, רוסטר, אבל אל תתעכב.',
  2016: 'הפעל את המטען בלחיצה על ההדק, רוסטר!',
  2026: 'יאללה, הגיע זמן להרוג, רוסטר! דרוס 50 מדענים עם ה־Z-Type של זייבאצו.',
  2032: 'אתה נוהג כמו סבתא עיוורת ושיכורה, רוסטר. בלי ה־Meteor אתה כלום. חזור לטלפונים הציבוריים.',
  2034: 'לאן אתה הולך, רוסטר? חזור עכשיו ל־Zaibatsu Village.',
  2301: 'קודם אסוף את משלחת הרדנקס מ־Cobbs Store ב־Mobile RV.',
  2305: 'עכשיו סע ל־The Ol’ Banjo ואסוף עוד כמה מהלבנים העלובים.',
  2307: 'סע במהירות ל־Zaibatsu Village, THC-303, ואסוף את נציגי זייבאצו.',
  2311: 'עכשיו בזהירות, THC-303. החזר את כולם ל־Scientist Research Center — ומהר.',
  2512: 'השמד את ארבע הטורבינות וחכה להוראות נוספות. אה, ותיזהר מהשומרים.',
  2514: 'מצוין, THC-303. עכשיו השמד את ה־Generator, וחברת המים H2000 תצטרך להזמין שרברבים! הא־הא!',
  2515: 'הסתלק משם מהר, THC-303! השומרים בעקבותיך!',
  2516: 'יש לי שיבוטים של מדעני אס־אר־אס שיוכלו לעזור לך, THC-303!',
  2517: 'כל הכבוד, THC-303. חברת המים H2000 התייבשה, ואפשר להמשיך בתוכנית המתוחכמת שלנו. קבל $70,000 על תרומתך המצוינת.',
  2648: 'חוסר יכולת, גקו! ה־Meteor נהרסה, סרום השיבוט אבד, והביצים שלי כמו בלונים מלאים במים. תיעלם!',
  2650: 'ל־Meteor הזאת יש שווי שוק עצום, גקו. היכנס אליה והבא אותה עכשיו ל־The Village!',
  2656: 'עכשיו אני צריך Cop Car מסוים, גקו. אבל קודם תשיג Truck Cab.',
  2657: 'אתה אוסף Trailer, גקו, ולכן אתה צריך Truck Cab.',
  2658: 'חזור ל־Truck Cab, גקו, וסע אל ה־Crane!',
  2660: 'אתה כמו ליצן בקרקס זול, גקו. חבר את ה־Trailer ל־Truck Cab.',
  2664: 'היה קשה לגנוב את ה־Trailer, גקו, אבל ציפיתי ממך ליותר.',
  2667: 'טוב, גקו. עכשיו אסוף את ה־Trailer מאחורי ה־Cop Station.',
  2962: 'עלה במדרגות וחצה את הצינורות כדי להיכנס ל־Cop Station. השמד את ה־Generator שעל הגג כדי לפתוח את היציאה, ואז גנוב את ה־Trailer שעליו מותקנת מכונית סוכנים מיוחדת.',
  3164: 'עכשיו, אחרי שליאו מת, כבר לא תוכל לפתוח את שער אתר הבנייה, גראסהופר!',
  3166: 'בסדר, קטנצ׳יק, תראה לי את השער.',
  3181: 'השמדת את ה־Generator, קטנצ׳יק! טוב, תראה לי את השער.',
}));

for (const [key, text] of edits) {
  const row = catalog.records.find((item) => String(item.gxtKey) === key);
  if (!row) throw new Error(`Missing reviewed GXT key ${key}`);
  row.text = text;
  row.reviewStatus = 'context-reviewed';
}
for (const key of ['2512', '2514', '2515', '2516', '2517']) {
  catalog.records.find((item) => String(item.gxtKey) === key).mission = 'Water Carry On!';
}

const newlyActive = [
  ['Downtown', '1989', 'The Final Job!', 'You did it! Follow the #big pink marker# to leave the #Downtown District#!', 'כל הכבוד! סע בעקבות #הסמן הוורוד הגדול# כדי לצאת ממחוז #Downtown#!'],
  ['Residential', '2910', 'Leave Residential District', 'HEY! You now have enough cash to leave this District. Follow the marker if you want to leave!', 'היי! יש לך עכשיו מספיק כסף כדי לצאת מהמחוז. סע בעקבות הסמן אם ברצונך לעזוב!'],
  ['Residential', '2911', 'Leave Residential District', "You don't have enough money to leave this District. You need $3,000,000!", 'אין לך מספיק כסף כדי לצאת מהמחוז. דרושים לך $3,000,000!'],
  ['Industrial District', '3489', 'Deconstruction Yard!', 'Stop wasting time! #Bring# the #Cop Car# to the #Cranes# to be crushed!', 'תפסיק לבזבז זמן! #הבא# את ה־#Cop Car# אל ה־#Cranes# כדי לגרוט אותו!'],
  ['Industrial District', '3752', 'Leave Industrial District', 'OK! You now have enough cash to leave this District. Follow the #marker# if you want to leave town!', 'יופי! יש לך מספיק כסף כדי לצאת מהמחוז. סע בעקבות ה־#סמן# אם ברצונך לעזוב את העיר!'],
  ['Industrial District', '3753', "Leave Industrial District", "You don't have enough cash to leave this District. You need #$5,000,000#!", 'אין לך מספיק כסף כדי לצאת מהמחוז. דרושים לך #$5,000,000#!'],
  ['Downtown', '1125', 'Job status', 'JOB FAILED!', 'המשימה נכשלה!'],
  ['Downtown', '1150', 'Gang escort dialogue', 'Hey, wait for us!', 'היי, חכו לנו!'],
  ['Downtown', '1240', 'Gang escort dialogue', 'Hey, wait for us!', 'היי, חכו לנו!'],
  ['Downtown', '1256', 'Gang dialogue', "Hey, I don't know shit. Even if I did, I wouldn't tell you or Trey Welsh.", 'היי, אני לא יודע כלום. וגם אילו ידעתי, לא הייתי מספר לך או לטריי וולש.'],
  ['Downtown', '1262', 'Yutes Must Die!', 'Settle down, tough guy! The bloke you need is relaxing at the Easy Rider Whore House.', 'תירגע, גיבור! הבחור שאתה מחפש נח לו ב־Easy Rider Whore House.'],
  ['Downtown', '1271', 'Gang escort dialogue', 'Hey, wait for me!', 'היי, חכה לי!'],
  ['Downtown', '1647', 'Gang escort dialogue', 'Hey, wait for me!', 'היי, חכה לי!'],
  ['Downtown', '1699', 'Gang escort dialogue', 'Hey, wait for me!', 'היי, חכה לי!'],
  ['Downtown', '7005', 'Gang escort dialogue', 'Hey! Wait for me, stud!', 'היי! חכה לי, חתיך!'],
  ['Downtown', '7006', 'Gang escort dialogue', 'Where are you going? Watch Lance in action!', 'לאן אתה הולך? חכה ותראה את לאנס בפעולה!'],
  ['Downtown', '7010', 'Gang escort dialogue', 'Hey, where are you going? Come back and pick us up!', 'היי, לאן אתה הולך? תחזור לקחת אותנו!'],
  ['Residential', '6146', 'Residential District introduction', 'Welcome to the Residential District, home to the roughneck #Redneck# gang, the smart-ass #SRS Scientists# and, of course, the cunning #Zaibatsu# Corporation. Good luck!', 'ברוך הבא למחוז Residential, מקום מושבם של #הרדנקס הקשוחים#, #מדעני אס־אר־אס החכמולוגים# וכמובן #תאגיד זייבאצו הערמומי#. בהצלחה!'],
  ['Residential', '6181', 'Gang jobs complete', 'Well done, Gecko! You have passed all of the #Zaibatsu# jobs.', 'כל הכבוד, גקו! עברת את כל המשימות של זייבאצו.'],
  ['Residential', '6182', 'Gang jobs complete', "Jesus H Christ, Rooster! You've passed all of the #Redneck# jobs.", 'אלוהים אדירים, רוסטר! עברת את כל המשימות של הרדנקס.'],
  ['Residential', '6183', 'Gang jobs complete', 'Excellent work, THC-303! You have passed all of the #Scientist# jobs.', 'עבודה מצוינת, THC-303! עברת את כל המשימות של המדענים.'],
];
for (const [area, gxtKey, mission, source, text] of newlyActive) {
  let row = catalog.records.find((item) => String(item.gxtKey) === gxtKey && item.area === area);
  if (!row) {
    row = { id: `${area.toLowerCase().replace(/\s+/g, '-')}.active.${gxtKey}`, area, mission,
      speaker: '', kind: 'brief', source, text, matchStatus: 'verified-gxt', gxtKey, reviewStatus: 'context-reviewed' };
    catalog.records.push(row);
  } else row.text = text;
  row.reviewStatus = 'context-reviewed';
}
const contextualReviewed = new Set([...edits.keys(), ...newlyActive.map(([, key]) => key), '1600', '1251', '6009']);
for (const row of catalog.records) row.reviewStatus = contextualReviewed.has(String(row.gxtKey)) ? 'context-reviewed' : 'key-verified';
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`.replace(/\n/g, '\r\n'));

const titlePath = path.join(root, 'web/mission-titles.he.json');
const titles = JSON.parse(fs.readFileSync(titlePath, 'utf8'));
const addedTitles = {
  1952: ['TUTORIAL!', 'הדרכה!'], 1953: ['THE FINAL JOB!', 'המשימה האחרונה!'],
  1955: ['PIZZA CAKE!', 'פיצה קייק!'], 2473: ['GO!', 'צא!'],
  2954: ['TANKS-GIVING!', 'חג הטנקים!'], 2955: ['GANG CAR BANG!', 'מלחמת רכבי כנופיות!'],
  2956: ['PENAL TIES!', 'עונשי מאסר!'], 2957: ['SINK OR SWIM!', 'לשחות או לטבוע!'],
  2958: ['FAKE TRUCE!', 'הפסקת אש מזויפת!'], 2959: ["LABRAT'S PLAN!", 'התוכנית של לה־בראט!'],
  3840: ['DECONSTRUCTION YARD!', 'מגרש ההריסות!'], 3841: ['COP CAR SCRAP!', 'גריטת ניידות!'],
  3842: ['COSSACK CONVERSION!', 'המרת קוזקים!'], 3843: ['SUNBEAM CONTRACT!', 'החוזה של סאנבים!'],
  3844: ['CONVERSION EVASION!', 'בריחה מהמרה!'], 3845: ['ROOFTOP RESCUE!', 'חילוץ מהגג!'],
  3846: ['POWER STATION!', 'תחנת הכוח!'], 3847: ['GANG WAR!', 'מלחמת כנופיות!'],
  3848: ['GRAND THEFT AUTO!', 'גניבת מכוניות!'], 3849: ['PAYBACK!', 'נקמה!'], 3850: ['LOCK-OUT!', 'נעילה בחוץ!'],
  3851: ['IT WAS AN ACCIDENT!', 'זו הייתה תאונה!'], 3852: ["I'D LIKE A TANK PLEASE, BOB!", 'אפשר טנק, בבקשה, בוב?'],
  3853: ['ARMY BASE ALERT!', 'כוננות בבסיס הצבא!'], 3854: ['HOT DOG HOMICIDE!', 'רצח נקניקייה!'],
  3855: ['MMM, RUSSIAN SAILORS!', 'מממ, מלחים רוסים!'], 3856: ['OFFICER DOWN!', 'שוטר נפל!'],
  3857: ['KARMA ASSASSINS!', 'מתנקשי קארמה!'], 3858: ['TANKS A LOT!', 'תודה רבה, טנקים!'],
  3859: ['VEDIC MASSACRE!', 'טבח ודי!'], 3860: ['SUPER GRASS RESCUE!', 'חילוץ המלשן!'],
  3861: ['FINAL JOB!', 'המשימה האחרונה!'],
  1016: ['ALL YAKUZA JOBS DONE!', 'כל משימות היאקוזה הושלמו!'],
  1017: ['ALL LOONY JOBS DONE!', 'כל משימות הלוניז הושלמו!'],
  1018: ['ALL ZAIBATSU JOBS DONE!', 'כל משימות זייבאצו הושלמו!'],
  1124: ['JOB COMPLETE!', 'המשימה הושלמה!'], 1125: ['JOB FAILED!', 'המשימה נכשלה!'],
  1338: ['JOB FAILED!', 'המשימה נכשלה!'], 1339: ['JOB FAILED!', 'המשימה נכשלה!'],
  2998: ['Mission Failed!', 'המשימה נכשלה!'], 2999: ['Mission Complete!', 'המשימה הושלמה!'],
  3100: ['JOB COMPLETE!', 'המשימה הושלמה!'], 3730: ['JOB FAILED!', 'המשימה נכשלה!'],
  3670: ['ALL KRISHNA JOBS DONE!', 'כל משימות קרישנה הושלמו!'],
  3672: ['ALL RUSSIAN JOBS DONE!', 'כל משימות הרוסים הושלמו!'],
  3674: ['ALL ZAIBATSU JOBS DONE!', 'כל משימות זייבאצו הושלמו!'],
  6147: ['WANG CAR BONUS!', 'בונוס מכונית ואנג!'],
  6184: ['SCIENTIST GANG COMPLETE!', 'כנופיית המדענים הושלמה!'],
  6185: ['REDNECK GANG COMPLETE!', 'כנופיית הרדנקס הושלמה!'],
  6186: ['ZAIBATSU GANG COMPLETE!', 'כנופיית זייבאצו הושלמה!'],
  9001: ['JOB FAILED!', 'המשימה נכשלה!'], 9002: ['KILL FRENZY!', 'אתגר חיסול!'],
  9003: ['FRENZY PASSED!', 'אתגר החיסול הושלם!'], 9004: ['FRENZY FAILED!', 'אתגר החיסול נכשל!'],
};
for (const [key, [source, text]] of Object.entries(addedTitles)) titles.titles[key] = { source, text };
const titleOrder = [...Array.from({ length: 19 }, (_, i) => String(1970 + i)),
  ...Array.from({ length: 11 }, (_, i) => String(2460 + i)),
  ...Array.from({ length: 4 }, (_, i) => String(2671 + i)),
  '1952', '1953', ...Array.from({ length: 6 }, (_, i) => String(2954 + i)),
  ...Array.from({ length: 22 }, (_, i) => String(3840 + i)), '1955', '2473',
  ...['1016', '1017', '1018', '1124', '1125', '1338', '1339', '2998', '2999', '3100', '3730', '3670', '3672', '3674', '6147', '6184', '6185', '6186', '9001', '9002', '9003', '9004']];
const titleRows = titleOrder.map((key, index) => `    ${JSON.stringify(key)}: { "source": ${JSON.stringify(titles.titles[key].source)}, "text": ${JSON.stringify(titles.titles[key].text)} }${index + 1 < titleOrder.length ? ',' : ''}`);
fs.writeFileSync(titlePath, `{
  "version": 1,
  "language": "he",
  "titles": {
${titleRows.join('\r\n')}
  }
}
`.replace(/(?<!\r)\n/g, '\r\n'));
console.log(`contextual fixes: ${edits.size}; newly cataloged active briefs: ${newlyActive.length}; titles: ${Object.keys(addedTitles).length}`);
