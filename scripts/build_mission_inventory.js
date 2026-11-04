#!/usr/bin/env node
// Read the original GXT and compiled mission SCRs. Only DISPLAY_BRIEF,
// DISPLAY_BRIEF_NOW, DISPLAY_BRIEF_SOON and PHONE_TEMPLATE references count as
// task text; DISPLAY_MESSAGE is reported separately for scope review.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'game', 'data');
const OUT = path.join(ROOT, 'build', 'mission-inventory.json');
const AREA_ROOTS = [
  // The stems are not district initials: wil is the first (Downtown) map,
  // ste is Residential, and bil is the final Industrial map.
  { area: 'Downtown', stem: 'wil' },
  { area: 'Residential', stem: 'ste' },
  { area: 'Industrial District', stem: 'bil' },
];
const BRIEF_TYPES = new Set([118, 279, 321]);
const DISPLAY_MESSAGE = 117;
const PHONE_TEMPLATE = 263;
const PHONE_BRIEF_OFFSETS = [-7, -6, -5, -4, -2, -1, 0, 1];
const FACE_PREFIX = /^[\u2160-\u2188]/;

function readGxt(filename) {
  const b = fs.readFileSync(filename);
  if (b.toString('ascii', 0, 3) !== 'GBL') throw new Error('Bad GXT header');
  let tkey, tdat;
  for (let at = 6; at + 8 <= b.length;) {
    const tag = b.toString('ascii', at, at + 4);
    const size = b.readUInt32LE(at + 4);
    if (tag === 'TKEY') tkey = { at: at + 8, size };
    if (tag === 'TDAT') tdat = { at: at + 8, size };
    at += 8 + size;
  }
  if (!tkey || !tdat || tkey.size % 12) throw new Error('Malformed GXT chunks');
  const entries = new Map();
  for (let at = tkey.at; at < tkey.at + tkey.size; at += 12) {
    const offset = b.readUInt32LE(at);
    let end = tdat.at + offset;
    while (end + 1 < tdat.at + tdat.size && (b[end] || b[end + 1])) end += 2;
    entries.set(b.toString('ascii', at + 4, at + 11).split('\0')[0], b.toString('utf16le', tdat.at + offset, end));
  }
  return entries;
}

function listScripts(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...listScripts(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.scr')) out.push(full);
  }
  return out;
}

function scanScript(filename, isRoot) {
  const b = fs.readFileSync(filename);
  let tableAt, tableCount, dataAt, dataSize, baseAddress = 0;
  if (isRoot) {
    tableAt = 0;
    tableCount = 6000;
    dataAt = 12000;
    dataSize = 65536;
  } else {
    if (b.length < 3080) throw new Error(`Short mission SCR: ${filename}`);
    tableAt = 8;
    tableCount = 1536;
    dataAt = 3080;
    dataSize = Math.min(b.readUInt32LE(4), b.length - dataAt);
    // Mission SCR pointer-table entries address the shared script-data buffer.
    // The first pointer is this subscript's base in that buffer.
    baseAddress = b.readUInt16LE(tableAt);
  }
  const refs = [];
  for (let i = 0; i < tableCount; i++) {
    const offset = b.readUInt16LE(tableAt + i * 2);
    if (offset === 0xffff || offset < baseAddress || offset + 10 > baseAddress + dataSize) continue;
    const at = dataAt + offset - baseAddress;
    const type = b.readUInt16LE(at + 2);
    const key = b.readUInt16LE(at + 8);
    if (BRIEF_TYPES.has(type)) refs.push({ key: String(key), type });
    else if (type === DISPLAY_MESSAGE) refs.push({ key: String(key), type });
    else if (type === PHONE_TEMPLATE) {
      for (const delta of PHONE_BRIEF_OFFSETS) refs.push({ key: String(key + delta), type, baseKey: key, delta });
    }
  }
  return refs;
}

function main() {
  const gxt = readGxt(path.join(DATA, 'e.gxt'));
  const records = new Map();
  const rootSummaries = [];
  const allScripts = [];
  for (const { area, stem } of AREA_ROOTS) {
    const rootFile = path.join(DATA, `${stem}.scr`);
    const files = [rootFile, ...listScripts(path.join(DATA, stem))].filter(fs.existsSync);
    for (const file of files) {
      const isRoot = path.resolve(file) === path.resolve(rootFile);
      const refs = scanScript(file, isRoot);
      if (isRoot) rootSummaries.push({ area, script: path.basename(file), references: refs.length });
      allScripts.push({ file: path.relative(DATA, file).replaceAll('\\', '/'), area, isRoot, refs });
      for (const ref of refs) {
        const text = gxt.get(ref.key);
        if (text == null) continue;
        const scope = ref.type === DISPLAY_MESSAGE ? 'display-message' : ref.type === PHONE_TEMPLATE ? 'phone-template' : 'mission-brief';
        // DISPLAY_MESSAGE is a general HUD toast and may not carry a face prefix.
        // DISPLAY_BRIEF variants can also carry instruction/status text without a portrait.
        // Keep phone-template candidates face-gated because those offsets are only a heuristic.
        if (!FACE_PREFIX.test(text) && (scope === 'phone-template' || scope === 'mission-brief' && !BRIEF_TYPES.has(ref.type))) continue;
        const id = `${area}\u0000${ref.key}`;
        if (!records.has(id)) records.set(id, { area, gxtKey: ref.key, source: text, scopes: [], scripts: [], phoneBaseKeys: [] });
        const row = records.get(id);
        if (!row.scopes.includes(scope)) row.scopes.push(scope);
        const script = path.relative(DATA, file).replaceAll('\\', '/');
        if (!row.scripts.includes(script)) row.scripts.push(script);
        if (ref.baseKey && !row.phoneBaseKeys.includes(String(ref.baseKey))) row.phoneBaseKeys.push(String(ref.baseKey));
      }
    }
  }
  const messages = [...records.values()].sort((a, b) => a.area.localeCompare(b.area) || Number(a.gxtKey) - Number(b.gxtKey));
  const brief = messages.filter((x) => x.scopes.includes('mission-brief') || x.scopes.includes('phone-template'));
  const display = messages.filter((x) => x.scopes.includes('display-message'));
  const result = {
    version: 1,
    sourceGxt: 'game/data/e.gxt',
    sourceRoots: AREA_ROOTS.map((x) => ({ area: x.area, script: `${x.stem}.scr` })),
    method: 'Parsed SCR command-pointer tables. Included face-marked GXT IDs passed to DISPLAY_BRIEF, DISPLAY_BRIEF_NOW, DISPLAY_BRIEF_SOON, and the eight PHONE_TEMPLATE brief variants. DISPLAY_MESSAGE is separated for review.',
    gxtEntryCount: gxt.size,
    rootScripts: rootSummaries,
    counts: {
      missionBriefKeys: brief.length,
      displayMessageKeys: display.length,
      byArea: Object.fromEntries(AREA_ROOTS.map(({ area }) => [area, {
        missionBriefKeys: brief.filter((x) => x.area === area).length,
        displayMessageKeys: display.filter((x) => x.area === area).length,
      }])),
    },
    messages,
    scripts: allScripts.map(({ file, area, isRoot }) => ({ file, area, isRoot })),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`mission inventory: ${brief.length} mission brief keys, ${display.length} separate display-message keys`);
  console.log(JSON.stringify(result.counts.byArea, null, 2));
  console.log(`full local inventory: ${OUT}`);
}

main();
