#!/usr/bin/env node
// Create an honest translation audit from the locally scanned game scripts.
// Run scripts/build_mission_inventory.js first; game data stays ignored/local.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'build/mission-inventory.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8'));
const translations = catalog.records;
const runtime = JSON.parse(fs.readFileSync(path.join(root, 'docs/mission-runtime-validation.json'), 'utf8'));
const key = (area, gxtKey) => `${area}\0${gxtKey}`;
const briefRows = inventory.messages.filter((row) => row.scopes.some((s) => s === 'mission-brief' || s === 'phone-template'));
const sourceKeys = new Set(briefRows
  .filter((row) => !row.source.includes('DEAD BRIEF'))
  .map((row) => key(row.area, row.gxtKey)));
const mapped = new Set(translations.filter((r) => sourceKeys.has(key(r.area, r.gxtKey))).map((r) => key(r.area, r.gxtKey)));
const reviewed = new Set(translations.filter((r) => r.reviewStatus === 'context-reviewed' && sourceKeys.has(key(r.area, r.gxtKey))).map((r) => key(r.area, r.gxtKey)));
const total = sourceKeys.size;
const translated = mapped.size;
const simulatedVerified = new Set((runtime.simulatedRuntime || [])
  .filter((row) => row.status === 'displayed-and-inspected')
  .map((row) => key(row.area, row.gxtKey)));
const liveVerified = new Set((runtime.liveMissions || [])
  .filter((row) => row.status === 'displayed-and-inspected')
  .map((row) => key(row.area, row.gxtKey)));
const fallbackVerified = (runtime.fallbackRuntime || []).filter((row) => row.status === 'displayed-original-English').length;
const uiVerified = (runtime.uiTransitions || []).filter((row) => row.status === 'displayed-and-inspected').length;
const untranslated = total - translated;
const displayUnverified = translated - new Set([...simulatedVerified, ...liveVerified].filter((k) => mapped.has(k))).size;
const areaLines = Object.entries(inventory.counts.byArea).map(([area, counts]) => {
  const areaTotal = briefRows.filter((row) => row.area === area && !row.source.includes('DEAD BRIEF')).length;
  const areaTranslated = mapped.size && translations.filter((r) => r.area === area && sourceKeys.has(key(area, r.gxtKey))).length;
  return `| ${area} | ${areaTotal} | ${areaTranslated} | ${areaTotal - areaTranslated} |`;
});
const report = `# Mission message coverage audit\n\n` +
`Generated from local original game data on ${new Date().toISOString().slice(0, 10)}. ` +
`The source scripts reference ${briefRows.length} unique face-marked GXT IDs; ${total} contain message text, while four are unused DEAD BRIEF placeholders. The ${total} text-bearing IDs come from compiled .scr commands ` +
`DISPLAY_BRIEF, DISPLAY_BRIEF_NOW, DISPLAY_BRIEF_SOON, or PHONE_TEMPLATE in the three district script trees. ` +
`It includes objective prompts, progression/failure prompts, and gang phone brief text; it is a broad upper bound for task-relevant language, not 1,158 distinct story openings. ` +
`One DISPLAY_MESSAGE reference overlaps key 1244, which is also a translated mission brief.\n\n` +
`The inventory scans local source scripts statically; it does not claim each conditional/phone message was seen in a live playthrough. ` +
`Matching is by (district, GXT key), not by approximate English text.\n\n` +
`| Measure | Count |\n|---|---:|\n` +
`| Script-referenced brief GXT IDs including placeholders | ${briefRows.length} |\n` +
`| Original text-bearing brief messages | ${total} |\n` +
`| Translated and matched to source key | ${translated} |\n` +
`| Proofread for meaning/context | ${reviewed.size} |\n` +
`| Displayed and inspected through the engine's local runtime injection harness | ${simulatedVerified.size} |\n` +
`| Displayed and inspected during an actual mission | ${liveVerified.size} |\n` +
`| Untranslated fallback messages visually confirmed in original English | ${fallbackVerified} |\n` +
`| Pause/main-menu UI states visually inspected | ${uiVerified} |\n` +
`| Untranslated | ${untranslated} |\n` +
`| Translation display not visually verified | ${displayUnverified} |\n` +
`| Unused DEAD BRIEF placeholders | ${briefRows.length - total} |\n` +
`| DISPLAY_MESSAGE keys also referenced as mission brief (already translated) | ${inventory.messages.filter((r) => r.scopes.includes('display-message') && sourceKeys.has(key(r.area, r.gxtKey))).length} |\n\n` +
`| District | Original keys | Translated | Missing |\n|---|---:|---:|---:|\n${areaLines.join('\n')}\n\n` +
`## Interpretation and limits\n\n` +
`Static translation coverage is ${translated === total ? '100%' : `${Math.floor(translated / total * 100)}%`}; this does not certify visual display or full gameplay acceptance. The catalog contains ${translations.length} unique records and ${reviewed.size} rows marked context-reviewed against ${total} text-bearing brief keys. ` +
`The engine-native injection harness queues a real GXT key through Hud_Brief_704, but only entries recorded as displayed-and-inspected count above. ` +
`The simulated display count represents engine-queue injection and screenshot inspection, not a mission script run. ${runtime.notes || ''} ` +
`The script inventory also cannot prove runtime reachability of branches; conditional messages still need in-game exercise before they can be counted as seen.\n`;
const out = path.join(root, 'docs/mission-coverage.md');
fs.writeFileSync(out, report);
console.log(`coverage report: ${translated}/${total} translated; ${reviewed.size} context-reviewed; ${simulatedVerified.size} runtime-injected displayed; ${liveVerified.size} live-mission displayed; ${untranslated} untranslated; ${displayUnverified} display-unverified`);
console.log(out);
