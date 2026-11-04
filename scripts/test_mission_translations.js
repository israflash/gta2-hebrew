#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'web', 'mission-translations.he.json');
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(catalog.language, 'he');
assert.ok(Array.isArray(catalog.records) && catalog.records.length > 0);
const ids = new Set();
for (const record of catalog.records) {
  assert.ok(record.id && record.source && record.text, `incomplete record ${record.id || '(no id)'}`);
  assert.ok(!ids.has(record.id), `duplicate id ${record.id}`);
  ids.add(record.id);
  const placeholders = (s) => (s.match(/%[0-9]*[sdif]/g) || []).sort().join(',');
  assert.equal(placeholders(record.text), placeholders(record.source), `placeholder mismatch: ${record.id}`);
  if (record.matchStatus === 'verified-gxt') assert.ok(record.gxtKey, `missing GXT key: ${record.id}`);
  else assert.equal(record.matchStatus, 'unmatched-source', `unknown source status: ${record.id}`);
}
const verified = catalog.records.filter((r) => r.matchStatus === 'verified-gxt').length;
assert.equal(verified, catalog.records.length, 'every delivered translation must be tied to a real GXT key');
assert.ok(catalog.records.every((r) => ['context-reviewed', 'key-verified'].includes(r.reviewStatus)), 'every translation needs an honest review state');
const areaKeys = new Set();
for (const record of catalog.records) {
  const key = `${record.area}:${record.gxtKey}`;
  assert.ok(!areaKeys.has(key), `duplicate translated GXT key: ${key}`);
  areaKeys.add(key);
}
const contextual = catalog.records.filter((r) => r.reviewStatus === 'context-reviewed').length;
console.log(`test_mission_translations: OK (${catalog.records.length} unique GXT keys; ${verified} source-matched; ${contextual} context-reviewed)`);
