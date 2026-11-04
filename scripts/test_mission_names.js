#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8'));
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-names.he.json'), 'utf8'));
const aliases = [...Object.keys(dictionary.gangs), ...Object.keys(dictionary.people), ...Object.keys(dictionary.places || {}), ...Object.keys(dictionary.terms || {})];
const protectedPhrases = dictionary.keepEnglish || [];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let checked = 0;
for (const row of catalog.records) {
  for (const field of ['text', 'speaker']) {
    const value = String(row[field] || '');
    let auditValue = value;
    for (const phrase of protectedPhrases) auditValue = auditValue.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(phrase)}(?![\\p{L}\\p{N}])`, 'giu'), ' ');
    for (const alias of aliases) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(alias)}(?![\\p{L}\\p{N}])`, 'iu');
      assert.ok(!re.test(auditValue), `English name left untranslated in ${row.gxtKey}: ${alias}`);
    }
    for (const alias of Object.keys(dictionary.gangs)) assert.ok(!new RegExp(`(?<![\\p{L}\\p{N}])the\\s+${escape(alias)}(?![\\p{L}\\p{N}])`, 'iu').test(auditValue), `English article left before gang in ${row.gxtKey}: ${alias}`);
  }
  checked++;
}
console.log(`test_mission_names: OK (${aliases.length} name forms consistent across ${checked} records)`);
