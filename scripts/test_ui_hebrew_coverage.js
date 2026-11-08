#!/usr/bin/env node
// Verify the merged UI dictionaries, not each source file in isolation.
// strings.js provides shared Hebrew values used by landing.js and other modules.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const files = [
  ['web/strings.js', 'const UI ='],
  ['web/shell.js'],
  ['web/savestate.js'],
  ['web/saves.js'],
  ['web/controls.js'],
  ['web/renderer.js'],
  ['web/storage.js'],
  ['web/gamefiles.js'],
  ['web/map.js'],
  ['web/landing.js'],
  ['web/chat.js'],
  ['web/net.js'],
  ['web/gamelang.js'],
];

function objectAt(source, offset) {
  if (offset < 0) return {};
  const start = source.indexOf('{', offset);
  if (start < 0) throw new Error('dictionary body not found');
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      return vm.runInNewContext(`(${source.slice(start, i + 1)})`);
    }
  }
  throw new Error('unterminated dictionary');
}

const english = {};
const hebrew = {};
for (const [file, objectName] of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const anchor = objectName ? source.indexOf(objectName) : source.indexOf('registerDict(');
  assert.notEqual(anchor, -1, `${file}: dictionary registration exists`);
  const enAt = source.indexOf('en: {', anchor);
  const heAt = source.indexOf('he: {', anchor);
  Object.assign(english, objectAt(source, enAt < 0 ? -1 : enAt + 3));
  Object.assign(hebrew, objectAt(source, heAt < 0 ? -1 : heAt + 3));
}

const missing = Object.keys(english).filter((key) => !(key in hebrew));
assert.deepEqual(missing, [], `Hebrew UI translations missing: ${missing.join(', ')}`);

for (const [key, sourceText] of Object.entries(english)) {
  if (typeof sourceText !== 'string' || typeof hebrew[key] !== 'string') continue;
  const placeholders = (value) => [...value.matchAll(/\{([\w]+)\}/g)].map((match) => match[1]).sort();
  const sourceVariables = new Set(placeholders(sourceText));
  const unknownVariables = placeholders(hebrew[key]).filter((name) => !sourceVariables.has(name));
  assert.deepEqual(unknownVariables, [], `${key}: Hebrew text uses an unknown interpolation variable`);
}

const intentionallyUnchanged = new Set([
  'ui.district.downtown', 'ui.district.residential', 'ui.district.industrial',
  'shell.gameMessage', 'ui.pad.caps.create', 'ui.pad.caps.options',
  'ui.opt.aspect.wide', 'ui.board.rank',
]);
const identical = Object.keys(english).filter((key) =>
  typeof english[key] === 'string' && english[key].trim() === hebrew[key]?.trim());
assert.deepEqual([...identical].sort(), [...intentionallyUnchanged].sort(),
  'only documented place names, hardware labels, formatting tokens, or numeric formats stay identical');

console.log(`test_ui_hebrew_coverage: OK (${Object.keys(english).length} merged UI keys; ${identical.length} intentional unchanged labels)`);
