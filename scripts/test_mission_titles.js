#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const gxtPath = path.join(root, 'game', 'data', 'e.gxt');
const catalogPath = path.join(root, 'web', 'mission-titles.he.json');
const bytes = fs.readFileSync(gxtPath);
if (bytes.toString('ascii', 0, 3) !== 'GBL') throw new Error('Invalid original e.gxt');
let tkey;
let tdat;
for (let at = 6; at + 8 <= bytes.length;) {
  const tag = bytes.toString('ascii', at, at + 4);
  const size = bytes.readUInt32LE(at + 4);
  if (tag === 'TKEY') tkey = { at: at + 8, size };
  if (tag === 'TDAT') tdat = { at: at + 8, size };
  at += 8 + size;
}
if (!tkey || !tdat || tkey.size % 12) throw new Error('Malformed original e.gxt');
const source = new Map();
for (let at = tkey.at; at < tkey.at + tkey.size; at += 12) {
  const id = bytes.toString('ascii', at + 4, at + 11).split('\0')[0];
  const offset = bytes.readUInt32LE(at);
  let end = tdat.at + offset;
  while (end + 1 < tdat.at + tdat.size && (bytes[end] || bytes[end + 1])) end += 2;
  source.set(id, bytes.toString('utf16le', tdat.at + offset, end).replace(/^[\u2160-\u2188]+\s*/, '').trim());
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const rows = Object.entries(catalog.titles || {});
if (rows.length !== 88) throw new Error(`Expected 88 mission titles and HUD statuses, found ${rows.length}`);
const namedGxtKeys = { 9001: 'mfail', 9002: 'kfstart', 9003: 'kfpass', 9004: 'kffail' };
for (const [key, row] of rows) {
  if (source.get(namedGxtKeys[key] || key) !== row.source) throw new Error(`GXT source mismatch for mission title ${key}`);
  if (!row.text || row.text === row.source) throw new Error(`Missing Hebrew translation for mission title ${key}`);
}
console.log(`test_mission_titles: OK (${rows.length} title GXT keys verified against original e.gxt)`);
