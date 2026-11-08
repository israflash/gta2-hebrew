// Localized display names for the game's named street gangs. Unknown/custom
// crew names are intentionally preserved exactly as entered by the players.
const HEBREW_GANG_NAMES = new Map([
  ['Zaibatsu', 'זייבאצו'],
  ['Loonies', 'לוניז'],
  ['Yakuza', 'יאקוזה'],
  ['Rednecks', 'רדנקס'],
  ['SRS Scientists', 'מדעני SRS'],
  ['Russians', 'רוסים'],
  ['Hare Krishnas', 'קרישנה'],
]);

export function gangDisplayName(name, language = 'en') {
  if (language !== 'he' || typeof name !== 'string') return name;
  return HEBREW_GANG_NAMES.get(name) || name;
}
