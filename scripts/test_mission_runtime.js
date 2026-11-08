#!/usr/bin/env node
// Exercise the actual browser matching function against every local catalog row.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const root = path.join(__dirname, '..');
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8'));
  const extras = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-extras.he.json'), 'utf8'));
  const gameplayGxt = JSON.parse(fs.readFileSync(path.join(root, 'web/gxt-gameplay.he.json'), 'utf8'));
  const runtimeRecords = [...catalog.records, ...extras.records];
  let source = fs.readFileSync(path.join(root, 'web/missiontext.js'), 'utf8');
  source = source.replace("import { lang } from './strings.js';", "const lang = () => 'he';");
  source = source.replace('let records = [];', `let records = ${JSON.stringify(runtimeRecords)};`)
    .replace('let gameplayGxtRecords = [];', `let gameplayGxtRecords = ${JSON.stringify(gameplayGxt.records)};`)
    .replace('let ready = false;', 'let ready = true;');
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  let gxtSource = fs.readFileSync(path.join(root, 'web/gamegxt.js'), 'utf8')
    .replace("import { lang } from './strings.js';", "const lang = () => 'he';");
  const gxtMod = await import(`data:text/javascript;base64,${Buffer.from(gxtSource).toString('base64')}`);
  const resolveGxt = gxtMod.createGxtResolver(gameplayGxt.records);
  for (const row of runtimeRecords) {
    const result = mod.missionText(row.source, { gxtKey: row.gxtKey });
    assert.equal(result.translated, true, `not matched at runtime: ${row.area}/${row.gxtKey}`);
    const displayText = row.text.replace(/#([^#]*)#/g, '$1').replace(/#/g, '');
    assert.equal(result.text, displayText, `wrong runtime translation: ${row.area}/${row.gxtKey}`);
    assert.ok(!result.text.includes('#'), `GXT formatting markers leaked into displayed text: ${row.area}/${row.gxtKey}`);
    if (row.text.includes('#')) assert.ok(result.colorRuns.some((run) => run.highlighted), `GXT highlight color lost: ${row.area}/${row.gxtKey}`);
  }
  const first = catalog.records[0];
  const wrongKey = mod.missionText(first.source, { gxtKey: 'not-a-real-gxt-key' });
  assert.equal(wrongKey.translated, false, 'a source line must not bypass an unknown GXT key');
  const riggedVehicle = mod.missionText("The vehicle's been rigged! That's $5000.", { gxtKey: 'bdone' });
  assert.equal(riggedVehicle.translated, true, 'formatted alphabetic GXT HUD brief should translate');
  assert.equal(riggedVehicle.text, 'הרכב ממולכד! זה יעלה $5000.', 'dynamic GXT amount should survive translation');
  assert.ok(riggedVehicle.colorRuns.some((run) => run.highlighted), 'dynamic GXT highlight markers should survive');
  assert.equal(resolveGxt("The vehicle's been rigged! That's $5000."), 'הרכב ממולכד! זה יעלה #$5000#.');
  assert.equal(resolveGxt("You ain't got enough cash! You need $10000."), 'אין לך מספיק כסף! צריך #$10000#.');
  const frenzy = mod.missionText('Use the Rocket Launcher to destroy 10 vehicles in 60 seconds!', { gxtKey: '7031' });
  assert.equal(frenzy.translated, true, 'native GXT challenge should translate in map brief history');
  assert.equal(frenzy.text, 'השתמש במטול רקטות כדי להשמיד 10 כלי רכב בתוך 60 שניות!');
  const tutorialWeapon = runtimeRecords.find((row) => String(row.gxtKey) === '1617');
  assert.match(tutorialWeapon.text, /תת־המקלע S-Uzi/);
  assert.match(tutorialWeapon.text, /אסימון מיוחד/);
  const uniformBrief = runtimeRecords.find((row) => String(row.gxtKey) === '2217');
  assert.match(uniformBrief.text, /תת־מקלע S-Uzi/);
  const industrialWelcome = runtimeRecords.find((row) => row.area === 'Industrial District' && String(row.gxtKey) === '3230');
  assert.equal(industrialWelcome.text,
    'הגעת ל־Industrial District... השתדל לא להסתכסך עם המאפיה הרוסית, לא למצוא את עצמך מומר בידי אנשי קרישנה ולא להיבלע בידי זייבאצו. בהצלחה!',
    'Industrial welcome must preserve the source meaning of being converted by the Krishna');
  assert.doesNotMatch(industrialWelcome.text, /להתפתות/, 'conversion must not be changed to temptation');
  for (const input of ['ⅲHey, Rooster! #Steal# the Pickup.', 'ⅮAn English #fallback# with 123']) {
    const normalized = mod.normalizeMissionText(input);
    assert.ok(normalized && !normalized.startsWith('ⅲ') && !normalized.startsWith('Ⅾ'));
  }
  console.log(`test_mission_runtime: OK (${runtimeRecords.length} exact GXT-key runtime matches including ${extras.records.length} supplemental active candidates; unknown keys fall back to English)`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
