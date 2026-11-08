// Translate selected native GXT text at the original DrawText coordinates.
// The game's bitmap font has no Hebrew glyphs, so the native draw is suppressed
// only when an exact or placeholder-aware catalog entry is available.
import { lang } from './strings.js?v=b2f1e0aa8d';

const clean = (value) => String(value || '').replace(/^n!/, '').replace(/^[\u2160-\u2188]+\s*/, '').replace(/#/g, '').replace(/\s+/g, ' ').trim();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function patternFor(source) {
  const parts = clean(source).split(/(%[ds])/g).map((part) => {
    // Currency symbols are literal source text (for example `$%d`), not part
    // of the integer substitution. Capturing `$` here made that template fail.
    if (part === '%d') return '(-?[0-9][0-9,]*)';
    if (part === '%s') return '(.+?)';
    return escapeRegExp(part);
  });
  return new RegExp(`^${parts.join('')}$`, 'iu');
}

function translatedFor(source, records, exact, patterns, dynamicValues) {
  const normalized = clean(source);
  if (exact.has(normalized)) return exact.get(normalized);
  for (const record of patterns) {
    const match = record.pattern.exec(normalized);
    if (!match) continue;
    let value = record.text;
    let at = 1;
    value = value.replace(/%[ds]|\{s\}/g, (token) => {
      const captured = match[at++] || '';
      if (token === '%s' || token === '{s}') {
        return dynamicValues.get(clean(captured).toLocaleLowerCase('en')) || captured;
      }
      return captured;
    });
    return value;
  }
  return null;
}

export function createGxtResolver(records) {
  const exact = new Map();
  const patterns = [];
  const dynamicValues = new Map();
  // Pickup notifications are a semantic HUD group (GXT c00-c43). Their
  // native x coordinate can differ between renderer paths, so placement must
  // not depend on an exact font/palette/y tuple.
  const pickupSources = new Set();
  for (const row of records || []) {
    const source = clean(row.source);
    if (!source || !row.text) continue;
    if (/^ganga[1-7]$/i.test(String(row.key || ''))) {
      dynamicValues.set(source.toLocaleLowerCase('en'), row.text);
    }
    if (/^c(?:0\d|[1-3]\d|4[0-3])$/i.test(String(row.key || ''))) pickupSources.add(source);
    if (/%[ds]/.test(source)) patterns.push({ pattern: patternFor(source), text: row.text });
    else exact.set(source, row.text);
  }
  const resolve = (source) => {
    const normalized = clean(source);
    // The frontend composes its player-slot label in code ("PLAYER 0") rather
    // than looking up one GXT key, so it needs a small Hebrew template here.
    const slot = normalized.match(/^PLAYER ([0-5])$/i);
    if (slot) return `שחקן ${slot[1]}`;
    return translatedFor(normalized, records, exact, patterns, dynamicValues);
  };
  resolve.isPickupLabel = (source) => pickupSources.has(clean(source));
  return resolve;
}

// Center HUD banners in the actual rendered game viewport. The renderer's
// reference width can differ from its fitted viewport (for example after a
// resize or when the page uses a non-native aspect ratio), so it is not a
// reliable source for an on-screen center point.
export function hudViewportCenter(left, viewportWidth, devicePixelRatio = 1) {
  const dpr = Number(devicePixelRatio) > 0 ? Number(devicePixelRatio) : 1;
  return Number(left) + Number(viewportWidth) / (2 * dpr);
}

// Weapon/pickup names share GXT strings with mission briefs. Center only the
// short top HUD banner; the same text in a speaker brief must keep its native
// portrait-side position near the bottom of the screen.
export function isTopHudPickupBanner(isPickupLabel, renderedY, viewportHeight) {
  const y = Number(renderedY);
  const height = Number(viewportHeight);
  return Boolean(isPickupLabel) && Number.isFinite(y) && Number.isFinite(height) &&
    height > 0 && y >= -24 && y < height * 0.35;
}

// In the original English frontend, normal menu rows use font 4 and the
// highlighted row uses font 5 (Frontend::SetFontTypes_4AF0E0). The Hebrew
// DOM renderer must carry that selection state over because it replaces the
// original bitmap draw, including on native submenu pages.
export function isSelectedNativeMenuText(menuState, fontType) {
  const state = Number(menuState);
  return Number.isInteger(state) && state >= 16 && Number(fontType) === 5;
}

function markup(value, baseColor) {
  const chunks = String(value).split('#');
  let highlighted = false;
  return chunks.map((part) => {
    const result = highlighted
      ? `<span style="color:#43a7d4">${part}</span>`
      : part;
    highlighted = !highlighted;
    return result;
  }).join('');
}

