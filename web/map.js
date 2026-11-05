// Map screen, minimap and waypoint (T33). Not in the original game: an
// optional overlay drawn by the shell. The map image is built in the browser
// from the player's own game files (port/platform/map_web.cpp); nothing is
// downloaded. Read-only towards the game, apart from pausing it while the map
// screen is open.

import { lang, registerDict, t } from './strings.js';
import { loadMissionTitles, loadMissionTranslations, missionText, missionTitle } from './missiontext.js';

loadMissionTranslations().catch((err) => console.error(err));
loadMissionTitles().catch((err) => console.error(err));

registerDict({
  en: {
    'ui.map.speaker.loonies': 'Loonies', 'ui.map.speaker.yakuza': 'Yakuza',
    'ui.map.speaker.zaibatsu': 'Zaibatsu', 'ui.map.speaker.rednecks': 'Rednecks',
    'ui.map.speaker.scientists': 'Scientists', 'ui.map.speaker.krishnas': 'Krishnas',
    'ui.map.speaker.russians': 'Russians',
    'ui.map.weapons.pistol': 'Pistol',
    'ui.map.weapons.machineGun': 'Machine Gun',
    'ui.map.weapons.rocketLauncher': 'Rocket Launcher',
    'ui.map.weapons.electroGun': 'Electro Gun',
    'ui.map.weapons.molotov': 'Molotov Cocktails',
    'ui.map.weapons.grenades': 'Grenades',
    'ui.map.weapons.shotgun': 'Shotgun',
    'ui.map.weapons.electroBaton': 'Electro Baton',
    'ui.map.weapons.flamethrower': 'Flamethrower',
    'ui.map.weapons.silenced': 'Silenced Machine Gun',
    'ui.map.weapons.dualPistol': 'Dual Pistol',
    'ui.map.powerups.multiplier': 'Multiplier +1',
    'ui.map.powerups.extraLife': 'Extra Life',
    'ui.map.powerups.health': 'Health',
    'ui.map.powerups.armour': 'Armour',
    'ui.map.powerups.jailCard': 'Get Out of Jail Free',
    'ui.map.powerups.copBribe': 'Cop Bribe',
    'ui.map.powerups.invulnerability': 'Invulnerability',
    'ui.map.powerups.doubleDamage': 'Double Damage',
    'ui.map.powerups.fastReload': 'Fast Reload',
    'ui.map.powerups.electroFingers': 'Electro Fingers',
    'ui.map.powerups.respect': 'Respect',
    'ui.map.powerups.invisibility': 'Invisibility',
    'ui.map.powerups.instantGang': 'Instant Gang',
    'ui.map.poi.save': 'Save points',
    'ui.map.poi.garage': 'Garages',
    'ui.map.poi.crusher': 'Car crushers',
    'ui.map.poi.frenzy': 'Kill Frenzies',
    'ui.map.poi.weapon': 'Weapons',
    'ui.map.poi.powerup': 'Power-ups',
    'ui.map.poi.token': 'Tokens',
    'ui.map.police': 'Police',
    'ui.map.jobs.easy': 'Easy job',
    'ui.map.jobs.medium': 'Medium job',
    'ui.map.jobs.hard': 'Hard job',
    'ui.map.jobs.info': 'Info phone',
    'ui.map.jobNamed': '{gang} {job}',
    'ui.map.garage.machineGun': 'car machine gun',
    'ui.map.garage.oilSlick': 'oil slick',
    'ui.map.garage.mines': 'car mines',
    'ui.map.garage.bomb': 'car bomb',
    'ui.map.garage.respray': 'respray',
    'ui.map.garageName': 'Garage: {services}',
    'ui.map.frenzy': 'Kill Frenzy',
    'ui.map.weaponN': 'Weapon {n}',
    'ui.map.powerup': 'Power-up',
    'ui.map.token': 'Token',
    'ui.map.savePointChurch': 'Save point (church)',
    'ui.map.carCrusher': 'Car crusher',
    'ui.map.missionTarget': 'Mission target',
    'ui.map.missionTargetsN': 'Mission targets ({n})',
    'ui.map.drawing': 'Drawing the map…',
    'ui.map.legend.showingAll': 'Showing everything',
    'ui.map.legend.foundSoFar': 'Found so far',
    'ui.map.legend.onMission': 'On a mission',
    'ui.map.legend.gangJobs': 'Gang jobs (click to set a waypoint)',
    'ui.map.legend.jobs': 'Jobs',
    'ui.map.briefs.currentJob': 'Current job',
    'ui.map.briefs.messages': 'Latest messages',
    'ui.map.help.line': 'M / Esc close · drag or WASD move · wheel or Q/E zoom · click: waypoint · right-click: clear · Space: you · F: {mode}{dist}',
    'ui.map.help.revealOn': 'show everything',
    'ui.map.help.revealOff': 'only what you have seen',
    'ui.map.help.waypointDist': ' · waypoint {n} blocks away',
  },
  he: {
    'ui.map.speaker.loonies': 'לוניז', 'ui.map.speaker.yakuza': 'יאקוזה',
    'ui.map.speaker.zaibatsu': 'זייבאצו', 'ui.map.speaker.rednecks': 'רדנקס',
    'ui.map.speaker.scientists': 'המדענים', 'ui.map.speaker.krishnas': 'קרישנאים',
    'ui.map.speaker.russians': 'רוסים',
    'ui.map.weapons.pistol': 'אקדח', 'ui.map.weapons.machineGun': 'מקלע',
    'ui.map.weapons.rocketLauncher': 'מטול רקטות', 'ui.map.weapons.electroGun': 'אקדח חשמלי',
    'ui.map.weapons.molotov': 'בקבוקי תבערה', 'ui.map.weapons.grenades': 'רימונים',
    'ui.map.weapons.shotgun': 'רובה ציד', 'ui.map.weapons.electroBaton': 'אלה חשמלית',
    'ui.map.weapons.flamethrower': 'להביור', 'ui.map.weapons.silenced': 'מקלע משתיק קול',
    'ui.map.weapons.dualPistol': 'שני אקדחים', 'ui.map.powerups.multiplier': 'מכפיל +1',
    'ui.map.powerups.extraLife': 'חיים נוספים', 'ui.map.powerups.health': 'בריאות',
    'ui.map.powerups.armour': 'שריון', 'ui.map.powerups.jailCard': 'יציאה חינם מהכלא',
    'ui.map.powerups.copBribe': 'שוחד לשוטר', 'ui.map.powerups.invulnerability': 'חסינות',
    'ui.map.powerups.doubleDamage': 'נזק כפול', 'ui.map.powerups.fastReload': 'טעינה מהירה',
    'ui.map.powerups.electroFingers': 'אצבעות חשמליות', 'ui.map.powerups.respect': 'כבוד',
    'ui.map.powerups.invisibility': 'אי־נראות', 'ui.map.powerups.instantGang': 'כנופיה מיידית',
    'ui.map.poi.save': 'נקודות שמירה', 'ui.map.poi.garage': 'מוסכים', 'ui.map.poi.crusher': 'מגרסות רכב',
    'ui.map.poi.frenzy': 'אתגרי טירוף ההרג', 'ui.map.poi.weapon': 'נשקים', 'ui.map.poi.powerup': 'בונוסים',
    'ui.map.poi.token': 'אסימונים', 'ui.map.police': 'משטרה', 'ui.map.jobs.easy': 'משימה קלה',
    'ui.map.jobs.medium': 'משימה בינונית', 'ui.map.jobs.hard': 'משימה קשה',
    'ui.map.jobs.info': 'טלפון מידע', 'ui.map.jobNamed': '{gang} · {job}',
    'ui.map.garage.machineGun': 'מקלע לרכב', 'ui.map.garage.oilSlick': 'כתם שמן',
    'ui.map.garage.mines': 'מוקשים לרכב', 'ui.map.garage.bomb': 'פצצה לרכב',
    'ui.map.garage.respray': 'צביעה מחדש', 'ui.map.garageName': 'מוסך: {services}',
    'ui.map.frenzy': 'אתגר טירוף ההרג', 'ui.map.weaponN': 'נשק {n}', 'ui.map.powerup': 'בונוס',
    'ui.map.token': 'אסימון', 'ui.map.savePointChurch': 'נקודת שמירה (כנסייה)',
    'ui.map.carCrusher': 'מגרסת רכב', 'ui.map.missionTarget': 'יעד המשימה',
    'ui.map.missionTargetsN': 'יעדי המשימה ({n})', 'ui.map.drawing': 'המפה בטעינה…',
    'ui.map.legend.showingAll': 'הכול מוצג', 'ui.map.legend.foundSoFar': 'אזורים שכבר גילית',
    'ui.map.legend.onMission': 'במהלך משימה', 'ui.map.legend.gangJobs': 'משימות כנופיות (לחץ לסימון נקודת ציון)',
    'ui.map.legend.jobs': 'משימות', 'ui.map.briefs.currentJob': 'המשימה הנוכחית',
    'ui.map.briefs.messages': 'הודעות אחרונות',
    'ui.map.help.line': 'M / Esc לסגירה · גרור או WASD לתנועה · גלגלת או Q/E לשינוי זום · לחיצה: נקודת ציון · לחיצה ימנית: מחיקה · Space: מיקום השחקן · F: {mode}{dist}',
    'ui.map.help.revealOn': 'הצגת הכול', 'ui.map.help.revealOff': 'הצגת אזורים שכבר ראית',
    'ui.map.help.waypointDist': ' · נקודת הציון במרחק {n} רחובות',
  },
  es: {
    'ui.map.weapons.pistol': 'Pistola',
    'ui.map.weapons.machineGun': 'Ametralladora',
    'ui.map.weapons.rocketLauncher': 'Lanzacohetes',
    'ui.map.weapons.electroGun': 'Arma electro',
    'ui.map.weapons.molotov': 'Cócteles molotov',
    'ui.map.weapons.grenades': 'Granadas',
    'ui.map.weapons.shotgun': 'Escopeta',
    'ui.map.weapons.electroBaton': 'Porra eléctrica',
    'ui.map.weapons.flamethrower': 'Lanzallamas',
    'ui.map.weapons.silenced': 'Ametralladora con silenciador',
    'ui.map.weapons.dualPistol': 'Pistola doble',
    'ui.map.powerups.multiplier': 'Multiplicador +1',
    'ui.map.powerups.extraLife': 'Vida extra',
    'ui.map.powerups.health': 'Salud',
    'ui.map.powerups.armour': 'Armadura',
    'ui.map.powerups.jailCard': 'Salida gratis de la cárcel',
    'ui.map.powerups.copBribe': 'Soborno al policía',
    'ui.map.powerups.invulnerability': 'Invulnerabilidad',
    'ui.map.powerups.doubleDamage': 'Doble daño',
    'ui.map.powerups.fastReload': 'Recarga rápida',
    'ui.map.powerups.electroFingers': 'Dedos eléctricos',
    'ui.map.powerups.respect': 'Respeto',
    'ui.map.powerups.invisibility': 'Invisibilidad',
    'ui.map.powerups.instantGang': 'Banda instantánea',
    'ui.map.poi.save': 'Puntos de guardado',
    'ui.map.poi.garage': 'Talleres',
    'ui.map.poi.crusher': 'Compactadoras de coches',
    'ui.map.poi.frenzy': 'Frenesí de asesinato',
    'ui.map.poi.weapon': 'Armas',
    'ui.map.poi.powerup': 'Mejoras',
    'ui.map.poi.token': 'Fichas',
    'ui.map.police': 'Policía',
    'ui.map.jobs.easy': 'Trabajo fácil',
    'ui.map.jobs.medium': 'Trabajo medio',
    'ui.map.jobs.hard': 'Trabajo difícil',
    'ui.map.jobs.info': 'Teléfono de información',
    'ui.map.jobNamed': '{job} de {gang}',
    'ui.map.garage.machineGun': 'ametralladora para coche',
    'ui.map.garage.oilSlick': 'charco de aceite',
    'ui.map.garage.mines': 'minas para coche',
    'ui.map.garage.bomb': 'bomba para coche',
    'ui.map.garage.respray': 'repintado',
    'ui.map.garageName': 'Taller: {services}',
    'ui.map.frenzy': 'Frenesí de asesinato',
    'ui.map.weaponN': 'Arma {n}',
    'ui.map.powerup': 'Mejora',
    'ui.map.token': 'Ficha',
    'ui.map.savePointChurch': 'Punto de guardado (iglesia)',
    'ui.map.carCrusher': 'Compactadora de coches',
    'ui.map.missionTarget': 'Objetivo de la misión',
    'ui.map.missionTargetsN': 'Objetivos de la misión ({n})',
    'ui.map.drawing': 'Dibujando el mapa…',
    'ui.map.legend.showingAll': 'Mostrando todo',
    'ui.map.legend.foundSoFar': 'Encontrado hasta ahora',
    'ui.map.legend.onMission': 'En una misión',
    'ui.map.legend.gangJobs': 'Trabajos de bandas (haz clic para fijar un punto de ruta)',
    'ui.map.legend.jobs': 'Trabajos',
    'ui.map.briefs.currentJob': 'Trabajo actual',
    'ui.map.briefs.messages': 'Últimos mensajes',
    'ui.map.help.line': 'M / Esc cierra · arrastra o WASD mueve · rueda o Q/E hace zoom · clic: punto de ruta · clic derecho: quitar · Space: tú · F: {mode}{dist}',
    'ui.map.help.revealOn': 'mostrar todo',
    'ui.map.help.revealOff': 'solo lo que has visto',
    'ui.map.help.waypointDist': ' · punto de ruta a {n} bloques',
  },
  fr: {
    'ui.map.weapons.pistol': 'Pistolet',
    'ui.map.weapons.machineGun': 'Mitrailleuse',
    'ui.map.weapons.rocketLauncher': 'Lance-roquettes',
    'ui.map.weapons.electroGun': 'Arme électro',
    'ui.map.weapons.molotov': 'Cocktails Molotov',
    'ui.map.weapons.grenades': 'Grenades',
    'ui.map.weapons.shotgun': 'Fusil à pompe',
    'ui.map.weapons.electroBaton': 'Matraque électrique',
    'ui.map.weapons.flamethrower': 'Lance-flammes',
    'ui.map.weapons.silenced': 'Mitrailleuse silencieuse',
    'ui.map.weapons.dualPistol': 'Pistolet double',
    'ui.map.powerups.multiplier': 'Multiplicateur +1',
    'ui.map.powerups.extraLife': 'Vie supplémentaire',
    'ui.map.powerups.health': 'Santé',
    'ui.map.powerups.armour': 'Armure',
    'ui.map.powerups.jailCard': 'Libéré de prison',
    'ui.map.powerups.copBribe': 'Pot-de-vin',
    'ui.map.powerups.invulnerability': 'Invulnérabilité',
    'ui.map.powerups.doubleDamage': 'Dégâts doublés',
    'ui.map.powerups.fastReload': 'Rechargement rapide',
    'ui.map.powerups.electroFingers': 'Doigts électriques',
    'ui.map.powerups.respect': 'Respect',
    'ui.map.powerups.invisibility': 'Invisibilité',
    'ui.map.powerups.instantGang': 'Gang instantané',
    'ui.map.poi.save': 'Points de sauvegarde',
    'ui.map.poi.garage': 'Garages',
    'ui.map.poi.crusher': 'Broyeurs de voitures',
    'ui.map.poi.frenzy': 'Frénésies meurtrières',
    'ui.map.poi.weapon': 'Armes',
    'ui.map.poi.powerup': 'Bonus',
    'ui.map.poi.token': 'Jetons',
    'ui.map.police': 'Police',
    'ui.map.jobs.easy': 'Contrat facile',
    'ui.map.jobs.medium': 'Contrat moyen',
    'ui.map.jobs.hard': 'Contrat difficile',
    'ui.map.jobs.info': "Téléphone d'info",
    'ui.map.jobNamed': '{job} des {gang}',
    'ui.map.garage.machineGun': 'mitrailleuse de voiture',
    'ui.map.garage.oilSlick': 'tache d’huile',
    'ui.map.garage.mines': 'mines de voiture',
    'ui.map.garage.bomb': 'bombe de voiture',
    'ui.map.garage.respray': 'repeinture',
    'ui.map.garageName': 'Garage : {services}',
    'ui.map.frenzy': 'Frénésie meurtrière',
    'ui.map.weaponN': 'Arme {n}',
    'ui.map.powerup': 'Bonus',
    'ui.map.token': 'Jeton',
    'ui.map.savePointChurch': 'Point de sauvegarde (église)',
    'ui.map.carCrusher': 'Broyeur de voitures',
    'ui.map.missionTarget': 'Cible de la mission',
    'ui.map.missionTargetsN': 'Cibles de la mission ({n})',
    'ui.map.drawing': 'Dessin de la carte…',
    'ui.map.legend.showingAll': 'Tout afficher',
    'ui.map.legend.foundSoFar': 'Trouvé jusqu’ici',
    'ui.map.legend.onMission': 'En mission',
    'ui.map.legend.gangJobs': 'Contrats des gangs (cliquez pour placer un point de passage)',
    'ui.map.legend.jobs': 'Contrats',
    'ui.map.briefs.currentJob': 'Contrat en cours',
    'ui.map.briefs.messages': 'Derniers messages',
    'ui.map.help.line': 'M / Échap ferme · glisser ou WASD déplace · molette ou Q/E zoome · clic : point de passage · clic droit : effacer · Space : vous · F : {mode}{dist}',
    'ui.map.help.revealOn': 'tout afficher',
    'ui.map.help.revealOff': 'seulement ce que vous avez vu',
    'ui.map.help.waypointDist': ' · point de passage à {n} blocs',
  },
});

