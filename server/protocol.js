export const PROTOCOL_VERSION = 1;

export const MAX_PLAYERS = 5;
export const MAX_FURNITURE_PER_LOCATION = 200;
export const EMPTY_SESSION_TTL_MS = 5 * 60 * 1000;
export const CLEANUP_INTERVAL_MS = 30 * 1000;

export const SESSION_CODE_LENGTH = 6;
export const SESSION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const SPECIES = Object.freeze([
  'bunny',
  'kitty',
  'puppy',
  'bear',
  'foxy',
  'ducky',
  'blob',
  'squid',
  'fairy',
  'dragon',
  'unicorn',
  'phoenix',
]);

export const SHAPES = Object.freeze(['classic', 'circle']);

export const COLORS = Object.freeze([
  '#ff9ed2', '#ff6fae', '#ffc2e2', '#ff8f8f',
  '#ff7043', '#ffb46b', '#ffd54f', '#ffe066',
  '#eaf06b', '#a8e85c', '#8ee08e', '#5fd6b0',
  '#7ad0ff', '#5fb0ff', '#8aa8ff', '#b79cff',
  '#c98cff', '#e79cff', '#c9a27a', '#fdf3e7',
]);

export const ACTION_IDS = Object.freeze(['wave', 'phrase', 'magic']);
export const PHRASE_IDS = Object.freeze(['hello', 'lets-play', 'follow-me', 'great-job']);
export const MAGIC_POWERS = Object.freeze([
  'blossom',
  'rainbow',
  'bubbles',
  'hearts',
  'levitation',
  'teleport',
  'water',
  'fire',
  'cloud',
  'leaves',
]);

export const FURNITURE_KINDS = Object.freeze([
  'bed',
  'sofa',
  'chair',
  'table',
  'lamp',
  'plant',
  'tv',
  'rug',
  'toy',
  'balloon',
]);

export const FURNITURE_COLORS = Object.freeze([
  '#ff9ed2',
  '#ffb46b',
  '#ffe066',
  '#8ee08e',
  '#7ad0ff',
  '#b79cff',
  '#ff8f8f',
  '#c8a2ff',
]);

export const CLIENT_EVENTS = Object.freeze([
  'session:create',
  'session:join',
  'session:leave',
  'player:profile',
  'player:pose',
  'player:action',
  'furniture:add',
  'furniture:remove',
  'furniture:clear',
]);

export const SERVER_EVENTS = Object.freeze([
  'session:created',
  'session:joined',
  'session:error',
  'player:joined',
  'player:updated',
  'player:left',
  'player:action',
  'furniture:added',
  'furniture:removed',
  'furniture:cleared',
]);

export const RATE_LIMITS = Object.freeze({
  'session:create': Object.freeze({ limit: 5, windowMs: 60_000 }),
  'session:join': Object.freeze({ limit: 20, windowMs: 60_000 }),
  'session:leave': Object.freeze({ limit: 10, windowMs: 10_000 }),
  'player:profile': Object.freeze({ limit: 10, windowMs: 10_000 }),
  'player:pose': Object.freeze({ limit: 40, windowMs: 1_000 }),
  'player:action': Object.freeze({ limit: 8, windowMs: 2_000 }),
  'furniture:add': Object.freeze({ limit: 30, windowMs: 10_000 }),
  'furniture:remove': Object.freeze({ limit: 30, windowMs: 10_000 }),
  'furniture:clear': Object.freeze({ limit: 10, windowMs: 10_000 }),
});

export const LIMITS = Object.freeze({
  nameLength: 24,
  playerIdLength: 80,
  locationIdLength: 96,
  itemIdLength: 80,
  coordinate: 1_000,
  furnitureCoordinate: 20,
  rotation: Math.PI * 8,
});

const SPECIES_SET = new Set(SPECIES);
const SHAPES_SET = new Set(SHAPES);
const COLORS_SET = new Set(COLORS);
const ACTION_IDS_SET = new Set(ACTION_IDS);
const PHRASE_IDS_SET = new Set(PHRASE_IDS);
const MAGIC_POWERS_SET = new Set(MAGIC_POWERS);
const FURNITURE_KINDS_SET = new Set(FURNITURE_KINDS);
const FURNITURE_COLORS_SET = new Set(FURNITURE_COLORS);

