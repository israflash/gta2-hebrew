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

const hook = fs.readFileSync(path.join(root, 'port/platform/jobs_web.cpp'), 'utf8');
assert.match(hook, /\{ 3840, 3861 \}/);
assert.match(hook, /\{ 2954, 2959 \}/);
assert.match(hook, /static int keys\[88\]/);
console.log(`test_gameplay_translation_additions: OK (${messages.length} active briefs, ${Object.keys(titles).length} titles/status; ${gxt ? 'exact GXT sources matched' : 'catalog validated; exact GXT source matching skipped (game data not present)'})`);
