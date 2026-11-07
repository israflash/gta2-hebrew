#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'build/mission-inventory.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'web/mission-translations.he.json'), 'utf8'));
const refs = new Set(inventory.messages.map((row) => `${row.area}:${row.gxtKey}`));
const seen = new Set();
for (const record of catalog.records) {
  const key = `${record.area}:${record.gxtKey}`;
  assert.ok(refs.has(key), `not present in original mission scripts: ${key}`);
  assert.ok(!seen.has(key), `duplicate translation for ${key}`);
  seen.add(key);
  const original = inventory.messages.find((row) => row.area === record.area && row.gxtKey === record.gxtKey);
  const clean = (value) => value.replace(/^[\u2160-\u2188]+\s*/, '').replace(/#([^#]*)#/g, '$1').replace(/#/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
  assert.equal(clean(record.source), clean(original.source), `catalog source differs from GXT key ${key}`);
}
assert.deepEqual(inventory.sourceRoots.map((row) => [row.area, row.script]), [
  ['Downtown', 'wil.scr'], ['Residential', 'ste.scr'], ['Industrial District', 'bil.scr'],
]);
const fireEngineFrenzy = inventory.messages.find((row) => row.area === 'Downtown' && row.gxtKey === '7121');
assert.ok(fireEngineFrenzy?.scopes.includes('kill-frenzy-brief'), 'START_BASIC_KF references its GXT brief from command +10');
assert.match(fireEngineFrenzy.source, /Fire Engine.*20 people.*60 seconds/);
const downtownMessage = (key) => inventory.messages.find((row) => row.area === 'Downtown' && row.gxtKey === key);
const residentialMessage = (key) => inventory.messages.find((row) => row.area === 'Residential' && row.gxtKey === key);
assert.ok(downtownMessage('1407')?.scopes.includes('mission-brief'), 'direct DISPLAY_BRIEF placeholder remains visible to the audit');
assert.ok(downtownMessage('1117')?.scopes.includes('easy-phone-template'), 'DO_EASY_PHONE fallback offset -1 is inventoried');
assert.ok(residentialMessage('2818')?.scopes.includes('phone-template'), 'PHONE_TEMPLATE base placeholder remains inventoried');
assert.ok(residentialMessage('2819')?.scopes.includes('easy-phone-template'), 'DO_EASY_PHONE fallback offset +1 is inventoried');
assert.ok(downtownMessage('1954')?.scopes.includes('display-message'), 'radio station toast is separated from mission briefs');
console.log(`test_mission_inventory: OK (${seen.size} translations matched original script GXT keys; ${inventory.counts.missionBriefKeys} brief IDs inventoried)`);