export class ProtocolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProtocolError(code, message);
}

export function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function requireObject(value, label = 'payload') {
  if (!isPlainObject(value)) fail('INVALID_PAYLOAD', `${label} must be an object`);
  return value;
}

export function validateProtocol(payload) {
  requireObject(payload);
  if (payload.protocolVersion !== PROTOCOL_VERSION) {
    fail('INVALID_PROTOCOL_VERSION', `protocolVersion must be ${PROTOCOL_VERSION}`);
  }
}

function normalizedString(value, label, maxLength, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') fail('INVALID_PAYLOAD', `${label} must be a string`);
  const normalized = value.trim();
  const length = Array.from(normalized).length;
  if ((!allowEmpty && length === 0) || length > maxLength) {
    fail('INVALID_PAYLOAD', `${label} must contain ${allowEmpty ? 'at most' : 'between 1 and'} ${maxLength} characters`);
  }
  return normalized;
}

export function validatePlayerId(playerId) {
  const normalized = normalizedString(playerId, 'playerId', LIMITS.playerIdLength);
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    fail('INVALID_PLAYER_ID', 'playerId contains unsupported characters');
  }
  return normalized;
}

export function validateSessionCode(sessionCode) {
  const normalized = normalizedString(sessionCode, 'sessionCode', SESSION_CODE_LENGTH).toUpperCase();
  const pattern = new RegExp(`^[${SESSION_CODE_ALPHABET}]{${SESSION_CODE_LENGTH}}$`);
  if (!pattern.test(normalized)) {
    fail('INVALID_SESSION_CODE', 'sessionCode must be a valid 6-character room code');
  }
  return normalized;
}

export function validateProfile(profile, { partial = false } = {}) {
  requireObject(profile, 'profile');
  const normalized = {};

  if (!partial || Object.hasOwn(profile, 'name')) {
    normalized.name = normalizedString(profile.name, 'profile.name', LIMITS.nameLength);
  }
  if (!partial || Object.hasOwn(profile, 'species')) {
    if (typeof profile.species !== 'string' || !SPECIES_SET.has(profile.species)) {
      fail('INVALID_PROFILE', 'profile.species is not supported');
    }
    normalized.species = profile.species;
  }
  if (!partial || Object.hasOwn(profile, 'color')) {
    if (typeof profile.color !== 'string' || !COLORS_SET.has(profile.color.toLowerCase())) {
      fail('INVALID_PROFILE', 'profile.color is not supported');
    }
    normalized.color = profile.color.toLowerCase();
  }
  if (!partial || Object.hasOwn(profile, 'shape')) {
    if (typeof profile.shape !== 'string' || !SHAPES_SET.has(profile.shape)) {
      fail('INVALID_PROFILE', 'profile.shape is not supported');
    }
    normalized.shape = profile.shape;
  }

  if (partial && Object.keys(normalized).length === 0) {
    fail('INVALID_PROFILE', 'profile must include at least one supported field');
  }
  return normalized;
}

export function validateLocationId(locationId, { houseOnly = false } = {}) {
  const normalized = normalizedString(locationId, 'locationId', LIMITS.locationIdLength);
  const key = '[A-Za-z0-9][A-Za-z0-9_-]{0,31}';
  const housePattern = new RegExp(`^house:${key}:floor:[1-3]$`);
  const valid = housePattern.test(normalized)
    || (!houseOnly && (
      normalized === 'world'
      || normalized === 'cloudland'
      || normalized === 'underwater'
      || new RegExp(`^shop:${key}$`).test(normalized)
      || new RegExp(`^venue:${key}$`).test(normalized)
    ));
  if (!valid) fail('INVALID_LOCATION', `locationId is not a valid ${houseOnly ? 'house floor' : 'game'} location`);
  return normalized;
}