const PX = 16;            // map image pixels per block (256 blocks -> 4096 px)
const ROWS_PER_CHUNK = 8; // block rows rendered per step while building the image
const MINIMAP_KEY = 'gta2-port-minimap';
const ENEMY_RANGE = 24; // blocks: how close an enemy player must be to show on the map and radar
const WAYPOINT_REACHED = 2; // blocks: this close, the waypoint is reached and goes
const FX = 16384;         // Fix16: 1.0 block
const SEEN_KEY = 'gta2-port-seen-';   // + map id: blocks seen on screen (discovery)
const REVEAL_KEY = 'gta2-port-map-reveal';

// Points of interest by object model (enums.hpp, namespace objects); the names are translation keys.
const WEAPONS = ['ui.map.weapons.pistol', 'ui.map.weapons.machineGun', 'ui.map.weapons.rocketLauncher',
  'ui.map.weapons.electroGun', 'ui.map.weapons.molotov', 'ui.map.weapons.grenades',
  'ui.map.weapons.shotgun', 'ui.map.weapons.electroBaton', 'ui.map.weapons.flamethrower',
  'ui.map.weapons.silenced', 'ui.map.weapons.dualPistol'];
const POWERUPS = {
  228: 'ui.map.powerups.multiplier', 229: 'ui.map.powerups.extraLife', 230: 'ui.map.powerups.health',
  231: 'ui.map.powerups.armour', 232: 'ui.map.powerups.jailCard', 233: 'ui.map.powerups.copBribe',
  234: 'ui.map.powerups.invulnerability', 235: 'ui.map.powerups.doubleDamage', 236: 'ui.map.powerups.fastReload',
  237: 'ui.map.powerups.electroFingers', 238: 'ui.map.powerups.respect', 239: 'ui.map.powerups.invisibility',
  240: 'ui.map.powerups.instantGang',
};
// The labels are translation keys resolved when read (the language can change at any time).
const poi = (label, colour, glyph) => ({ get label() { return t(label); }, colour, glyph });
export const POI_KINDS = {
  save: poi('ui.map.poi.save', '#ffffff', '✝'),
  garage: poi('ui.map.poi.garage', '#c77dff', 'G'),
  crusher: poi('ui.map.poi.crusher', '#9a978f', 'C'),
  frenzy: poi('ui.map.poi.frenzy', '#ff3b3b', 'K'),
  weapon: poi('ui.map.poi.weapon', '#ff9f1c', 'W'),
  powerup: poi('ui.map.poi.powerup', '#3ddc84', '+'),
  token: poi('ui.map.poi.token', '#ffd23f', '$'),
};
// Gang job phones, by HUD arrow colour (Hud_Arrow_7C::DrawArrow_5D0C90; checked
// against the phone objects at the same places).
// Who speaks a brief (its face, GetBriefFaceIdx_5D3680): shown before the text on the job panel.
// Gang names are proper nouns and stay as they are; t() passes them through unchanged.
const SPEAKERS = { 1: 'ui.map.speaker.loonies', 2: 'ui.map.speaker.yakuza', 3: 'ui.map.speaker.zaibatsu', 4: 'ui.map.speaker.rednecks', 5: 'ui.map.speaker.scientists', 6: 'ui.map.speaker.krishnas', 7: 'ui.map.speaker.russians', 9: 'ui.map.police' };

const job = (label, colour, dot) => ({ get label() { return t(label); }, colour, dot });
const JOBS = {
  3: job('ui.map.jobs.easy', '#3ddc84', 9),     // green phone
  1: job('ui.map.jobs.medium', '#ffd23f', 8),   // yellow phone
  2: job('ui.map.jobs.hard', '#ff3b3b', 10),    // red phone
  4: job('ui.map.jobs.info', '#4cc9f0', 0),   // blue phone
};
// HUD sprites (sprite type 6): gang arrows 1-7 (by gang arrow colour, tip up),
// difficulty triangles 8-10, gang logos 64 + arrow colour - 1 (respect bars).
const HUD_SPRITES = 6;
const gangLogo = (arrowColour) => 63 + arrowColour;
const GANGS = { zai: 'ui.map.speaker.zaibatsu', yak: 'ui.map.speaker.yakuza', loo: 'ui.map.speaker.loonies',
  red: 'ui.map.speaker.rednecks', sci: 'ui.map.speaker.scientists', srs: 'ui.map.speaker.scientists',
  kri: 'ui.map.speaker.krishnas', rus: 'ui.map.speaker.russians' };
