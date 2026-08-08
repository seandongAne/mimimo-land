const MAX_COORDINATE = 1_000;
const MAX_CONTRIBUTORS = 5;
const MAX_NAME_LENGTH = 24;
const MAX_ID_LENGTH = 80;

const LOCATION_KEY = '[A-Za-z0-9][A-Za-z0-9_-]{0,31}';
const LOCATION_PATTERN = new RegExp(
  `^(?:world|cloudland|underwater|shop:${LOCATION_KEY}|venue:${LOCATION_KEY}|house:${LOCATION_KEY}:floor:[1-3])$`,
);

function combo(title, emoji, casts) {
  return Object.freeze({
    title,
    emoji,
    casts: Object.freeze(casts.map((cast) => Object.freeze({ ...cast }))),
  });
}

/**
 * Stable, presentation-only recipes. The server decides when a combination
 * has happened; this table only turns that trusted recipe id into effects.
 */
export const COOPERATIVE_MAGIC_COMBOS = Object.freeze({
  'rainbow-garden': combo('Rainbow Garden', '🌈🌸', [
    { power: 'water', delayMs: 0 },
    { power: 'leaves', delayMs: 140 },
    { power: 'blossom', delayMs: 280 },
    { power: 'rainbow', delayMs: 440 },
  ]),
  'sky-bridge': combo('Sky Bridge', '☁️🌈', [
    { power: 'cloud', delayMs: 0 },
    { power: 'levitation', delayMs: 160 },
    { power: 'rainbow', delayMs: 340 },
    { power: 'cloud', delayMs: 500 },
  ]),
  'friendship-fountain': combo('Friendship Fountain', '⛲💖', [
    { power: 'water', delayMs: 0 },
    { power: 'bubbles', delayMs: 140 },
    { power: 'hearts', delayMs: 300 },
    { power: 'rainbow', delayMs: 460 },
  ]),
});

export const COOPERATIVE_MAGIC_COMBO_IDS = Object.freeze(
  Object.keys(COOPERATIVE_MAGIC_COMBOS),
);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validLocationId(value) {
  return typeof value === 'string' && LOCATION_PATTERN.test(value);
}

function validCoordinate(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value) <= MAX_COORDINATE;
}

function validId(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_ID_LENGTH
    && /^[A-Za-z0-9_.:-]+$/.test(value);
}

function validatedPosition(value) {
  if (!isPlainObject(value)) return null;
  if (!validCoordinate(value.x) || !validCoordinate(value.y) || !validCoordinate(value.z)) {
    return null;
  }
  return { x: value.x, y: value.y, z: value.z };
}

function safeName(value) {
  if (typeof value !== 'string') return '';
  let cleaned = value;
  try { cleaned = cleaned.normalize('NFC'); } catch { /* keep the original text */ }
  return Array.from(cleaned
    .replace(/<[^>]*>/gu, ' ')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ')
    .replace(/[<>&]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim())
    .slice(0, MAX_NAME_LENGTH)
    .join('');
}

function validatedContributorNames(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_CONTRIBUTORS) return null;
  const names = [];
  const playerIds = new Set();
  for (const contributor of value) {
    if (!isPlainObject(contributor)) return null;
    if (!validId(contributor.playerId) || playerIds.has(contributor.playerId)) return null;
    const name = safeName(contributor.name);
    if (!name) return null;
    playerIds.add(contributor.playerId);
    names.push(name);
  }
  return names;
}

function contributorText(names) {
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} + ${names.at(-1)}`;
}

function defaultSchedule(callback, delayMs) {
  return setTimeout(callback, delayMs);
}

/**
 * Plays a server-confirmed cooperative-magic event in the matching scene.
 *
 * Expected event shape:
 *   { comboId, type, locationId, position: { x, y, z },
 *     contributors: [{ playerId, name }, ...] }
 *
 * Returns false for malformed or off-location network data. `announce` is
 * handed plain, sanitized text; this module never writes HTML.
 */
export function playCooperativeMagicCombo(event, {
  getMagicForLocation,
  getCurrentLocationId,
  announce,
  schedule = defaultSchedule,
} = {}) {
  if (!isPlainObject(event)) return false;
  if (!validId(event.comboId) || typeof event.type !== 'string') return false;
  if (!Object.hasOwn(COOPERATIVE_MAGIC_COMBOS, event.type)) return false;
  const recipe = COOPERATIVE_MAGIC_COMBOS[event.type];
  if (!validLocationId(event.locationId)) return false;

  const position = validatedPosition(event.position);
  const names = validatedContributorNames(event.contributors);
  if (!position || !names) return false;
  if (typeof getMagicForLocation !== 'function' || typeof getCurrentLocationId !== 'function') {
    return false;
  }
  if (announce !== undefined && typeof announce !== 'function') return false;
  if (typeof schedule !== 'function') return false;

  let currentLocationId;
  let initialMagic;
  try {
    currentLocationId = getCurrentLocationId();
    if (currentLocationId !== event.locationId) return false;
    initialMagic = getMagicForLocation(event.locationId);
  } catch {
    return false;
  }
  if (!initialMagic || typeof initialMagic.cast !== 'function') return false;

  const castStep = (power, initial = false) => {
    try {
      if (getCurrentLocationId() !== event.locationId) return false;
      const magic = initial ? initialMagic : getMagicForLocation(event.locationId);
      if (!magic || typeof magic.cast !== 'function') return false;
      magic.cast({ ...position }, power);
      return true;
    } catch {
      return false;
    }
  };

  const [firstCast, ...delayedCasts] = recipe.casts;
  if (!castStep(firstCast.power, true)) return false;

  for (const cast of delayedCasts) {
    let pending = true;
    try {
      schedule(() => {
        if (!pending) return;
        pending = false;
        castStep(cast.power);
      }, cast.delayMs);
    } catch {
      pending = false;
    }
  }

  if (announce) {
    try {
      announce(`${recipe.emoji} ${contributorText(names)} made a ${recipe.title}!`);
    } catch {
      // A visual combo should keep playing even if its optional UI notice fails.
    }
  }
  return true;
}