function finiteNumber(value, label, absoluteLimit) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > absoluteLimit) {
    fail('INVALID_PAYLOAD', `${label} is outside the allowed range`);
  }
  return value;
}

export function validatePose(payload) {
  requireObject(payload);
  if (!Number.isSafeInteger(payload.seq) || payload.seq < 0) {
    fail('INVALID_POSE', 'seq must be a non-negative safe integer');
  }
  if (typeof payload.moving !== 'boolean' || typeof payload.flying !== 'boolean') {
    fail('INVALID_POSE', 'moving and flying must be booleans');
  }
  return {
    seq: payload.seq,
    locationId: validateLocationId(payload.locationId),
    x: finiteNumber(payload.x, 'x', LIMITS.coordinate),
    y: finiteNumber(payload.y, 'y', LIMITS.coordinate),
    z: finiteNumber(payload.z, 'z', LIMITS.coordinate),
    rotation: finiteNumber(payload.rotation, 'rotation', LIMITS.rotation),
    moving: payload.moving,
    flying: payload.flying,
  };
}

export function validateAction(payload) {
  requireObject(payload);
  const actionId = payload.actionId;
  if (typeof actionId !== 'string' || !ACTION_IDS_SET.has(actionId)) {
    fail('INVALID_ACTION', 'actionId is not supported');
  }
  const locationId = validateLocationId(payload.locationId);
  const actionPayload = requireObject(payload.payload, 'payload.payload');

  if (actionId === 'wave') return { actionId, locationId, payload: {} };

  if (actionId === 'phrase') {
    if (typeof actionPayload.phraseId !== 'string' || !PHRASE_IDS_SET.has(actionPayload.phraseId)) {
      fail('INVALID_ACTION', 'phraseId is not supported');
    }
    return { actionId, locationId, payload: { phraseId: actionPayload.phraseId } };
  }

  if (typeof actionPayload.power !== 'string' || !MAGIC_POWERS_SET.has(actionPayload.power)) {
    fail('INVALID_ACTION', 'magic power is not supported');
  }
  const position = requireObject(actionPayload.position, 'payload.payload.position');
  return {
    actionId,
    locationId,
    payload: {
      power: actionPayload.power,
      position: {
        x: finiteNumber(position.x, 'position.x', LIMITS.coordinate),
        y: finiteNumber(position.y, 'position.y', LIMITS.coordinate),
        z: finiteNumber(position.z, 'position.z', LIMITS.coordinate),
      },
    },
  };
}

export function validateFurnitureItem(item) {
  requireObject(item, 'item');
  const itemId = normalizedString(item.itemId, 'item.itemId', LIMITS.itemIdLength);
  if (!/^[A-Za-z0-9_.:-]+$/.test(itemId)) {
    fail('INVALID_FURNITURE', 'item.itemId contains unsupported characters');
  }
  if (typeof item.kind !== 'string' || !FURNITURE_KINDS_SET.has(item.kind)) {
    fail('INVALID_FURNITURE', 'item.kind is not supported');
  }
  if (typeof item.color !== 'string' || !FURNITURE_COLORS_SET.has(item.color.toLowerCase())) {
    fail('INVALID_FURNITURE', 'item.color is not supported');
  }
  return {
    itemId,
    kind: item.kind,
    color: item.color.toLowerCase(),
    x: finiteNumber(item.x, 'item.x', LIMITS.furnitureCoordinate),
    z: finiteNumber(item.z, 'item.z', LIMITS.furnitureCoordinate),
    ry: finiteNumber(item.ry, 'item.ry', LIMITS.rotation),
  };
}

export function validateItemId(itemId) {
  const normalized = normalizedString(itemId, 'itemId', LIMITS.itemIdLength);
  if (!/^[A-Za-z0-9_.:-]+$/.test(normalized)) {
    fail('INVALID_FURNITURE', 'itemId contains unsupported characters');
  }
  return normalized;
}

export function defaultPose() {
  return {
    seq: 0,
    locationId: 'world',
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    moving: false,
    flying: false,
  };
}