// What a garage door does (Car_BC::HandleShops_443C40, Player::ObjectTypeToWeaponType_443CB0).
function garageService(extra) {
  if (extra === 250) return t('ui.map.garage.machineGun');
  if (extra === 251) return t('ui.map.garage.oilSlick');
  if (extra === 252) return t('ui.map.garage.mines');
  if (extra === 253 || extra === 254) return t('ui.map.garage.bomb');
  return t('ui.map.garage.respray');
}
function describe(model) {
  if (model === 286) return { kind: 'frenzy', name: t('ui.map.frenzy') };
  if (model >= 200 && model <= 227) return { kind: 'weapon', name: WEAPONS[model - 200] ? t(WEAPONS[model - 200]) : t('ui.map.weaponN', { n: model - 200 }) };
  if (model >= 228 && model <= 249) return { kind: 'powerup', name: POWERUPS[model] ? t(POWERUPS[model]) : t('ui.map.powerup') };
  if (model === 266) return { kind: 'token', name: t('ui.map.token') };
  return null; // phones are shown as gang jobs; garages, crushers and saves are grouped separately
}

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

/** The map's discovery in this browser, per district (map id), for Export saves. */
export function exportDiscovery() {
  const out = {};
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(SEEN_KEY)) out[k.slice(SEEN_KEY.length)] = localStorage.getItem(k);
  } catch { /* storage unavailable */ }
  return out;
}

/** Adds imported discovery to what this browser has seen (never removes any). Returns the districts. */
export function importDiscovery(map) {
  let districts = 0;
  for (const [id, b64] of Object.entries(map && typeof map === 'object' ? map : {})) {
    if (!/^\d+$/.test(id) || typeof b64 !== 'string') continue;
    try {
      const bits = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (bits.length !== 8192) continue;
      const have = localStorage.getItem(SEEN_KEY + id);
      if (have) {
        const old = Uint8Array.from(atob(have), (c) => c.charCodeAt(0));
        for (let i = 0; i < 8192 && i < old.length; i++) bits[i] |= old[i];
      }
      let bin = '';
      for (const b of bits) bin += String.fromCharCode(b);
      localStorage.setItem(SEEN_KEY + id, btoa(bin));
      districts++;
    } catch { /* corrupt entry or storage full: skip it */ }
  }
  return districts;
}

