// Translate selected native GXT text at the original DrawText coordinates.
// The game's bitmap font has no Hebrew glyphs, so the native draw is suppressed
// only when an exact or placeholder-aware catalog entry is available.
import { lang } from './strings.js';

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

function translatedFor(source, records, exact, patterns) {
  const normalized = clean(source);
  if (exact.has(normalized)) return exact.get(normalized);
  for (const record of patterns) {
    const match = record.pattern.exec(normalized);
    if (!match) continue;
    let value = record.text;
    let at = 1;
    value = value.replace(/%[ds]|\{s\}/g, () => match[at++] || '');
    return value;
  }
  return null;
}

export function createGxtResolver(records) {
  const exact = new Map();
  const patterns = [];
  for (const row of records || []) {
    const source = clean(row.source);
    if (!source || !row.text) continue;
    if (/%[ds]/.test(source)) patterns.push({ pattern: patternFor(source), text: row.text });
    else exact.set(source, row.text);
  }
  return (source) => translatedFor(source, records, exact, patterns);
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
  const response = await fetch('./gxt-gameplay.he.json');
  if (!response.ok) throw new Error(`Hebrew game GXT catalog: HTTP ${response.status}`);
  const data = await response.json();
  const resolveGxt = createGxtResolver(data.records);

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
  let menuLayoutKey = '';
  let menuLayout = { anchorX: 0, width: 0, firstY: 0 };
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
    try { menuState = frontendMenuState ? frontendMenuState() : -1; } catch { /* keep native placement */ }
    const inHebrewMainMenu = lang() === 'he' && menuState >= 0 && Math.floor(menuState / 16) === 0;
    document.body.classList.toggle('hebrew-main-menu', inHebrewMainMenu);
    const menuRows = inHebrewMainMenu ? [...nodes.values()].filter((item) => item.menuOption != null) : [];
    // This pixel font has very tall em metrics but tiny Hebrew glyphs. Use the
    // site's plain UI face for the three start-menu labels and size by ink,
    // rather than by the font's misleading line box.
    const menuFontSize = Math.max(20, Math.min(28, window.innerHeight * .03));
    // Keep the menu's original left edge, but align every Hebrew label to the
    // right edge of the widest row. Native x coordinates are left-text anchors;
    // reusing them as RTL anchors made each translated option end at a different
    // position and left the menu looking like three unrelated buttons. Measure
    // only when the menu, font, or viewport changes; the draw hook runs per frame.
    const nextMenuKey = inHebrewMainMenu
      ? `${scale}:${dpr}:${menuFontSize}:${menuRows.map((item) => `${item.menuOption}:${item.node.textContent}:${item.x}`).join('|')}`
      : '';
    if (nextMenuKey !== menuLayoutKey) {
      menuLayoutKey = nextMenuKey;
      if (menuRows.length) {
        const widths = menuRows.map((item) => {
          const style = item.node.style;
          const previous = [style.width, style.fontSize, style.fontFamily, style.fontWeight];
          style.width = 'max-content';
          style.fontSize = `${menuFontSize}px`;
          style.fontFamily = 'system-ui, "Segoe UI", sans-serif';
          style.fontWeight = '700';
          const width = item.node.getBoundingClientRect().width;
          [style.width, style.fontSize, style.fontFamily, style.fontWeight] = previous;
          return width;
        });
        menuLayout = {
          anchorX: Math.min(...menuRows.map((item) => item.x)),
          width: Math.max(...menuRows.map((item, i) => item.x * scale + widths[i])) - Math.min(...menuRows.map((item) => item.x)) * scale,
          firstY: Math.min(...menuRows.map((item) => item.y)),
        };
      } else {
        menuLayout = { anchorX: 0, width: 0, firstY: 0 };
      }
    }
    for (const [key, item] of nodes) {
      if (lang() !== 'he' || now - item.updated > 130) {
        item.node.remove(); nodes.delete(key); continue;
      }
      const px = Math.max(9, item.lineHeight * scale * 1.32);
      const isMenuRow = inHebrewMainMenu && item.menuOption != null;
      item.node.style.left = `${left + (isMenuRow ? menuLayout.anchorX : item.x) * scale}px`;
      item.node.style.width = isMenuRow ? `${menuLayout.width}px` : '';
      const menuY = isMenuRow ? item.menuOption * menuFontSize * 1.28 : 0;
      item.node.style.top = `${top + (isMenuRow ? menuLayout.firstY * scale : item.y * scale) + menuY}px`;
      item.node.style.fontSize = `${isMenuRow ? menuFontSize : px}px`;
      item.node.style.lineHeight = `${isMenuRow ? menuFontSize : Math.max(px, item.lineHeight * scale * 1.22)}px`;
      item.node.style.fontFamily = isMenuRow ? 'system-ui, "Segoe UI", sans-serif' : '"GTA2 Impact Pixel", "GTA2 Brief Pixel", monospace';
      item.node.style.fontWeight = isMenuRow ? '700' : '400';
      item.node.style.opacity = item.alpha > 0 && item.alpha < 255 ? String(item.alpha / 255) : '1';
      const selectedMenuRow = isMenuRow && item.menuOption === menuState % 16;
      item.node.style.color = selectedMenuRow ? '#ed2024' : item.palette === 0 || item.palette === 1 ? '#ffd34e' : '#f4edcf';
      if (item.html !== item.node.innerHTML) item.node.innerHTML = item.html;
    }
    if (nodes.size) raf = requestAnimationFrame(render);
  };

  Module.gta2HebrewGxtReady = true;
  Module.gta2HebrewGxtDraw = (source, x, y, lineHeight, fontType, paletteType, palette, alpha) => {
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
    item.lineHeight = lineHeight; item.fontType = fontType;
    item.paletteType = paletteType; item.palette = palette; item.alpha = alpha;
    item.menuOption = mainMenuOption.has(clean(text)) ? mainMenuOption.get(clean(text)) : null;
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
