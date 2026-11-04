import { lang } from './strings.js?v=d0dc1c0689';

let records = [];
let missionTitles = {};
let ready = false;
let loading;
let missionTitlesLoading;
const shownMissing = new Set();

function sourceColorRuns(value) {
  let highlighted = false;
  let text = '';
  const runs = [];
  const flush = () => {
    if (!text) return;
    runs.push({ text, highlighted });
    text = '';
  };
  for (const char of String(value || '').replace(/^[\u2160-\u2188]+\s*/, '')) {
    if (char === '#') { flush(); highlighted = !highlighted; }
    else text += char;
  }
  flush();
  return runs;
}

function translatedColorRuns(source, translated, record) {
  const overrides = Array.isArray(record?.highlights) ? record.highlights.filter(Boolean) : [];
  if (overrides.length) {
    const out = [];
    let at = 0;
    for (const phrase of overrides) {
      const found = translated.indexOf(phrase, at);
      if (found < 0) continue;
      if (found > at) out.push({ text: translated.slice(at, found), highlighted: false });
      out.push({ text: phrase, highlighted: true });
      at = found + phrase.length;
    }
    if (at < translated.length) out.push({ text: translated.slice(at), highlighted: false });
    if (out.length) return out;
  }

  const sourceRuns = sourceColorRuns(source);
  if (!sourceRuns.some((run) => run.highlighted)) return [{ text: translated, highlighted: false }];

  // GXT uses # as a color toggle. Carry the same sequence across the translated
  // sentence, placing each toggle at the nearest translated word boundary.
  const targetWords = translated.match(/\S+\s*/gu) || [];
  const sourceWeights = sourceRuns.map((run) => (run.text.match(/\S+/gu) || []).length);
  const sourceTotal = sourceWeights.reduce((a, b) => a + b, 0) || sourceRuns.length;
  const targetTotal = targetWords.length;
  const out = [];
  let wordAt = 0;
  let sourceAt = 0;
  for (let i = 0; i < sourceRuns.length; i++) {
    sourceAt += sourceWeights[i] || 1;
    const end = i === sourceRuns.length - 1 ? targetTotal : Math.max(wordAt, Math.round(sourceAt * targetTotal / sourceTotal));
    const chunk = targetWords.slice(wordAt, end).join('');
    if (chunk) {
      const last = out[out.length - 1];
      if (last && last.highlighted === sourceRuns[i].highlighted) last.text += chunk;
      else out.push({ text: chunk, highlighted: sourceRuns[i].highlighted });
    }
    wordAt = end;
  }
  return out.length ? out : [{ text: translated, highlighted: false }];
}

export function normalizeMissionText(value) {
  return String(value || '').replace(/^[\u2160-\u2188]+\s*/, '').replace(/^[^\p{L}\p{N}]*/u, '').replace(/#([^#]*)#/g, '$1').replace(/#/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
}

export async function loadMissionTranslations() {
  if (ready) return records;
  if (!loading) loading = fetch('./mission-translations.he.json?v=d0dc1c0689').then((r) => {
    if (!r.ok) throw new Error(`Mission translations: HTTP ${r.status}`);
    return r.json();
  }).then((data) => { records = data.records || []; ready = true; return records; });
  return loading;
}

export async function loadMissionTitles() {
  if (Object.keys(missionTitles).length) return missionTitles;
  if (!missionTitlesLoading) missionTitlesLoading = fetch('./mission-titles.he.json?v=d0dc1c0689').then((r) => {
    if (!r.ok) throw new Error(`Mission titles: HTTP ${r.status}`);
    return r.json();
  }).then((data) => { missionTitles = data.titles || {}; return missionTitles; });
  return missionTitlesLoading;
}

export function missionTitle(gxtKey) {
  return missionTitles[String(gxtKey)] || null;
}

export function missionText(source, { gxtKey = '' } = {}) {
  const english = String(source || '').replace(/^[\u2160-\u2188]+\s*/, '').replace(/#([^#]*)#/g, '$1').replace(/#/g, '').replace(/\s+/g, ' ').trim();
  if (lang() !== 'he' || !ready) return { text: english, translated: false };
  const key = normalizeMissionText(english);
  // The game passes the original GXT ID with each brief. Prefer this identity
  // so identical English lines in different missions cannot pick the wrong
  // contextual translation. Text-only matching remains for old history rows.
  const hit = gxtKey
    ? records.find((r) => String(r.gxtKey) === String(gxtKey))
    : records.find((r) => normalizeMissionText(r.source) === key);
  if (hit) return { text: hit.text, translated: true, record: hit, colorRuns: translatedColorRuns(source, hit.text, hit) };
  if (key && !shownMissing.has(key)) {
    shownMissing.add(key);
    console.info(`[mission-translation-missing] ${english}`);
  }
  return { text: english, translated: false };
}

export function missionTranslationStats() {
  return { translated: records.filter((r) => r.gxtKey).length, unmatchedCatalog: records.filter((r) => !r.gxtKey).length, missingObserved: shownMissing.size, ready };
}
