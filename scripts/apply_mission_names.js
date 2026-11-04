#!/usr/bin/env node
// Apply the approved, editable transliteration dictionary to mission dialogue.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalogPath = path.join(root, 'web/mission-translations.he.json');
const namesPath = path.join(root, 'web/mission-names.he.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
const entries = [...Object.entries(names.gangs), ...Object.entries(names.people), ...Object.entries(names.places || {}), ...Object.entries(names.terms || {})]
  .sort(([a], [b]) => b.length - a.length);
const protectedPhrases = names.keepEnglish.map((phrase, i) => [phrase, `\uE000${i}\uE001`]);

function apply(text) {
  let result = String(text);
  for (const [phrase, marker] of protectedPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), marker);
  }
  const gangs = Object.entries(names.gangs).sort(([a], [b]) => b.length - a.length);
  for (const [english, hebrew] of gangs) {
    const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])the\\s+(${escaped})(?:['’]s)?(?![\\p{L}\\p{N}])`, 'giu');
    result = result.replace(re, (whole) => {
      const article = hebrew.startsWith('ה') ? hebrew : `ה${hebrew}`;
      return /['’]s$/iu.test(whole) ? `של ${article}` : article;
    });
  }
  for (const [english, hebrew] of entries) {
    const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:(ה־|ה-)?(${escaped})(?:['’]s)?)(?![\\p{L}\\p{N}])`, 'giu');
    result = result.replace(re, (whole, article = '', found = '') => {
      if (/['’]s$/iu.test(whole)) return `של ${hebrew}`;
      if (!article) return hebrew;
      return hebrew.startsWith('ה') ? hebrew : `ה${hebrew}`;
    });
  }
  result = result.replaceAll('ב־אוניברסיטת סיטי', 'באוניברסיטת סיטי')
    .replaceAll('ל־אוניברסיטת סיטי', 'לאוניברסיטת סיטי')
    .replaceAll('מ־אוניברסיטת סיטי', 'מאוניברסיטת סיטי');
  for (const [, hebrew] of entries) {
    const escaped = hebrew.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`ו־(?=${escaped})`, 'gu'), 'ו');
    if (hebrew.startsWith('ה')) {
      const bare = hebrew.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`([בלכ])־ה(?=${bare})`, 'gu'), '$1');
      result = result.replace(new RegExp(`מ־(?=ה${bare})`, 'gu'), 'מ');
    } else {
      result = result.replace(new RegExp(`([בלכ])־(?=${escaped})`, 'gu'), '$1');
      result = result.replace(new RegExp(`מ־(?=${escaped})`, 'gu'), 'מ');
      result = result.replace(new RegExp(`מה־(?=${escaped})`, 'gu'), 'מ');
    }
  }
  for (const [phrase, marker] of protectedPhrases) result = result.replaceAll(marker, phrase);
  return result;
}

for (const row of catalog.records) {
  row.text = apply(row.text);
  row.speaker = apply(row.speaker || '');
}
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`apply_mission_names: applied ${entries.length} consistent name forms to ${catalog.records.length} records`);