export async function bindHebrewGxtRenderer(Module, canvas) {
  const response = await fetch('./gxt-gameplay.he.json?v=b2f1e0aa8d');
  if (!response.ok) throw new Error(`Hebrew game GXT catalog: HTTP ${response.status}`);
  const data = await response.json();
  const resolveGxt = createGxtResolver([...(data.records || []), ...(data.directRecords || [])]);

  // Optional, local-only diagnostics. Nothing is sent off-device and the log
  // stays in memory until this page is closed.
  let auditEnabled = new URLSearchParams(location.search).has('gxt-audit');
  if (!auditEnabled) {
    try { auditEnabled = localStorage.getItem('gta2-gxt-audit') === '1'; } catch { /* diagnostics remain off */ }
  }
  const missing = new Map();
  const audit = {
    enabled: auditEnabled,
    reset() { missing.clear(); },
    snapshot() { return [...missing.values()].sort((a, b) => b.draws - a.draws); },
  };

  const layer = document.createElement('div');
  layer.id = 'hebrew-gxt-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const nodes = new Map();
  let raf = 0;
  let frontendMenuState = null;
  try { frontendMenuState = Module.cwrap('gta2_port_frontend_menu_state', 'number', []); } catch { /* menu stays at engine scale */ }
  const mainMenuOption = new Map([['שחק', 0], ['אפשרויות', 1], ['יציאה', 2]]);
  const render = () => {
    raf = 0;
    const now = performance.now();
    const renderer = Module.gta2Renderer;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const viewport = renderer?.viewport || { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const scale = renderer?.scale ? renderer.scale / dpr : rect.height / 480;
    const top = rect.top + (canvas.height - viewport.y - viewport.h) / dpr;
    const left = rect.left + viewport.x / dpr;
    let menuState = -1;
    try { menuState = frontendMenuState ? frontendMenuState() : -1; } catch { /* Keep standard text colors. */ }
    for (const [key, item] of nodes) {
      if (lang() !== 'he' || now - item.updated > 130) {
        item.node.remove(); nodes.delete(key); continue;
      }
      const drawScale = item.drawScale > 0 ? item.drawScale : 1;
      const x = item.x / drawScale + item.hudOffsetX;
      const y = item.y / drawScale;
      const lineHeight = item.lineHeight / drawScale;
      const px = Math.max(9, lineHeight * scale * .8);
      const centeredHudBanner = isTopHudPickupBanner(
        item.pickupLabel,
        y * scale,
        viewport.h / dpr,
      );
      item.node.style.left = `${centeredHudBanner
        ? hudViewportCenter(left, viewport.w, dpr)
        : left + x * scale}px`;
      item.node.style.width = '';
      // The Hebrew pixel face has a taller ascender gap than the game's
      // bitmap font; move this centered pickup label up to match the source
      // glyph baseline at the same viewport scale.
      item.node.style.top = `${top + y * scale - (centeredHudBanner ? 6 : 0)}px`;
      item.node.style.transform = centeredHudBanner ? 'translateX(-50%)' : '';
      item.node.style.textAlign = centeredHudBanner ? 'center' : 'right';
      item.node.style.fontSize = `${px}px`;
      item.node.style.lineHeight = `${Math.max(px, lineHeight * scale)}px`;
      item.node.style.fontFamily = '"GTA2 Impact Pixel", "GTA2 Brief Pixel", monospace';
      item.node.style.fontWeight = '400';
      item.node.style.opacity = item.alpha > 0 && item.alpha < 255 ? String(item.alpha / 255) : '1';
      // The original pickup banner uses font-remap 5: a dark red, centered
      // label. Preserve that source palette in the translated HUD path.
      const selectedMenuOption = isSelectedNativeMenuText(menuState, item.fontType);
      item.node.classList.toggle('native-menu-selected', selectedMenuOption);
      item.node.style.color = selectedMenuOption
        ? '#ed2024'
        : centeredHudBanner
        ? '#9d2a23'
        : item.palette === 0 || item.palette === 1 ? '#ffd34e' : '#f4edcf';
      if (item.html !== item.node.innerHTML) item.node.innerHTML = item.html;
    }
    if (nodes.size) raf = requestAnimationFrame(render);
  };

  Module.gta2HebrewGxtReady = true;
  Module.gta2HebrewGxtDraw = (source, x, y, lineHeight, drawScale, fontType, paletteType, palette, alpha, hudOffsetX) => {
    if (lang() !== 'he') return 0;
    const text = resolveGxt(source);
    if (text == null) {
      if (auditEnabled) {
        const original = String(source || '').replace(/\s+/g, ' ').trim();
        if (original) {
          const record = missing.get(original) || { text: original, draws: 0, firstSeenAt: Math.round(performance.now()) };
          record.draws++;
          record.lastSeenAt = Math.round(performance.now());
          missing.set(original, record);
        }
      }
      return 0;
    }
    // The native English main-menu rows are positioned in the black panel at
    // the lower-right of the splash. Their pre-render GXT coordinates do not
    // correspond to the final canvas positions, so use the positioned HTML
    // labels owned by wireHebrewMainMenu and suppress this native draw.
    let menuState = -1;
    try { menuState = frontendMenuState ? frontendMenuState() : -1; } catch { /* leave native text visible */ }
    if (menuState >= 0 && Math.floor(menuState / 16) === 0 && mainMenuOption.has(clean(text))) return 1;
    const key = `${x.toFixed(2)}:${y.toFixed(2)}:${source}`;
    let item = nodes.get(key);
    if (!item) {
      const node = document.createElement('span');
      node.className = 'hebrew-gxt-text';
      layer.append(node);
      item = { node };
      nodes.set(key, item);
    }
    item.updated = performance.now(); item.x = x; item.y = y;
    item.drawScale = Number(drawScale) || 1; item.hudOffsetX = Number(hudOffsetX) || 0;
    item.lineHeight = lineHeight; item.fontType = fontType;
    item.paletteType = paletteType; item.palette = palette; item.alpha = alpha;
    item.pickupLabel = resolveGxt.isPickupLabel(source);
    const details = { gxtX: x, gxtY: y, lineHeight, fontType, paletteType, palette };
    for (const [name, value] of Object.entries(details)) {
      if (item.node.dataset[name] !== String(value)) item.node.dataset[name] = String(value);
    }
    item.html = markup(text, item.palette === 0 ? '#ffd34e' : '#f4edcf');
    if (!raf) raf = requestAnimationFrame(render);
    return 1;
  };
  if (auditEnabled) window.gta2GxtAudit = audit;
  return data.records.length;
}