export class Gta2Map {
  /**
   * @param {object} opts
   * @param {object} opts.Module the game module
   * @param {object} opts.renderer the WebGL renderer (its viewport maps reference pixels to the canvas)
   * @param {HTMLCanvasElement} opts.gameCanvas
   * @param {(paused: boolean) => void} opts.onPause pause/resume the game and its audio
   */
  constructor({ Module, renderer, gameCanvas, onPause }) {
    this.Module = Module;
    this.renderer = renderer;
    this.gameCanvas = gameCanvas;
    this.onPause = onPause;
    this.stateFn = () => Module.ccall('gta2_port_map_state', 'number', [], []);
    this.setNativeBriefTextHidden = Module.cwrap('gta2_port_set_native_brief_text_hidden', null, ['number']);
    this.setNativeBriefMaxWidth = Module.cwrap('gta2_port_set_brief_text_max_width', null, ['number']);
    this.getMissionTitleKey = Module.cwrap('gta2_port_mission_title_key', 'number', []);
    this.setNativeMissionTitleHidden = Module.cwrap('gta2_port_set_native_mission_title_hidden', null, ['number']);
    this.epoch = 0;
    this.mapId = 0;
    this.image = null;       // canvas holding the district map (4096 x 4096)
    this.building = false;
    this.bounds = null;      // used block area {x0, y0, x1, y1}
    this.wp = null; // waypoint: this session only, cleared when a district loads
    try { localStorage.removeItem('gta2-port-waypoints'); } catch { /* storage unavailable */ } // older builds kept it
    this.minimapOn = loadJson(MINIMAP_KEY, true);
    this.applyHudArrows();
    this.open = false;
    this.view = { cx: 128, cy: 128, scale: 12 }; // map screen: centre (blocks), pixels per block
    this.reveal = loadJson(REVEAL_KEY, false);   // show everything, ignoring discovery
    this.seen = new Uint8Array(256 * 256);       // discovery: blocks that have been on screen
    this.seenDirty = false;
    this.fog = document.createElement('canvas'); // 256 x 256, dark where unseen
    this.fog.width = this.fog.height = 256;
    this.fogDirty = true;
    this.pois = [];
    this.poiAt = 0;
    this.sprites = new Map(); // HUD sprite index -> canvas (per district)
    this.hover = null;
    this.legendScroll = 0;
    this.jobBriefScroll = 0;
    this.briefRenderKey = null;
    this.briefHistoryRenderKey = null;
    this.briefLayoutKey = null;
    this.nativeBriefHidden = null;
    this.nativeBriefMaxWidth = null;
    this.legendBox = null;
    this.jobBriefBox = null;
    this.coop = null;         // co-op match: other players and their waypoints (shell.js coopView)
    this.showScores = false;  // co-op: Tab held
    setInterval(() => this.saveSeen(), 5000);
    // Discovery also advances when animation frames are throttled (hidden or background tab).
    setInterval(() => {
      if (this.open || this.epoch === 0) return;
      const s = this.state();
      if (s && s.hasPlayer && s.epoch === this.epoch) this.markSeen(s);
    }, 250);
    window.addEventListener('pagehide', () => this.saveSeen());

    this.screen = document.createElement('canvas');
    this.screen.id = 'map-screen';
    this.screen.hidden = true;
    // The radar has its own small canvas, and the full-window overlay (waypoint arrow, names,
    // scoreboard) is hidden when it has nothing to show: browsers that draw and composite 2D
    // canvases on the CPU (Firefox on macOS) dropped to 40 fps redrawing a full-window layer.
    this.radar = document.createElement('canvas');
    this.radar.id = 'map-radar';
    this.radar.hidden = true;
    this.overlay = document.createElement('canvas'); // on-screen waypoint arrow, names, scoreboard
    this.overlay.id = 'map-overlay';
    this.overlay.hidden = true;
    document.body.append(this.screen, this.radar, this.overlay);
    this.wireScreen();
    const tick = () => { this.frame(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /** Live game state, or null outside gameplay. */
  state() {
    const p = this.stateFn();
    const v = this.Module.HEAP32.subarray(p >> 2, (p >> 2) + 20);
    if (!v[0]) return null;
    // With display-rate interpolation the radar and arrows follow where the last draw put the player
    // and camera, so they move as smoothly as the view instead of in 30 Hz steps.
    const drawn = v[14] !== 0 || v[15] !== 0;
    return {
      epoch: v[1], mapId: v[2] >>> 0, hasPlayer: !!v[3],
      x: (drawn ? v[14] : v[4]) / FX, y: (drawn ? v[15] : v[5]) / FX, z: v[6] / FX,
      heading: ((drawn ? v[16] : v[7]) / 1440) * Math.PI * 2, inCar: !!v[8],
      camX: (drawn ? v[17] : v[9]) / FX, camY: (drawn ? v[18] : v[10]) / FX, camZ: v[11] / FX, zoom: v[12] / FX,
      viewWidth: v[13],
      paused: !!v[19],
    };
  }

  get waypoint() { return this.wp; }
  set waypoint(w) {
    this.wp = w || null;
    this.wpArmed = false; // reached only after being farther away (not when set where you stand)
    if (this.coop) this.coop.shareWaypoint(this.wp); // co-op: the other players see it in your colour
  }

  /** Builds the map image for a newly loaded district, a few rows per step. */
  async build(epoch) {
    this.building = true;
    const M = this.Module;
    const width = 256 * PX;
    const image = document.createElement('canvas');
    image.width = width;
    image.height = width;
    const ctx = image.getContext('2d');
    const bytes = width * PX * ROWS_PER_CHUNK * 4;
    const buf = M._malloc(bytes);
    let x0 = 256, y0 = 256, x1 = -1, y1 = -1;
    try {
      for (let row = 0; row < 256; row += ROWS_PER_CHUNK) {
        if (this.epoch !== epoch) return; // a different district loaded meanwhile
        if (!M.ccall('gta2_port_map_render_rows', 'number', ['number', 'number', 'number', 'number'],
          [row, ROWS_PER_CHUNK, PX, buf])) return;
        const px = new Uint8ClampedArray(M.HEAPU8.buffer, buf, bytes).slice();
        ctx.putImageData(new ImageData(px, width, PX * ROWS_PER_CHUNK), 0, row * PX);
        for (let r = 0; r < ROWS_PER_CHUNK; r++) {
          for (let bx = 0; bx < 256; bx++) {
            if (px[(r * PX * width + bx * PX) * 4 + 3]) {
              x0 = Math.min(x0, bx); x1 = Math.max(x1, bx);
              y0 = Math.min(y0, row + r); y1 = Math.max(y1, row + r);
            }
          }
        }
        await new Promise((r) => setTimeout(r, 0));
      }
      this.image = image;
      // A ready-to-draw copy for the radar, which draws from the map every frame: Firefox copies a
      // canvas source on each drawImage (7 ms for this 4096 x 4096 map), an ImageBitmap it does not.
      this.imageBitmap = null;
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(image).then((bmp) => { if (this.image === image) this.imageBitmap = bmp; }).catch(() => {});
      }
      this.bounds = x1 >= 0 ? { x0, y0, x1: x1 + 1, y1: y1 + 1 } : { x0: 0, y0: 0, x1: 256, y1: 256 };
    } finally {
      M._free(buf);
      this.building = false;
    }
  }

  /** Quick load: the game's memory was replaced, so the district is drawn again (same district: the waypoint stays). */
  invalidate() {
    this.epoch = -1;
    this.keepWaypoint = true;
  }

  /** Per animation frame: notice district changes, draw the minimap and the waypoint arrow. */
  frame() {
    const s = this.state();
    if (s && s.epoch !== this.epoch) {
      this.saveSeen();
      this.epoch = s.epoch;
      this.nativeBriefMaxWidth = null;
      const sameDistrict = s.mapId === this.mapId;
      this.mapId = s.mapId;
      this.image = null;
      if (this.imageBitmap) { this.imageBitmap.close(); this.imageBitmap = null; }
      if (!(this.keepWaypoint && sameDistrict)) this.wp = null;
      this.keepWaypoint = false;
      this.sprites.clear();
      this.loadSeen();
      this.build(s.epoch);
    }
    this.last = s;
    this.fitNativeBriefToMinimap(s);
    this.updateBriefOverlay(s);
    this.updateMissionTitleOverlay(s);
    if (s && s.hasPlayer && !this.open) {
      this.markSeen(s);
      this.checkArrival(s);
    }
    if (this.open) { this.drawScreen(); return; }
    this.drawOverlay(s);
  }

  updateBriefOverlay(s) {
    const panel = document.getElementById('mission-brief');
    const history = document.getElementById('mission-history');
    const historyButton = document.getElementById('mission-history-toggle');
    const modalOpen = !!document.querySelector('[role="dialog"]:not([hidden])');
    if (historyButton) historyButton.hidden = lang() !== 'he';
    if (!panel || !s || !s.hasPlayer || s.paused || this.open || modalOpen || lang() !== 'he') {
      if (panel) panel.hidden = true;
      if (history) history.hidden = true;
      this.syncNativeBriefTextHidden(false);
      document.body.classList.remove('mission-visible');
      return;
    }
    const { active, briefs } = this.jobBriefs();
    const newest = briefs[0];
    if (!newest) {
      panel.hidden = true;
      this.syncNativeBriefTextHidden(false);
      document.body.classList.remove('mission-visible');
      return;
    }
    const briefKey = `${newest.shownAt}:${newest.gxtKey}:${newest.text}`;
    if (briefKey !== this.lastBriefKey) {
      this.lastBriefKey = briefKey;
      this.lastBriefAt = performance.now();
      this.briefHistory = (this.briefHistory || []).filter((item) => item.gxtKey !== newest.gxtKey);
      this.briefHistory.unshift({ source: newest.text, gxtKey: newest.gxtKey, result: missionText(newest.text, { gxtKey: newest.gxtKey }) });
      this.briefHistory = this.briefHistory.slice(0, 8);
    }
    const latest = this.briefHistory?.[0];
    const refreshed = missionText(newest.text, { gxtKey: newest.gxtKey });
    if (latest && (latest.result.text !== refreshed.text || latest.result.translated !== refreshed.translated)) latest.result = refreshed;
    panel.hidden = !active || !newest || !refreshed.translated;
    this.syncNativeBriefTextHidden(!panel.hidden);
    document.body.classList.toggle('mission-visible', !panel.hidden);
    if (!panel.hidden) {
      const row = this.briefHistory?.[0];
      const textNode = panel.querySelector('.mission-brief-text');
      const colorRuns = row?.result.colorRuns || refreshed.colorRuns;
      const renderKey = JSON.stringify([row?.result.text || refreshed.text, row?.result.translated ?? refreshed.translated, colorRuns]);
      if (renderKey !== this.briefRenderKey) {
        this.briefRenderKey = renderKey;
        if (colorRuns?.length) {
          textNode.replaceChildren(...colorRuns.map((run) => {
            const span = document.createElement('span');
            if (run.highlighted) span.className = 'mission-brief-highlight';
            span.textContent = run.text;
            return span;
          }));
        } else {
          textNode.textContent = row?.result.text || refreshed.text;
        }
        this.briefLayoutKey = null;
      }
      panel.dir = row?.result.translated ? 'rtl' : 'auto';
      panel.classList.toggle('untranslated', !row?.result.translated);
      this.positionNativeBriefText(panel);
    }
    if (!history.hidden) {
      const list = history.querySelector('.mission-history-list');
      const historyKey = JSON.stringify((this.briefHistory || []).map((item) => [item.gxtKey, item.result.text, item.result.translated]));
      if (historyKey !== this.briefHistoryRenderKey) {
        this.briefHistoryRenderKey = historyKey;
        list.replaceChildren(...(this.briefHistory || []).map((item) => {
          const p = document.createElement('p'); p.dir = item.result.translated ? 'rtl' : 'auto'; p.textContent = item.result.text; return p;
        }));
      }
    }
  }

  syncNativeBriefTextHidden(visible) {
    const hidden = visible ? 1 : 0;
    if (this.nativeBriefHidden === hidden) return;
    this.nativeBriefHidden = hidden;
    this.setNativeBriefTextHidden(hidden);
  }

  positionNativeBriefText(panel) {
    const rect = this.gameCanvas.getBoundingClientRect();
    const vp = this.renderer.viewport;
    if (!vp || !this.renderer.scale || !rect.width) return;
    const dpr = this.gameCanvas.width / rect.width;
    const scale = this.renderer.scale / dpr;
    const viewLeft = rect.left + vp.x / dpr;
    const viewTop = rect.top + (this.gameCanvas.height - vp.y - vp.h) / dpr;
    const viewWidth = vp.w / dpr;
    const viewHeight = vp.h / dpr;
    // The original HUD text uses the centered 4:3 safe area inside the wide game view.
    const nativeWidth = Math.min(viewWidth, viewHeight * (4 / 3));
    const nativeLeft = viewLeft + (viewWidth - nativeWidth) / 2;
    const left = nativeLeft + 64 * scale; // Hud_Brief_704::DrawBrief_5D3B80 text x
    const radarLeft = !this.radar.hidden ? this.radar.getBoundingClientRect().left : viewLeft + viewWidth;
    const right = Math.min(nativeLeft + nativeWidth - 8 * scale, radarLeft - 8 * scale, nativeLeft + 520 * scale);
    const tools = document.getElementById('tools');
    const toolsTop = tools && !tools.hidden ? tools.getBoundingClientRect().top : window.innerHeight;
    const textBottom = Math.min(viewTop + viewHeight, toolsTop - 8);
    const panelWidth = `${Math.max(120 * scale, Math.min(576 * scale, right - left))}px`;
    const panelBottom = `${Math.max(0, window.innerHeight - textBottom)}px`;
    if (panel.style.left !== `${left}px`) panel.style.left = `${left}px`;
    if (panel.style.right !== 'auto') panel.style.right = 'auto';
    // Native Hud_Brief_704 wraps at MaxLineWidth_62689C (576 game pixels).
    // In RTL mode the original face is mirrored to the right; stop the text before it.
    // Keep the HTML text to the native line budget, also respecting the minimap.
    if (panel.style.width !== panelWidth) panel.style.width = panelWidth;
    if (panel.style.bottom !== panelBottom) panel.style.bottom = panelBottom;
    if (panel.style.maxHeight !== 'none') panel.style.maxHeight = 'none';
    if (panel.style.overflow !== 'visible') panel.style.overflow = 'visible';
    const textNode = panel.querySelector('.mission-brief-text');
    if (textNode) {
      if (textNode.lang !== 'he') textNode.lang = 'he';
      const maxHeight = Math.max(96 * scale, viewHeight * 0.58);
      const layoutKey = `${this.briefRenderKey}|${panelWidth}|${maxHeight}|${window.devicePixelRatio}`;
      if (layoutKey !== this.briefLayoutKey) {
        this.briefLayoutKey = layoutKey;
        this.fitBriefTypography(textNode, maxHeight);
      }
    }
  }

  fitBriefTypography(textNode, maxHeight) {
    textNode.style.removeProperty('font-size');
    const base = parseFloat(getComputedStyle(textNode).fontSize) || 26;
    const minimum = Math.min(22, base);
    let size = base;
    textNode.style.fontSize = `${size}px`;
    while (textNode.getBoundingClientRect().height > maxHeight && size > minimum) {
      size = Math.max(minimum, size - 1);
      textNode.style.fontSize = `${size}px`;
    }
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const lines = new Set([...range.getClientRects()].map(rect => Math.round(rect.top * 2) / 2)).size;
    const height = textNode.getBoundingClientRect().height;
    textNode.dataset.layoutLines = String(lines);
    textNode.dataset.layoutOverflow = height > maxHeight + 1 ? 'true' : 'false';
    return { fontSize: size, lines, height, maxHeight, overflow: height > maxHeight + 1 };
  }

  updateMissionTitleOverlay(s) {
    const panel = document.getElementById('mission-title');
    if (!panel) return;
    const hebrew = lang() === 'he';
    this.setNativeMissionTitleHidden(hebrew ? 1 : 0);
    const key = this.getMissionTitleKey();
    const record = hebrew ? missionTitle(key) : null;
    const visible = !!(s && s.hasPlayer && !s.paused && !this.open && record);
    // Keep the banner hidden until its first valid viewport position is ready.
    // Otherwise the first phone/title frame can flash at the canvas origin.
    panel.hidden = true;
    if (!visible) return;
    const rect = this.gameCanvas.getBoundingClientRect();
    const vp = this.renderer.viewport;
    if (!vp || !this.renderer.scale || !rect.width || !rect.height) return;
    if (panel.dataset.key !== String(key) || panel.dataset.viewportWidth !== String(window.innerWidth)) {
      this.renderMissionTitle(panel, record.text);
      panel.setAttribute('aria-label', record.text);
      panel.dataset.key = String(key);
      panel.dataset.viewportWidth = String(window.innerWidth);
    }
    const dpr = this.gameCanvas.width / rect.width;
    const viewLeft = rect.left + vp.x / dpr;
    const viewTop = rect.top + (this.gameCanvas.height - vp.y - vp.h) / dpr;
    const viewWidth = vp.w / dpr;
    const viewHeight = vp.h / dpr;
    panel.style.left = `${viewLeft + viewWidth / 2}px`;
    panel.style.top = `${viewTop + viewHeight * 0.23}px`;
    panel.hidden = false;
  }

  renderMissionTitle(canvas, text) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = this.gameCanvas.width / Math.max(1, this.gameCanvas.getBoundingClientRect().width);
    const scale = Math.max(1, 2 * (window.innerWidth / 1200));
    const baseFontSize = 36;
    const minimumFontSize = 28;
    const titleFont = 'GTA2 Noto Title';
    canvas.dataset.text = text;
    canvas.dataset.renderViewportWidth = String(window.innerWidth);
    if (!document.fonts.check(`900 ${baseFontSize}px "${titleFont}"`)) {
      document.fonts.load(`900 ${baseFontSize}px "${titleFont}"`).then(() => {
        if (!canvas.hidden && canvas.dataset.text === text) this.renderMissionTitle(canvas, text);
      });
    }
    let fontSize = baseFontSize;
    ctx.font = `900 ${fontSize}px "${titleFont}", "Arial Black", Arial, sans-serif`;
    // Explicit direction lets the browser's BiDi algorithm position punctuation
    // correctly while retaining the order of embedded Latin names and numbers.
    ctx.direction = 'rtl';
    const viewWidth = this.renderer.viewport?.w ? this.renderer.viewport.w / dpr : window.innerWidth;
    const availableWidth = Math.max(100, Math.min(window.innerWidth - 32, viewWidth - 32)) / scale;
    let measured = ctx.measureText(text).width;
    while (measured + 8 > availableWidth && fontSize > minimumFontSize) {
      fontSize -= 1;
      ctx.font = `900 ${fontSize}px "${titleFont}", "Arial Black", Arial, sans-serif`;
      measured = ctx.measureText(text).width;
    }
    canvas.dataset.fontSizeUsed = String(fontSize);
    canvas.dataset.fitOverflow = String(measured + 8 > availableWidth);
    const width = Math.ceil(measured + 8);
    const height = Math.max(44, Math.ceil(fontSize * 1.24));
    canvas.width = width;
    canvas.height = height;
    ctx.font = `900 ${fontSize}px "${titleFont}", "Arial Black", Arial, sans-serif`;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    ctx.lineWidth = 2.25 * (fontSize / baseFontSize);
    ctx.strokeStyle = '#48406d';
    ctx.shadowColor = '#30335e';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.strokeText(text, width / 2, height / 2);
    ctx.shadowColor = 'transparent';
    const fill = ctx.createLinearGradient(0, 2, 0, height - 2);
    fill.addColorStop(0, '#ffe06b');
    fill.addColorStop(.56, '#fca33c');
    fill.addColorStop(1, '#eb532c');
    ctx.fillStyle = fill;
    ctx.fillText(text, width / 2, height / 2);
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
  }
  fitNativeBriefToMinimap(s) {
    const vp = s && s.hasPlayer && this.minimapOn ? this.gameViewport() : null;
    if (!vp) { this.setNativeBriefMaxWidthCached(576); return; }
    const radius = Math.round(Math.min(105, Math.max(56, vp.h * 0.15)));
    const border = Math.max(5, Math.round(radius * 0.11));
    const centerX = vp.x + vp.w - radius - border - 14;
    const radarExtent = Math.ceil(radius + border * 4 + 12);
    const radarLeft = Math.round(centerX - radarExtent);
    const scale = vp.w / vp.refW;
    const textLeft = vp.x + 64 * scale;
    const width = Math.floor((radarLeft - 8 * scale - textLeft) / scale);
    this.setNativeBriefMaxWidthCached(Math.max(240, Math.min(576, width)));
  }

  setNativeBriefMaxWidthCached(width) {
    if (this.nativeBriefMaxWidth === width) return;
    this.nativeBriefMaxWidth = width;
    this.setNativeBriefMaxWidth(width);
  }

  /** The waypoint goes once the player gets to it. */
  checkArrival(s) {
    if (!this.wp) return;
    const near = Math.hypot(this.wp.x - s.x, this.wp.y - s.y) <= WAYPOINT_REACHED;
    if (!near) this.wpArmed = true;
    else if (this.wpArmed) this.waypoint = null;
  }

  // ---- discovery and points of interest ---------------------------------

  loadSeen() {
    this.seen = new Uint8Array(256 * 256);
    try {
      const b64 = localStorage.getItem(SEEN_KEY + this.mapId);
      if (b64) {
        const bits = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        for (let i = 0; i < 65536; i++) this.seen[i] = (bits[i >> 3] >> (i & 7)) & 1;
      }
    } catch { /* storage unavailable or corrupt: start fresh */ }
    this.fogDirty = true;
  }

  /**
   * Stores the blocks seen. Adds to what is stored rather than replacing it: another tab (or an
   * older version of the game in one) may have stored more since this one loaded. replace: a reset.
   */
  saveSeen(replace = false) {
    if (!this.seenDirty || !this.mapId) return;
    if (!replace) this.mergeStoredSeen();
    const bits = new Uint8Array(8192);
    for (let i = 0; i < 65536; i++) if (this.seen[i]) bits[i >> 3] |= 1 << (i & 7);
    let bin = '';
    for (const b of bits) bin += String.fromCharCode(b);
    try { localStorage.setItem(SEEN_KEY + this.mapId, btoa(bin)); this.seenDirty = false; } catch { /* storage full */ }
  }

  resetDiscovery() {
    this.seen.fill(0);
    this.seenDirty = true;
    this.fogDirty = true;
    this.saveSeen(true);
  }

  /** Adds the blocks another tab has stored for this district. */
  mergeStoredSeen() {
    try {
      const b64 = localStorage.getItem(SEEN_KEY + this.mapId);
      if (!b64) return;
      const bits = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      for (let i = 0; i < 65536; i++) {
        if (!this.seen[i] && (bits[i >> 3] >> (i & 7)) & 1) { this.seen[i] = 1; this.fogDirty = true; }
      }
    } catch { /* storage unavailable or corrupt */ }
  }

  /** Marks the blocks currently on screen (at the player's height) as seen. */
  markSeen(s) {
    const perBlock = (640 * s.zoom) / Math.max(1, s.camZ - s.z + 8);
    // The camera is not set up yet in the first frames of a level (zoom 0).
    if (!(perBlock > 4) || !s.viewWidth) return;
    const halfW = s.viewWidth / 2 / perBlock, halfH = 240 / perBlock;
    if (halfW > 40 || halfH > 30) return;
    const x0 = Math.max(0, Math.floor(s.camX - halfW)), x1 = Math.min(255, Math.floor(s.camX + halfW));
    const y0 = Math.max(0, Math.floor(s.camY - halfH)), y1 = Math.min(255, Math.floor(s.camY + halfH));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * 256 + x;
        if (!this.seen[i]) { this.seen[i] = 1; this.seenDirty = true; this.fogDirty = true; }
      }
    }
  }

  isSeen(x, y) {
    const bx = Math.floor(x), by = Math.floor(y);
    return bx >= 0 && by >= 0 && bx < 256 && by < 256 && !!this.seen[by * 256 + bx];
  }

  updateFog() {
    if (!this.fogDirty) return;
    this.fogDirty = false;
    const ctx = this.fog.getContext('2d');
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < 65536; i++) {
      img.data[i * 4 + 3] = this.seen[i] ? 0 : 235;
      img.data[i * 4] = 7; img.data[i * 4 + 1] = 8; img.data[i * 4 + 2] = 12;
    }
    ctx.putImageData(img, 0, 0);
  }

  /** Calls a map export that fills rows of `stride` ints; returns the rows. */
  rows(fn, stride, max = 1024) {
    const M = this.Module;
    const buf = M._malloc(max * stride * 4);
    try {
      const n = M.ccall(fn, 'number', ['number', 'number'], [buf, max]);
      const v = M.HEAP32.subarray(buf >> 2, (buf >> 2) + n * stride);
      const out = [];
      for (let i = 0; i < n; i++) out.push(Array.from(v.subarray(i * stride, (i + 1) * stride)));
      return out;
    } finally {
      M._free(buf);
    }
  }

  /** A HUD sprite as a canvas, from the player's style file (cached). */
  sprite(idx) {
    if (this.sprites.has(idx)) return this.sprites.get(idx);
    const M = this.Module;
    const max = 64 * 64 * 4;
    const buf = M._malloc(max);
    let canvas = null;
    try {
      const wh = M.ccall('gta2_port_sprite_rgba', 'number', ['number', 'number', 'number', 'number'], [HUD_SPRITES, idx, buf, max]);
      if (wh) {
        const w = wh >>> 16, h = wh & 0xffff;
        canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(M.HEAPU8.slice(buf, buf + w * h * 4)), w, h), 0, 0);
      }
    } finally {
      M._free(buf);
    }
    this.sprites.set(idx, canvas);
    return canvas;
  }

  /** Draws a sprite centred at (x, y), `height` pixels tall, rotated by `angle` (radians). */
  drawSprite(ctx, idx, x, y, height, angle = 0) {
    const c = this.sprite(idx);
    if (!c) return false;
    const k = height / c.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = k < 1;
    ctx.drawImage(c, (-c.width * k) / 2, (-c.height * k) / 2, c.width * k, c.height * k);
    ctx.restore();
    return true;
  }

  /** The game's points of interest (objects, save points, garages), refreshed at most twice a second. */
  points() {
    const now = performance.now();
    if (now - this.poiAt < 500) return this.pois;
    this.poiAt = now;
    const out = [];
    const garageDoors = [];
    for (const [model, x, y, , extra] of this.rows('gta2_port_map_objects', 5)) {
      const p = { model, x: x / FX, y: y / FX };
      if (model === 130) garageDoors.push({ ...p, service: garageService(extra) });
      else if (model === 143) out.push({ ...p, kind: 'crusher', name: t('ui.map.carCrusher') });
      else {
        const d = describe(model);
        if (d) out.push({ ...p, ...d });
      }
    }
    // A garage building has several doors (respray, car bomb, guns, ...): one marker each.
    const garages = [];
    for (const d of garageDoors) {
      const g = garages.find((g) => Math.hypot(g.x - d.x, g.y - d.y) < 8);
      if (g) { g.doors.push(d); g.x = g.doors.reduce((a, e) => a + e.x, 0) / g.doors.length; g.y = g.doors.reduce((a, e) => a + e.y, 0) / g.doors.length; }
      else garages.push({ x: d.x, y: d.y, doors: [d] });
    }
    for (const g of garages) {
      const services = [...new Set(g.doors.map((d) => d.service))];
      out.push({ x: g.x, y: g.y, kind: 'garage', name: t('ui.map.garageName', { services: services.join(', ') }) });
    }
    for (const [x, y, , save] of this.rows('gta2_port_map_triggers', 4, 64)) {
      if (save) out.push({ x: x / FX, y: y / FX, kind: 'save', name: t('ui.map.savePointChurch') });
    }
    this.pois = out;
    this.jobsCache = null;
    return this.pois;
  }

  /**
   * Gang job phones and mission targets, from the HUD's own arrows. Always
   * shown (the game points at them). Phones that stand together are one job.
   */
  jobs() {
    if (this.jobsCache && performance.now() - this.jobsAt < 500) return this.jobsCache;
    this.jobsAt = performance.now();
    const gangs = {};
    for (const [i, colour, , , , code] of this.rows('gta2_port_map_gangs', 6, 10)) {
      const c = String.fromCharCode(code & 255, (code >> 8) & 255, (code >> 16) & 255);
      gangs[i] = { name: GANGS[c] ? t(GANGS[c]) : c, colour };
    }
    const jobs = [];
    const targets = [];
    let onMission = false;
    for (const [gang, colour, kind, x, y, , shown, minRespect, respect, mission, arrowSprite] of this.rows('gta2_port_map_arrows', 11, 64)) {
      onMission = onMission || !!mission;
      const g = gangs[gang];
      const p = { x: x / FX, y: y / FX, shown: !!shown, gang: g ? g.name : null, logo: g ? gangLogo(g.colour) : 0, arrowSprite };
      // Gang job phones belong to a gang; an arrow with no gang is the current mission's target
      // (seen in Downtown: colour 4, an object target, HUD arrow sprite 0).
      if (gang >= 0 && JOBS[colour] && (kind === 4 || kind === 5)) {
        // Active: a job phone (not the info phone) the player has the respect for, while not on a mission.
        const available = colour !== 4 && !mission && (respect << 24 >> 24) >= (minRespect << 24 >> 24);
        const same = jobs.find((j) => j.gang === p.gang && j.colour === colour && Math.hypot(j.x - p.x, j.y - p.y) < 4);
        if (same) { same.shown = same.shown || p.shown; same.available = same.available || available; continue; }
        const jobText = t(JOBS[colour].label).toLowerCase();
        jobs.push({ ...p, colour, available, name: p.gang ? t('ui.map.jobNamed', { gang: p.gang, job: jobText }) : jobText });
      } else {
        targets.push({ ...p, name: t('ui.map.missionTarget') });
      }
    }
    this.jobsCache = { jobs, active: jobs.filter((j) => j.available), targets, onMission };
    return this.jobsCache;
  }

  visiblePoints() {
    const all = this.points();
    return this.reveal ? all : all.filter((p) => this.isSeen(p.x, p.y));
  }

  drawPoi(ctx, x, y, p, size = 1) {
    const k = POI_KINDS[p.kind];
    const r = 8 * size;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0b0d';
    ctx.fill();
    ctx.lineWidth = 2 * size;
    ctx.strokeStyle = k.colour;
    ctx.stroke();
    ctx.fillStyle = k.colour;
    ctx.font = `bold ${Math.round(10 * size)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(k.glyph, x, y + 0.5);
    ctx.textAlign = 'start';
  }

  // ---- map screen -------------------------------------------------------

  toggle() {
    if (this.open) this.close();
    else this.show();
  }

  show() {
    const s = this.state();
    if (!s || !s.hasPlayer) return false;
    this.open = true;
    this.screen.hidden = false;
    this.view.cx = s.x;
    this.view.cy = s.y;
    this.view.scale = 12;
    this.onPause(true);
    this.drawScreen();
    return true;
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.screen.hidden = true;
    this.onPause(false);
    this.gameCanvas.focus();
  }

  /** Keys while in gameplay. Returns true when the map used the key (the game does not get it). */
  handleKey(e, down) {
    if (this.open) {
      if (down && (e.code === 'KeyM' || e.code === 'Escape')) this.close();
      else if (down) this.panKey(e.code);
      return true;
    }
    if (e.code === 'Tab' && this.coop) {
      this.showScores = down; // hold Tab: the scoreboard
      return true;
    }
    if (e.code === 'KeyM' && this.last && this.last.hasPlayer) {
      if (down && !e.repeat) this.show();
      return true;
    }
    return false;
  }

  panKey(code) {
    const step = 120 / this.view.scale;
    const v = this.view;
    if (code === 'KeyW' || code === 'ArrowUp') v.cy -= step;
    else if (code === 'KeyS' || code === 'ArrowDown') v.cy += step;
    else if (code === 'KeyA' || code === 'ArrowLeft') v.cx -= step;
    else if (code === 'KeyD' || code === 'ArrowRight') v.cx += step;
    else if (code === 'Equal' || code === 'NumpadAdd' || code === 'KeyE') this.zoomBy(1.25);
    else if (code === 'Minus' || code === 'NumpadSubtract' || code === 'KeyQ') this.zoomBy(0.8);
    else if (code === 'Space' && this.last) { v.cx = this.last.x; v.cy = this.last.y; }
    else if (code === 'Backspace' || code === 'Delete') this.waypoint = null;
    else if (code === 'KeyF') { this.reveal = !this.reveal; saveJson(REVEAL_KEY, this.reveal); }
  }

  zoomBy(f, atX, atY) {
    const v = this.view;
    const before = this.toBlocks(atX, atY);
    v.scale = Math.min(64, Math.max(1.5, v.scale * f));
    if (atX !== undefined) {
      const after = this.toBlocks(atX, atY);
      v.cx += before.x - after.x;
      v.cy += before.y - after.y;
    }
  }

  /** The visible point of interest under a map-screen position, if any. */
  poiNear(sx, sy) {
    const r = this.screen.getBoundingClientRect();
    const v = this.view;
    let best = null, bestD = 12;
    const { active, targets } = this.jobs();
    for (const p of [...this.visiblePoints(), ...active, ...targets]) {
      const px = r.width / 2 + (p.x - v.cx) * v.scale, py = r.height / 2 + (p.y - v.cy) * v.scale;
      const d = Math.hypot(px - sx, py - sy);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }

  toBlocks(sx, sy) {
    const r = this.screen.getBoundingClientRect();
    const v = this.view;
    return { x: v.cx + ((sx ?? r.width / 2) - r.width / 2) / v.scale, y: v.cy + ((sy ?? r.height / 2) - r.height / 2) / v.scale };
  }

  wireScreen() {
    const el = this.screen;
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, cx: this.view.cx, cy: this.view.cy, moved: false, button: e.button };
    });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      this.view.cx = drag.cx - dx / this.view.scale;
      this.view.cy = drag.cy - dy / this.view.scale;
    });
    el.addEventListener('pointerup', (e) => {
      if (drag && !drag.moved) {
        const r = el.getBoundingClientRect();
        const lx = e.clientX - r.left, ly = e.clientY - r.top;
        const hit = (this.legendHits || []).find((h) => lx >= h.x && lx <= h.x + h.w && ly >= h.y && ly <= h.y + h.h);
        if (hit) {
          // a gang job in the list: make it the waypoint and show it
          this.waypoint = { x: hit.job.x, y: hit.job.y, name: hit.job.name, logo: hit.job.logo };
          this.view.cx = hit.job.x;
          this.view.cy = hit.job.y;
          drag = null;
          return;
        }
        const p = this.toBlocks(e.clientX - r.left, e.clientY - r.top);
        const near = this.poiNear(e.clientX - r.left, e.clientY - r.top);
        if (drag.button === 2) this.waypoint = null;
        else if (near) this.waypoint = { x: near.x, y: near.y, name: near.name, logo: near.logo };
        else this.waypoint = { x: Math.round(p.x * 4) / 4, y: Math.round(p.y * 4) / 4 };
      }
      drag = null;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const inBox = (box) => box && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
      if (inBox(this.legendBox)) {
        this.legendScroll = Math.max(0, Math.min(this.legendMaxScroll || 0, this.legendScroll + e.deltaY));
        this.drawScreen();
      } else if (inBox(this.jobBriefBox)) {
        this.jobBriefScroll = Math.max(0, Math.min(this.jobBriefMaxScroll || 0, this.jobBriefScroll + e.deltaY));
        this.drawScreen();
      } else this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y);
    }, { passive: false });
  }

  fitCanvas(c) {
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return { w: r.width, h: r.height, dpr };
  }

  drawScreen() {
    const c = this.screen;
    const { w, h, dpr } = this.fitCanvas(c);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, 0, w, h);
    const v = this.view;
    const toScreen = (bx, by) => [w / 2 + (bx - v.cx) * v.scale, h / 2 + (by - v.cy) * v.scale];
    if (this.image) {
      const [ox, oy] = toScreen(0, 0);
      ctx.imageSmoothingEnabled = v.scale < PX;
      ctx.drawImage(this.imageBitmap || this.image, ox, oy, 256 * v.scale, 256 * v.scale);
      if (!this.reveal) {
        this.updateFog();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.fog, ox, oy, 256 * v.scale, 256 * v.scale);
      }
    } else {
      ctx.fillStyle = '#9a978f';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(t('ui.map.drawing'), 20, 30);
    }
    const s = this.last;
    const pois = this.visiblePoints();
    const size = Math.min(1.3, Math.max(0.7, v.scale / 10));
    for (const p of pois) this.drawPoi(ctx, ...toScreen(p.x, p.y), p, size);
    const { active, targets } = this.jobs();
    for (const j of active) this.drawJob(ctx, ...toScreen(j.x, j.y), j, size);
    for (const t of targets) this.drawTarget(ctx, ...toScreen(t.x, t.y), size);
    const wp = this.waypoint;
    if (wp) this.drawPin(ctx, ...toScreen(wp.x, wp.y), 1, wp.logo);
    const others = this.otherPlayers();
    for (const o of others) {
      const owp = this.coop.waypoints.get(o.slot);
      if (owp) this.drawPin(ctx, ...toScreen(owp.x, owp.y), 1, 0, o.colour);
    }
    for (const o of others) {
      if (!o.onMap) continue;
      const [ox, oy] = toScreen(o.x, o.y);
      this.drawPlayer(ctx, ox, oy, o.heading, 1.25, o.colour);
      this.drawName(ctx, ox, oy - 16, o.name, o.colour);
    }
    if (s && s.hasPlayer) this.drawPlayer(ctx, ...toScreen(s.x, s.y), s.heading, 1.4);
    this.drawLegend(ctx, pois, w, h);
    if (this.coop) this.drawScoreboard(ctx, w - 12, 12, 'right');
    else this.drawJobBriefs(ctx, w, h);
    const hp = this.hover && this.poiNear(this.hover.x, this.hover.y);
    if (hp) {
      const [hx, hy] = toScreen(hp.x, hp.y);
      ctx.font = '13px system-ui, sans-serif';
      const tw = ctx.measureText(hp.name).width + 14;
      ctx.fillStyle = 'rgba(0,0,0,.85)';
      ctx.fillRect(hx + 12, hy - 26, tw, 22);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(hp.name, hx + 19, hy - 15);
    }
    // Keep map instructions above the webpage controls and wrap within the viewport.
    const helpTop = Math.max(0, h - 104), helpHeight = Math.min(62, h);
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(0, helpTop, w, helpHeight);
    ctx.fillStyle = '#e8e6e3';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const dist = wp && s ? t('ui.map.help.waypointDist', { n: new Intl.NumberFormat(lang()).format(Math.round(Math.hypot(wp.x - s.x, wp.y - s.y))) }) : '';
    const help = t('ui.map.help.line', { mode: t(this.reveal ? 'ui.map.help.revealOn' : 'ui.map.help.revealOff'), dist });
    const chunks = help.split(' · '), lines = [];
    let line = '';
    for (const chunk of chunks) {
      const next = line ? `${line} · ${chunk}` : chunk;
      if (line && ctx.measureText(next).width > w - 32) { lines.push(line); line = chunk; }
      else line = next;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, i) => {
      const rtl = /[\u0590-\u05ff]/.test(text);
      ctx.direction = rtl ? 'rtl' : 'ltr';
      ctx.textAlign = rtl ? 'right' : 'left';
      ctx.fillText(text, rtl ? w - 12 : 12, helpTop + 12 + i * 17, w - 24);
    });
  }
  drawLegend(ctx, shown, w, h) {
    const all = this.points();
    const kinds = Object.keys(POI_KINDS).filter((k) => all.some((p) => p.kind === k));
    const { active, targets, onMission } = this.jobs();
    const byGang = new Map();
    for (const j of active) {
      if (!byGang.has(j.gang)) byGang.set(j.gang, []);
      byGang.get(j.gang).push(j);
    }
    const order = [4, 3, 1, 2];
    for (const list of byGang.values()) list.sort((a, b) => order.indexOf(a.colour) - order.indexOf(b.colour));
    const x = 12, y0 = 52, lh = 22, width = 244, headerH = 28;
    const jobRows = [...byGang.values()].reduce((n, l) => n + 1 + l.length, 0) + (targets.length ? 1 : 0) + (onMission ? 1 : 0);
    const contentH = 18 + kinds.length * lh + (jobRows ? 8 + lh + jobRows * lh : 0);
    const maxH = Math.max(110, h - 180);
    const panelH = Math.min(headerH + contentH, maxH);
    const bodyH = Math.max(72, panelH - headerH);
    this.legendBox = { x: x - 6, y: y0 - 18, w: width, h: panelH };
    this.legendMaxScroll = Math.max(0, contentH - bodyH);
    this.legendScroll = Math.max(0, Math.min(this.legendMaxScroll, this.legendScroll || 0));
    ctx.save();
    ctx.font = '13px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.76)';
    ctx.fillRect(this.legendBox.x, this.legendBox.y, width, panelH);
    ctx.fillStyle = '#e8e6e3';
    ctx.direction = lang() === 'he' ? 'rtl' : 'ltr';
    ctx.textAlign = lang() === 'he' ? 'right' : 'left';
    ctx.fillText(t(this.reveal ? 'ui.map.legend.showingAll' : 'ui.map.legend.foundSoFar'), lang() === 'he' ? x + width - 12 : x, y0 - 4, width - 20);
    ctx.beginPath();
    ctx.rect(x - 5, y0 + 9, width - 2, bodyH - 5);
    ctx.clip();
    this.legendHits = [];
    let y = y0 + 18 - this.legendScroll;
    for (const k of kinds) {
      this.drawPoi(ctx, x + 9, y, { kind: k }, 0.85);
      const found = shown.filter((p) => p.kind === k).length, total = all.filter((p) => p.kind === k).length;
      const count = this.reveal ? `${total}` : `${found} / ${total}`;
      // Keep the numeric counter in left-to-right order inside Hebrew map labels.
      const label = `${POI_KINDS[k].label}  \u2066${count}\u2069`;
      ctx.fillStyle = '#e8e6e3';
      ctx.direction = /[\u0590-\u05ff]/.test(label) ? 'rtl' : 'ltr';
      ctx.textAlign = ctx.direction === 'rtl' ? 'right' : 'left';
      ctx.fillText(label, ctx.direction === 'rtl' ? x + width - 10 : x + 26, y, width - 42);
      y += lh;
    }
    if (jobRows) {
      y += 8;
      const heading = t(onMission ? 'ui.map.legend.onMission' : 'ui.map.legend.gangJobs');
      ctx.fillStyle = '#e8e6e3'; ctx.direction = lang() === 'he' ? 'rtl' : 'ltr'; ctx.textAlign = lang() === 'he' ? 'right' : 'left';
      ctx.fillText(heading, lang() === 'he' ? x + width - 10 : x, y, width - 20);
      y += lh;
      if (targets.length) {
        this.drawTarget(ctx, x + 9, y, 0.8);
        const label = targets.length > 1 ? t('ui.map.missionTargetsN', { n: targets.length }) : t('ui.map.missionTarget');
        ctx.fillStyle = '#fff'; ctx.direction = lang() === 'he' ? 'rtl' : 'ltr'; ctx.textAlign = lang() === 'he' ? 'right' : 'left';
        ctx.fillText(label, lang() === 'he' ? x + width - 10 : x + 26, y, width - 42);
        if (y >= y0 + 14 && y < y0 + panelH - 10) this.legendHits.push({ x: x - 6, y: y - lh / 2, w: width, h: lh, job: targets[0] });
        y += lh;
      }
      for (const [gang, list] of byGang) {
        if (!this.drawSprite(ctx, list[0].logo, x + 9, y, 16)) this.drawJob(ctx, x + 9, y, list[0], 0.8);
        ctx.fillStyle = '#9a978f'; ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.fillText(gang || t('ui.map.legend.jobs'), x + 26, y, width - 42);
        y += lh;
        for (const j of list) {
          this.drawJob(ctx, x + 17, y, j, 0.8);
          const label = JOBS[j.colour].label;
          ctx.fillStyle = this.wp && this.wp.x === j.x && this.wp.y === j.y ? '#ffd23f' : '#e8e6e3';
          ctx.direction = lang() === 'he' ? 'rtl' : 'ltr'; ctx.textAlign = lang() === 'he' ? 'right' : 'left';
          ctx.fillText(label, lang() === 'he' ? x + width - 10 : x + 34, y, width - 50);
          if (y >= y0 + 14 && y < y0 + panelH - 10) this.legendHits.push({ x: x - 6, y: y - lh / 2, w: width, h: lh, job: j });
          y += lh;
        }
      }
    }
    ctx.restore();
  }
  /**
   * The current job's instructions: the briefs shown on screen during it (port/platform/jobs_web.cpp),
   * newest first. Outside a job, the latest messages.
   */
  jobBriefs() {
    const M = this.Module;
    const p = M.ccall('gta2_port_job_briefs', 'number', [], []);
    const head = M.HEAP32.subarray(p >> 2, (p >> 2) + 10); // [on a job, count, face x 8]
    const shownAt = M.HEAPF64.subarray((p + 40) >> 3, ((p + 40) >> 3) + 8);
    const briefs = [];
    for (let i = 0; i < head[1]; i++) {
      let text = '';
      // after the faces and 8 shownAt doubles: 8 texts of 320 UTF-16 units
      for (let o = (p + 104) / 2 + i * 320, n = 0; n < 320 && M.HEAPU16[o + n]; n++) text += String.fromCharCode(M.HEAPU16[o + n]);
      let gxtKey = '';
      const keyStart = p + 104 + 8 * 320 * 2 + i * 8;
      for (let n = 0; n < 8 && M.HEAPU8[keyStart + n]; n++) gxtKey += String.fromCharCode(M.HEAPU8[keyStart + n]);
      briefs.push({ face: head[2 + i], shownAt: shownAt[i], gxtKey, source: text, text: text.replace(/#/g, '').replace(/\s+/g, ' ').trim() }); // #...# marks highlighted words
    }
    const active = M.HEAP32[(p + 104 + 8 * 320 * 2 + 8 * 8) >> 2] !== 0;
    return { onJob: !!head[0], active, briefs: briefs.filter((b) => b.text).reverse() };
  }

  drawJobBriefs(ctx, w, h) {
    const { onJob, briefs } = this.jobBriefs();
    if (!briefs.length) { this.jobBriefBox = null; return; }
    ctx.save(); ctx.font = '13px system-ui, sans-serif'; ctx.textBaseline = 'top';
    const width = Math.min(390, Math.max(236, w * 0.34)), pad = 10, lh = 18;
    const x = w - 12 - width, yTop = 12, headerH = 36;
    const wrap = (text, maxWidth) => {
      const words = text.split(/\s+/), lines = []; let line = '';
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
      }
      if (line) lines.push(line); return lines;
    };
    const rows = [];
    for (const b of briefs) {
      const who = SPEAKERS[b.face] ? t(SPEAKERS[b.face]) : null;
      const translated = missionText(b.source, { gxtKey: b.gxtKey });
      const text = who ? `${who}: ${translated.text}` : translated.text;
      rows.push({ lines: wrap(text, width - 2 * pad - 4), rtl: translated.translated && /[\u0590-\u05ff]/.test(text) });
    }
    const contentH = rows.reduce((n, r) => n + r.lines.length * lh + 8, 0);
    const panelH = Math.max(95, Math.min(h - 132, headerH + contentH)), bodyH = Math.max(50, panelH - headerH);
    this.jobBriefBox = { x, y: yTop, w: width, h: panelH };
    this.jobBriefMaxScroll = Math.max(0, contentH - bodyH);
    this.jobBriefScroll = Math.max(0, Math.min(this.jobBriefMaxScroll, this.jobBriefScroll || 0));
    ctx.fillStyle = 'rgba(0,0,0,.76)'; ctx.fillRect(x, yTop, width, panelH);
    ctx.fillStyle = onJob ? '#ffd23f' : '#9a978f'; ctx.font = '600 13px system-ui, sans-serif';
    ctx.direction = lang() === 'he' ? 'rtl' : 'ltr'; ctx.textAlign = lang() === 'he' ? 'right' : 'left';
    ctx.fillText(t(onJob ? 'ui.map.briefs.currentJob' : 'ui.map.briefs.messages'), lang() === 'he' ? x + width - pad : x + pad, yTop + pad);
    ctx.beginPath(); ctx.rect(x + pad, yTop + headerH, width - 2 * pad, bodyH - 2); ctx.clip();
    let y = yTop + headerH - this.jobBriefScroll;
    rows.forEach((row, i) => {
      ctx.font = '13px system-ui, sans-serif'; ctx.direction = row.rtl ? 'rtl' : 'ltr'; ctx.textAlign = row.rtl ? 'right' : 'left';
      ctx.fillStyle = i === 0 ? '#fff' : '#aaa59a';
      for (const line of row.lines) { ctx.fillText(line, row.rtl ? x + width - pad : x + pad, y, width - 2 * pad); y += lh; }
      y += 8;
    });
    ctx.restore();
  }
  /** A gang job phone: the gang's logo with the job's difficulty triangle (HUD sprites). */
  drawJob(ctx, x, y, j, size = 1) {
    const h = 18 * size;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, h * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.65)';
    ctx.fill();
    ctx.lineWidth = 2 * size;
    ctx.strokeStyle = JOBS[j.colour].colour;
    ctx.stroke();
    ctx.restore();
    if (!this.drawSprite(ctx, j.logo, x, y, h * 0.8)) {
      ctx.fillStyle = JOBS[j.colour].colour;
      ctx.fillRect(x - h / 3, y - h / 3, (2 * h) / 3, (2 * h) / 3);
    }
    if (JOBS[j.colour].dot) this.drawSprite(ctx, JOBS[j.colour].dot, x + h * 0.45, y - h * 0.45, 8 * size);
  }

  /** The current mission target: a pulsing ring. */
  drawTarget(ctx, x, y, size = 1) {
    const t = (performance.now() % 1000) / 1000;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, (7 + 5 * t) * size, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,59,59,${1 - t})`;
    ctx.lineWidth = 3 * size;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 5 * size, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3b3b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 * size;
    ctx.stroke();
    ctx.restore();
  }

  // ---- minimap and main-view arrow --------------------------------------

  drawOverlay(s) {
    const vp = s && s.hasPlayer ? this.gameViewport() : null;
    // the radar, on its own canvas just around it
    const radarOn = !!(vp && this.minimapOn && this.image);
    if (this.radar.hidden !== !radarOn) this.radar.hidden = !radarOn;
    if (radarOn) this.drawMinimap(s, vp);
    // the rest only when there is something to show
    const wp = vp && this.waypoint;
    const wpNear = !!(wp && Math.hypot(wp.x - s.x, wp.y - s.y) <= 50);
    const others = vp && this.coop ? this.otherPlayers().filter((o) => o.onMap) : [];
    const needed = !!vp && (wpNear || others.length > 0 || (this.coop && this.showScores));
    if (this.overlay.hidden !== !needed) this.overlay.hidden = !needed;
    if (!needed) return;
    const c = this.overlay;
    const { w, h, dpr } = this.fitCanvas(c);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (wpNear) this.drawWaypointOnView(ctx, s, wp, vp);
    if (this.coop) {
      this.drawNamesOnView(ctx, s, vp);
      if (this.showScores) this.drawScoreboard(ctx, vp.x + vp.w / 2, vp.y + vp.h * 0.22, 'center');
    }
  }

  /** Co-op: the other players (empty outside a co-op match). */
  otherPlayers() {
    if (!this.coop) return [];
    if (!this.playersAt || performance.now() - this.playersAt > 4) {
      this.players = this.coop.players();
      this.playersAt = performance.now();
    }
    // allies always; in Gang Wars and free-for-all, enemies only when they are close (the hunt)
    const me = this.last;
    return this.players.filter((p) => !p.me && p.inGame &&
      (p.ally || !me || !me.hasPlayer || Math.hypot(p.x - me.x, p.y - me.y) <= ENEMY_RANGE));
  }

  /** Co-op: each other player's name above them in the game view. */
  drawNamesOnView(ctx, s, vp) {
    const perBlock = (640 * s.zoom) / Math.max(1, s.camZ - s.z + 8);
    const k = vp.w / vp.refW;
    for (const o of this.otherPlayers()) {
      if (!o.onMap) continue;
      const x = vp.x + vp.w / 2 + (o.x - s.camX) * perBlock * k;
      const y = vp.y + vp.h / 2 + (o.y - s.camY) * perBlock * k - 26 * k;
      if (x < vp.x || x > vp.x + vp.w || y < vp.y || y > vp.y + vp.h) continue;
      this.drawName(ctx, x, y, o.name, o.colour);
    }
  }

  drawName(ctx, x, y, name, colour) {
    ctx.save();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(name, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(name, x, y);
    ctx.restore();
  }

  /** Co-op: the mode's standings (Tab in the game; always on the map screen). */
  drawScoreboard(ctx, x, y, align) {
    const { title, columns, rows } = this.coop.standings();
    const xs = [0, 190, 245, 310];
    const width = 420, lh = 23, height = 58 + rows.length * lh + 8;
    const left = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    ctx.save();
    ctx.fillStyle = 'rgba(8,9,12,.9)';
    ctx.fillRect(left, y, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.strokeRect(left + 0.5, y + 0.5, width - 1, height - 1);
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#f5c518';
    ctx.fillText(title, left + 14, y + 17);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#9a978f';
    columns.forEach((c, i) => ctx.fillText(c, left + 14 + xs[i], y + 42));
    rows.forEach((r, i) => {
      const ry = y + 58 + i * lh + lh / 2;
      ctx.fillStyle = r.colour || '#eee';
      ctx.fillRect(left + 14, ry - 5, 4, 10);
      ctx.font = `${r.strong ? 'bold ' : ''}14px system-ui, sans-serif`;
      r.cells.forEach((cell, c) => {
        ctx.fillStyle = c === 0 && r.colour ? r.colour : '#eee';
        ctx.fillText(String(cell), left + 14 + xs[c] + (c === 0 ? 10 : 0), ry);
      });
    });
    ctx.restore();
  }


  /** The game view's rectangle in CSS pixels and reference pixels per block at the player's height. */
  gameViewport() {
    const r = this.renderer;
    const cr = this.gameCanvas.getBoundingClientRect();
    if (!r.viewport || !cr.width) return null;
    const dpr = this.gameCanvas.width / cr.width;
    const vp = r.viewport;
    return { x: cr.left + vp.x / dpr, y: cr.top + vp.y / dpr, w: vp.w / dpr, h: vp.h / dpr, refW: r.refW || 640 };
  }

  /**
   * The radar: a round, north-up minimap in the bottom-right corner of the game
   * view (inspired by the GTA radar). Things outside it - the waypoint, gang
   * and mission arrows - sit on its rim, pointing their way.
   */
  drawMinimap(s, vp) {
    const r = Math.round(Math.min(105, Math.max(56, vp.h * 0.15))); // inner radius
    const border = Math.max(5, Math.round(r * 0.11));
    const cx = vp.x + vp.w - r - border - 14, cy = vp.y + vp.h - r - border - 14;
    // the radar canvas covers the circle and the markers on its rim; drawing uses page coordinates
    const extent = Math.ceil(r + border * 4 + 12);
    const left = Math.round(cx - extent), top = Math.round(cy - extent), size = extent * 2;
    const c = this.radar;
    const dpr = window.devicePixelRatio || 1;
    if (c.style.left !== `${left}px`) c.style.left = `${left}px`;
    if (c.style.top !== `${top}px`) c.style.top = `${top}px`;
    if (c.style.width !== `${size}px`) { c.style.width = `${size}px`; c.style.height = `${size}px`; }
    const px = Math.round(size * dpr);
    if (c.width !== px) { c.width = px; c.height = px; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
    ctx.clearRect(left, top, size, size);
    const scale = Math.max(7, r / 9); // pixels per block: about 18 blocks across
    const half = r / scale;
    ctx.save();
    // map, clipped to the circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0c0f';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    const t0 = performance.now();
    ctx.drawImage(this.imageBitmap || this.image, (s.x - half) * PX, (s.y - half) * PX, 2 * half * PX, 2 * half * PX, cx - r, cy - r, 2 * r, 2 * r);
    const t1 = performance.now();
    if (!this.reveal) {
      this.updateFog();
      ctx.drawImage(this.fog, s.x - half, s.y - half, 2 * half, 2 * half, cx - r, cy - r, 2 * r, 2 * r);
    }
    const t2 = performance.now();
    if (this.perf) { this.perf.image += t1 - t0; this.perf.fog += t2 - t1; }
    // markers inside
    for (const p of this.visiblePoints()) {
      const dx = (p.x - s.x) * scale, dy = (p.y - s.y) * scale;
      if (Math.hypot(dx, dy) < r - 6) this.drawPoi(ctx, cx + dx, cy + dy, p, 0.55);
    }
    ctx.restore();
    // thick black border, with a thin light edge inside
    ctx.beginPath();
    ctx.arc(cx, cy, r + border / 2, 0, Math.PI * 2);
    ctx.lineWidth = border;
    ctx.strokeStyle = '#050505';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.stroke();
    const rim = r + border / 2;
    // north marker on the rim
    ctx.beginPath();
    ctx.arc(cx, cy - rim, border * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = '#050505';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(border * 1.5)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - rim + 0.5);
    ctx.textAlign = 'start';

    // Inside: drawn where it is. Outside: on the rim, at its bearing.
    const place = (wx, wy) => {
      const dx = (wx - s.x) * scale, dy = (wy - s.y) * scale;
      const d = Math.hypot(dx, dy);
      if (d < r - 8) return { x: cx + dx, y: cy + dy, inside: true, angle: Math.atan2(dy, dx) };
      const a = Math.atan2(dy, dx);
      return { x: cx + Math.cos(a) * rim, y: cy + Math.sin(a) * rim, inside: false, angle: a };
    };
    // The game's gang/mission arrows (moved here from around the player): the same targets the HUD
    // would show now (the game's own visibility decision), mission targets always.
    const { jobs, targets } = this.jobs();
    for (const m of [...jobs.filter((j) => j.shown).map((j) => ({ ...j, job: true })), ...targets]) {
      const at = place(m.x, m.y);
      if (at.inside) {
        if (m.job) this.drawJob(ctx, at.x, at.y, m, 0.55);
        else this.drawTarget(ctx, at.x, at.y, 0.65);
      } else {
        // the original arrow sprite (tip up when unrotated) on the rim, pointing out, with the difficulty triangle
        const angle = at.angle + Math.PI / 2;
        if (this.drawSprite(ctx, m.job ? m.arrowSprite || 7 : m.arrowSprite ?? 7, at.x, at.y, Math.max(18, border * 3), angle)) {
          if (m.job && JOBS[m.colour].dot) this.drawSprite(ctx, JOBS[m.colour].dot, at.x, at.y, 6, angle);
        } else {
          this.drawArrow(ctx, at.x, at.y, at.angle, 8, m.job ? JOBS[m.colour].colour : '#ff3b3b');
        }
      }
    }
    // co-op: the others' waypoints (inside only) and the others, in their colours (on the rim when far)
    const others = this.otherPlayers();
    for (const o of others) {
      const owp = this.coop.waypoints.get(o.slot);
      if (!owp) continue;
      const at = place(owp.x, owp.y);
      if (at.inside) this.drawPin(ctx, at.x, at.y, 0.6, 0, o.colour);
    }
    for (const o of others) {
      if (!o.onMap) continue;
      const at = place(o.x, o.y);
      if (at.inside) this.drawPlayer(ctx, at.x, at.y, o.heading, 0.7, o.colour);
      else {
        ctx.beginPath();
        ctx.arc(at.x, at.y, Math.max(6, border * 1.1), 0, Math.PI * 2);
        ctx.fillStyle = o.colour;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#050505';
        ctx.stroke();
      }
    }
    // the waypoint: a pin inside, or a marker (with the gang logo for a job) on the rim
    const wp = this.waypoint;
    if (wp) {
      const at = place(wp.x, wp.y);
      if (at.inside) this.drawPin(ctx, at.x, at.y, 0.7, wp.logo);
      else {
        const rr = Math.max(9, border * 1.6);
        ctx.beginPath();
        ctx.arc(at.x, at.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = '#050505';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffd23f';
        ctx.stroke();
        if (!(wp.logo && this.drawSprite(ctx, wp.logo, at.x, at.y, rr * 1.35))) {
          this.drawArrow(ctx, at.x, at.y, at.angle, rr * 0.7);
        }
      }
    }
    this.drawPlayer(ctx, cx, cy, s.heading, 0.85);
    ctx.restore();
  }

  /**
   * Waypoint marker in the game view, or an arrow at the view's edge pointing
   * to it, once the player is within 50 blocks (farther out, the minimap guides).
   */
  drawWaypointOnView(ctx, s, wp, vp) {
    if (Math.hypot(wp.x - s.x, wp.y - s.y) > 50) return;
    // The game's projection: reference px per block = 640 * zoom / (cameraZ - z + 8).
    const perBlock = (640 * s.zoom) / Math.max(1, s.camZ - s.z + 8);
    const k = vp.w / vp.refW; // CSS px per reference px
    const cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2;
    const dx = (wp.x - s.camX) * perBlock * k, dy = (wp.y - s.camY) * perBlock * k;
    // Keep the arrow inside the view and below the HUD band (top 70 reference px).
    const margin = 28, top = Math.max(margin, 70 * k);
    const limX = vp.w / 2 - margin;
    const limUp = vp.h / 2 - top, limDown = vp.h / 2 - margin;
    const dist = Math.round(Math.hypot(wp.x - s.x, wp.y - s.y));
    if (Math.abs(dx) <= limX && dy >= -limUp && dy <= limDown) {
      if (dist >= 1) this.drawPin(ctx, cx + dx, cy + dy, 1, wp.logo);
      return;
    }
    const f = Math.min(limX / Math.abs(dx || 1e-6), (dy < 0 ? limUp : limDown) / Math.abs(dy || 1e-6));
    const ax = cx + dx * f, ay = cy + dy * f;
    this.drawArrow(ctx, ax, ay, Math.atan2(dy, dx), 14);
    if (wp.logo) this.drawSprite(ctx, wp.logo, ax - Math.cos(Math.atan2(dy, dx)) * 26, ay - Math.sin(Math.atan2(dy, dx)) * 26 - 18, 18);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    const tx = ax - Math.cos(Math.atan2(dy, dx)) * 26, ty = ay - Math.sin(Math.atan2(dy, dx)) * 26;
    ctx.strokeText(`${dist}`, tx, ty);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`${dist}`, tx, ty);
    ctx.textAlign = 'start';
  }

  drawPlayer(ctx, x, y, heading, size, colour = '#ffffff') {
    // heading: direction (sin a, cos a) in map coordinates (x right, y down)
    const dx = Math.sin(heading), dy = Math.cos(heading);
    const r = 9 * size;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.7, r * 0.65);
    ctx.lineTo(-r * 0.35, 0);
    ctx.lineTo(-r * 0.7, -r * 0.65);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  drawPin(ctx, x, y, size, logo = 0, colour = '#ffd23f') {
    if (logo && this.sprite(logo)) {
      // a gang job: the gang's logo on a pin
      const r = 11 * size;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y - r * 1.7, r, Math.PI * 0.8, Math.PI * 0.2);
      ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - r * 1.7, r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.restore();
      this.drawSprite(ctx, logo, x, y - r * 1.7, r * 1.35);
      return;
    }
    const r = 7 * size;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y - r * 1.6, r, Math.PI * 0.85, Math.PI * 0.15);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - r * 1.6, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
  }

  drawArrow(ctx, x, y, angle, r, colour = '#ffd23f') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(-r * 0.8, r * 0.75);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r * 0.8, -r * 0.75);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  setMinimap(on) {
    this.minimapOn = on;
    saveJson(MINIMAP_KEY, on);
    this.applyHudArrows();
  }

  /** The game's own gang/mission arrows are drawn only while the minimap (which shows them) is off. */
  applyHudArrows() {
    this.Module.ccall('gta2_port_set_hud_arrows', null, ['number'], [this.minimapOn ? 0 : 1]);
  }
}
