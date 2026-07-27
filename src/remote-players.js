import * as THREE from 'three';
import {
  animateMimimo,
  buildMimimo,
  COLORS,
  disposeMimimo,
  SHAPES,
  SPECIES,
} from './mimimo.js';
import { textSprite } from './utils.js';

const DEFAULT_PROFILE = Object.freeze({
  name: 'Mimimo',
  species: 'bunny',
  color: '#ff9ed2',
  shape: 'classic',
});

const DEFAULT_LOCATION = 'world';
const DEFAULT_INTERPOLATION_DELAY_MS = 100;
const DEFAULT_FLIGHT_HEIGHT = 2.5;
const DEFAULT_LABEL_HEIGHT = 2.55;
const DEFAULT_BUBBLE_HEIGHT = 3.2;
const DEFAULT_PHRASE_DURATION_MS = 2400;
const DEFAULT_WAVE_DURATION_MS = 900;
const MAX_POSITION = 100000;
const PROFILE_FIELDS = ['name', 'species', 'color', 'shape'];
const POSE_FIELDS = ['seq', 'locationId', 'x', 'y', 'z', 'rotation', 'moving', 'flying'];
const COLOR_SET = new Set(COLORS.map((color) => color.toLowerCase()));
const SPECIES_SET = new Set(Object.keys(SPECIES));
const SHAPE_SET = new Set(Object.keys(SHAPES));

export const REMOTE_ACTION_IDS = Object.freeze({
  WAVE: 'wave',
  PHRASE: 'phrase',
  MAGIC: 'magic',
});

const ACTION_ID_SET = new Set(Object.values(REMOTE_ACTION_IDS));

function defaultNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function clampFinite(value, fallback = 0, min = -MAX_POSITION, max = MAX_POSITION) {
  const number = Number(value);
  return Number.isFinite(number) ? THREE.MathUtils.clamp(number, min, max) : fallback;
}

function normalizeAngle(value, fallback = 0) {
  let angle = Number(value);
  if (!Number.isFinite(angle)) angle = fallback;
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function hasAnyField(value, fields) {
  return Boolean(value && typeof value === 'object' && fields.some((field) => field in value));
}

function normalizeKey(value, maxLength = 128) {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, '')
    .trim();
  if (!cleaned) return null;
  return Array.from(cleaned).slice(0, maxLength).join('');
}

/**
 * Sanitizes text before it reaches a canvas-backed name tag or speech bubble.
 * textSprite() never inserts HTML, and this additionally removes control,
 * bidi-control, and HTML metacharacters while enforcing a code-point limit.
 */
export function sanitizeRemoteLabel(value, { maxLength = 24, fallback = 'Mimimo' } = {}) {
  if (typeof value !== 'string') return fallback;
  let cleaned = value;
  try { cleaned = cleaned.normalize('NFC'); } catch { /* use the original string */ }
  cleaned = cleaned
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, ' ')
    .replace(/[<>&]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  cleaned = Array.from(cleaned).slice(0, Math.max(1, maxLength)).join('');
  return cleaned || fallback;
}

function normalizeProfile(profile, fallback = DEFAULT_PROFILE) {
  const source = profile && typeof profile === 'object' ? profile : {};
  const previous = fallback || DEFAULT_PROFILE;
  const species = SPECIES_SET.has(source.species) ? source.species : previous.species;
  const shape = SHAPE_SET.has(source.shape) ? source.shape : previous.shape;
  const requestedColor = typeof source.color === 'string' ? source.color.toLowerCase() : '';
  const color = COLOR_SET.has(requestedColor) ? requestedColor : previous.color;
  const name = 'name' in source
    ? sanitizeRemoteLabel(source.name, { fallback: previous.name || DEFAULT_PROFILE.name })
    : previous.name;
  return { name, species, color, shape };
}

function copyPose(pose) {
  return pose ? {
    seq: pose.seq,
    locationId: pose.locationId,
    x: pose.x,
    y: pose.y,
    z: pose.z,
    rotation: pose.rotation,
    moving: pose.moving,
    flying: pose.flying,
  } : null;
}

function normalizePose(pose, fallback = null) {
  const source = pose && typeof pose === 'object' ? pose : {};
  const previous = fallback || {
    locationId: DEFAULT_LOCATION,
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    moving: false,
    flying: false,
  };
  const seqNumber = Number(source.seq);
  const locationId = normalizeKey(source.locationId) || previous.locationId || DEFAULT_LOCATION;
  return {
    seq: Number.isSafeInteger(seqNumber) && seqNumber >= 0 ? seqNumber : null,
    locationId,
    x: clampFinite(source.x, previous.x),
    y: clampFinite(source.y, previous.y),
    z: clampFinite(source.z, previous.z),
    rotation: normalizeAngle(source.rotation, previous.rotation),
    moving: 'moving' in source ? source.moving === true : Boolean(previous.moving),
    flying: 'flying' in source ? source.flying === true : Boolean(previous.flying),
  };
}

function normalizeContext(context) {
  if (context?.isObject3D) return { container: context };
  if (context && typeof context === 'object' && context.container?.isObject3D) return context;
  return null;
}

function disposeSprite(sprite) {
  if (!sprite) return;
  sprite.removeFromParent();
  const materials = Array.isArray(sprite.material) ? sprite.material : [sprite.material];
  for (const material of materials) {
    if (!material) continue;
    material.map?.dispose();
    material.dispose();
  }
}

function disposeCharacter(character) {
  if (!character) return;
  const materials = new Set();
  character.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) materials.add(material);
  });

  // Keep geometry cleanup aligned with every other Mimimo user in the app.
  disposeMimimo(character);
  // disposeMimimo intentionally only owns geometry; remote models also own
  // their material instances. Textures are not disposed here because the toon
  // gradient map is shared globally by utils.js.
  for (const material of materials) material?.dispose();
}

function cleanupFromResult(result) {
  if (typeof result === 'function') return result;
  if (result && typeof result.dispose === 'function') return () => result.dispose();
  return null;
}

/**
 * Rendering-only manager for remote Mimimos.
 *
 * A location context may be a THREE.Scene/THREE.Group, or:
 *   { container, transformPose?, flightHeight?, labelHeight?, bubbleHeight? }
 *
 * The optional resolveContext(locationId) hook is useful for dynamic IDs such
 * as house:<key>:floor:<n>. Only players sharing localLocationId are attached
 * to a scene, so switching locations cannot leave models in an old scene.
 */
export class RemotePlayers {
  constructor({
    locations = null,
    contexts = null,
    container = null,
    context = null,
    resolveContext = null,
    getContext = null,
    localLocationId = DEFAULT_LOCATION,
    localPlayerId = null,
    interpolationDelayMs = DEFAULT_INTERPOLATION_DELAY_MS,
    flightHeight = DEFAULT_FLIGHT_HEIGHT,
    labelHeight = DEFAULT_LABEL_HEIGHT,
    bubbleHeight = DEFAULT_BUBBLE_HEIGHT,
    phraseDurationMs = DEFAULT_PHRASE_DURATION_MS,
    waveDurationMs = DEFAULT_WAVE_DURATION_MS,
    showActionBubbles = true,
    animateWaves = true,
    actionHandlers = null,
    onWave = null,
    onPhrase = null,
    onMagic = null,
    onAction = null,
    onError = null,
    now = defaultNow,
  } = {}) {
    this._players = new Map();
    this._contexts = new Map();
    this._defaultContext = normalizeContext(context || container);
    this._resolveContext = typeof resolveContext === 'function'
      ? resolveContext
      : (typeof getContext === 'function' ? getContext : null);
    this._localLocationId = normalizeKey(localLocationId) || DEFAULT_LOCATION;
    this._localPlayerId = normalizeKey(localPlayerId);
    this._interpolationDelayMs = Math.max(0, clampFinite(
      interpolationDelayMs,
      DEFAULT_INTERPOLATION_DELAY_MS,
      0,
      1000,
    ));
    this._flightHeight = Math.max(0, clampFinite(flightHeight, DEFAULT_FLIGHT_HEIGHT, 0, 20));
    this._labelHeight = Math.max(0, clampFinite(labelHeight, DEFAULT_LABEL_HEIGHT, 0, 20));
    this._bubbleHeight = Math.max(0, clampFinite(bubbleHeight, DEFAULT_BUBBLE_HEIGHT, 0, 20));
    this._phraseDurationMs = Math.max(100, clampFinite(
      phraseDurationMs,
      DEFAULT_PHRASE_DURATION_MS,
      100,
      10000,
    ));
    this._waveDurationMs = Math.max(100, clampFinite(
      waveDurationMs,
      DEFAULT_WAVE_DURATION_MS,
      100,
      5000,
    ));
    this._showActionBubbles = showActionBubbles !== false;
    this._animateWaves = animateWaves !== false;
    this._now = typeof now === 'function' ? now : defaultNow;
    this._onAction = typeof onAction === 'function' ? onAction : null;
    this._onError = typeof onError === 'function' ? onError : null;
    this._actionHandlers = new Map();
    this._disposed = false;

    const initialContexts = contexts || locations;
    if (initialContexts instanceof Map) {
      for (const [locationId, locationContext] of initialContexts) {
        this.registerLocation(locationId, locationContext);
      }
    } else if (initialContexts && typeof initialContexts === 'object') {
      for (const [locationId, locationContext] of Object.entries(initialContexts)) {
        this.registerLocation(locationId, locationContext);
      }
    }

    if (actionHandlers instanceof Map) {
      for (const [actionId, handler] of actionHandlers) this.setActionHandler(actionId, handler);
    } else if (actionHandlers && typeof actionHandlers === 'object') {
      for (const [actionId, handler] of Object.entries(actionHandlers)) {
        this.setActionHandler(actionId, handler);
      }
    }
    if (typeof onWave === 'function') this.setActionHandler(REMOTE_ACTION_IDS.WAVE, onWave);
    if (typeof onPhrase === 'function') this.setActionHandler(REMOTE_ACTION_IDS.PHRASE, onPhrase);
    if (typeof onMagic === 'function') this.setActionHandler(REMOTE_ACTION_IDS.MAGIC, onMagic);
  }

  get size() {
    return this._players.size;
  }

  get localLocationId() {
    return this._localLocationId;
  }

  get players() {
    return Array.from(this._players.keys(), (playerId) => this.getPlayer(playerId));
  }

  registerLocation(locationId, context) {
    this._assertActive();
    const safeLocationId = normalizeKey(locationId);
    const safeContext = normalizeContext(context);
    if (!safeLocationId) throw new TypeError('A non-empty locationId is required.');
    if (!safeContext) throw new TypeError('Location context must contain a THREE.Object3D container.');
    this._contexts.set(safeLocationId, safeContext);
    for (const entry of this._players.values()) {
      if (entry.locationId === safeLocationId) this._syncAttachment(entry);
    }
    return this;
  }

  unregisterLocation(locationId) {
    const safeLocationId = normalizeKey(locationId);
    if (!safeLocationId) return false;
    const removed = this._contexts.delete(safeLocationId);
    if (removed) {
      for (const entry of this._players.values()) {
        if (entry.locationId === safeLocationId) this._syncAttachment(entry);
      }
    }
    return removed;
  }

  /** Optionally registers/overwrites the location context in the same call. */
  setLocalLocation(locationId, context = undefined) {
    this._assertActive();
    const safeLocationId = normalizeKey(locationId);
    if (!safeLocationId) throw new TypeError('A non-empty locationId is required.');
    if (context !== undefined) this.registerLocation(safeLocationId, context);
    this._localLocationId = safeLocationId;
    for (const entry of this._players.values()) this._syncAttachment(entry);
    return this;
  }

  setLocalPlayerId(playerId) {
    this._assertActive();
    this._localPlayerId = normalizeKey(playerId);
    if (this._localPlayerId) this.removePlayer(this._localPlayerId);
    return this;
  }

  setActionHandler(actionId, handler) {
    this._assertActive();
    const safeActionId = normalizeKey(actionId, 32)?.toLowerCase();
    if (!ACTION_ID_SET.has(safeActionId)) {
      throw new TypeError(`Unsupported remote action: ${String(actionId)}`);
    }
    if (handler == null) this._actionHandlers.delete(safeActionId);
    else if (typeof handler === 'function') this._actionHandlers.set(safeActionId, handler);
    else throw new TypeError('Action handler must be a function, null, or undefined.');
    return this;
  }

  /**
   * Accepts either upsertPlayer(playerState) or upsertPlayer(playerId, state).
   * playerState may contain { playerId, profile, pose }, or flat profile/pose
   * fields for convenience.
   */
  upsertPlayer(playerOrId, state = null) {
    this._assertActive();
    const source = playerOrId && typeof playerOrId === 'object'
      ? playerOrId
      : (state && typeof state === 'object' ? state : {});
    const playerId = normalizeKey(
      playerOrId && typeof playerOrId === 'object'
        ? (playerOrId.playerId ?? playerOrId.id)
        : playerOrId,
    );
    if (!playerId || playerId === this._localPlayerId) return null;

    const profilePatch = source.profile && typeof source.profile === 'object'
      ? source.profile
      : (hasAnyField(source, PROFILE_FIELDS) ? source : null);
    const posePatch = source.pose && typeof source.pose === 'object'
      ? source.pose
      : (hasAnyField(source, POSE_FIELDS) ? source : null);

    let entry = this._players.get(playerId);
    if (!entry) entry = this._createEntry(playerId, profilePatch);
    else if (profilePatch) this.setProfile(playerId, profilePatch);
    if (posePatch) this.pushPose(playerId, posePatch, source.receivedAt);
    return this.getPlayer(playerId);
  }

  setProfile(playerId, profile) {
    this._assertActive();
    const safePlayerId = normalizeKey(playerId);
    if (!safePlayerId || safePlayerId === this._localPlayerId) return null;
    let entry = this._players.get(safePlayerId);
    if (!entry) entry = this._createEntry(safePlayerId, profile);

    const next = normalizeProfile(profile, entry.profile);
    const appearanceChanged = next.species !== entry.profile.species
      || next.color !== entry.profile.color
      || next.shape !== entry.profile.shape;
    const nameChanged = next.name !== entry.profile.name;
    entry.profile = next;
    if (appearanceChanged) this._replaceBody(entry);
    if (nameChanged) this._replaceNameLabel(entry);
    return this.getPlayer(safePlayerId);
  }

  /**
   * Adds a locally timestamped pose sample. The manager intentionally keeps
   * only the newest two samples and renders interpolationDelayMs in the past.
   */
  pushPose(playerId, pose, receivedAt = undefined) {
    this._assertActive();
    const safePlayerId = normalizeKey(playerId);
    if (!safePlayerId || safePlayerId === this._localPlayerId) return false;
    let entry = this._players.get(safePlayerId);
    if (!entry) entry = this._createEntry(safePlayerId, null);

    const previous = entry.poses.at(-1)?.pose || entry.latestPose;
    const next = normalizePose(pose, previous);
    const lastSample = entry.poses.at(-1);
    if (
      lastSample
      && next.seq != null
      && lastSample.pose.seq != null
      && next.seq <= lastSample.pose.seq
    ) {
      return false;
    }

    let timestamp = Number(receivedAt);
    if (!Number.isFinite(timestamp)) timestamp = this._now();
    if (lastSample && timestamp <= lastSample.receivedAt) timestamp = lastSample.receivedAt + 0.001;

    const changedLocation = entry.locationId !== next.locationId;
    if (changedLocation) entry.poses.length = 0;
    entry.poses.push({ pose: next, receivedAt: timestamp });
    if (entry.poses.length > 2) entry.poses.shift();
    entry.latestPose = next;
    entry.locationId = next.locationId;

    if (entry.poses.length === 1) {
      entry.root.position.set(next.x, next.y, next.z);
      entry.root.rotation.y = next.rotation;
      const context = this._contextFor(next.locationId);
      entry.flightAmount = next.flying ? this._contextNumber(context, 'flightHeight', this._flightHeight) : 0;
      entry.body.userData.anim.flightHeight = entry.flightAmount;
      entry.renderedPose = copyPose(next);
    }
    this._syncAttachment(entry);
    return true;
  }

  /** Reconciles an initial/rejoin snapshot and removes players not in it. */
  replacePlayers(snapshot) {
    this._assertActive();
    let values;
    if (Array.isArray(snapshot)) values = snapshot;
    else if (snapshot instanceof Map) {
      values = Array.from(snapshot, ([playerId, value]) => ({ playerId, ...value }));
    } else if (Array.isArray(snapshot?.players)) values = snapshot.players;
    else if (snapshot?.players && typeof snapshot.players === 'object') {
      values = Object.entries(snapshot.players).map(([playerId, value]) => ({ playerId, ...value }));
    } else if (snapshot && typeof snapshot === 'object') {
      values = Object.entries(snapshot).map(([playerId, value]) => ({ playerId, ...value }));
    } else values = [];

    const seen = new Set();
    for (const value of values) {
      const playerId = normalizeKey(value?.playerId ?? value?.id);
      if (!playerId || playerId === this._localPlayerId) continue;
      seen.add(playerId);
      this.upsertPlayer(value);
    }
    for (const playerId of [...this._players.keys()]) {
      if (!seen.has(playerId)) this.removePlayer(playerId);
    }
    return this._players.size;
  }

  /**
   * Handles { playerId, actionId, locationId, payload } or
   * handleAction(playerId, action). Wave and phrase have lightweight built-in
   * feedback; wave/phrase/magic can all be extended with callbacks.
   */
  handleAction(playerOrId, action = null) {
    this._assertActive();
    const event = playerOrId && typeof playerOrId === 'object'
      ? playerOrId
      : (action && typeof action === 'object' ? action : {});
    const playerId = normalizeKey(
      playerOrId && typeof playerOrId === 'object'
        ? (playerOrId.playerId ?? playerOrId.id)
        : playerOrId,
    );
    const actionId = normalizeKey(event.actionId, 32)?.toLowerCase();
    const entry = playerId ? this._players.get(playerId) : null;
    if (!entry || !ACTION_ID_SET.has(actionId)) return false;

    const locationId = normalizeKey(event.locationId) || entry.locationId;
    if (locationId !== entry.locationId || locationId !== this._localLocationId) return false;

    const nowMs = this._now();
    let payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
    let phrase = null;
    if (actionId === REMOTE_ACTION_IDS.WAVE) {
      entry.waveStartedAt = nowMs;
      entry.waveUntil = nowMs + this._waveDurationMs;
    } else if (actionId === REMOTE_ACTION_IDS.PHRASE) {
      const rawPhrase = typeof event.payload === 'string'
        ? event.payload
        : (payload.text ?? payload.phrase ?? payload.message);
      phrase = sanitizeRemoteLabel(rawPhrase, { maxLength: 80, fallback: '' });
      payload = { ...payload, text: phrase };
      if (phrase && this._showActionBubbles) this.showPhrase(playerId, phrase);
    }

    const context = this._contextFor(locationId);
    const callbackContext = {
      actionId,
      playerId,
      locationId,
      payload,
      phrase,
      profile: { ...entry.profile },
      pose: copyPose(entry.renderedPose || entry.latestPose),
      root: entry.root,
      body: entry.body,
      container: context?.container || null,
      context,
      position: entry.root.position.clone(),
      worldPosition: entry.root.getWorldPosition(new THREE.Vector3()),
      showPhrase: (text, durationMs) => this.showPhrase(playerId, text, durationMs),
      registerCleanup: (cleanup) => this._registerCleanup(entry, cleanup),
    };

    const callbacks = [this._actionHandlers.get(actionId), this._onAction];
    for (const callback of callbacks) {
      if (typeof callback !== 'function') continue;
      try {
        const result = callback(callbackContext);
        this._captureCallbackResult(entry, result);
      } catch (error) {
        this._reportError(error, { type: 'action', actionId, playerId });
      }
    }
    return true;
  }

  showPhrase(playerId, text, durationMs = this._phraseDurationMs) {
    this._assertActive();
    const entry = this._players.get(normalizeKey(playerId));
    if (!entry) return false;
    const safeText = sanitizeRemoteLabel(text, { maxLength: 80, fallback: '' });
    if (!safeText) return false;
    this._disposeBubble(entry);
    entry.bubble = textSprite(safeText, { fontSize: 36, pad: 18 });
    entry.root.add(entry.bubble);
    const context = this._contextFor(entry.locationId);
    entry.bubble.position.y = entry.body.position.y
      + this._contextNumber(context, 'bubbleHeight', this._bubbleHeight);
    entry.bubbleUntil = this._now() + Math.max(100, clampFinite(
      durationMs,
      this._phraseDurationMs,
      100,
      10000,
    ));
    return true;
  }

  /** Call from the main render loop as update(dtSeconds, elapsedSeconds). */
  update(dt, elapsedTime = undefined, nowMs = undefined) {
    if (this._disposed) return;
    const safeDt = Math.max(0, clampFinite(dt, 0, 0, 0.1));
    let currentTime = Number(nowMs);
    if (!Number.isFinite(currentTime)) currentTime = this._now();
    const animationTime = Number.isFinite(Number(elapsedTime))
      ? Number(elapsedTime)
      : currentTime / 1000;
    const renderTime = currentTime - this._interpolationDelayMs;

    for (const entry of this._players.values()) {
      this._syncAttachment(entry);
      const interpolated = this._interpolate(entry, renderTime);
      if (interpolated) {
        const transformed = this._transformPose(entry, interpolated.pose, entry.context);
        entry.root.position.set(transformed.x, transformed.y, transformed.z);
        entry.root.rotation.y = transformed.rotation;
        entry.renderedPose = { ...copyPose(interpolated.pose), ...transformed };

        const flightHeight = this._contextNumber(entry.context, 'flightHeight', this._flightHeight);
        const targetFlight = interpolated.flying ? flightHeight : 0;
        const flightSmoothing = 1 - Math.exp(-safeDt * 3.6);
        entry.flightAmount += (targetFlight - entry.flightAmount) * flightSmoothing;
        entry.body.userData.anim.flightHeight = entry.flightAmount;
        animateMimimo(
          entry.body,
          animationTime + entry.animationOffset,
          safeDt,
          interpolated.moving,
        );
      }

      if (this._animateWaves && currentTime < entry.waveUntil) {
        const waveTime = Math.max(0, currentTime - entry.waveStartedAt) / 1000;
        entry.body.rotation.z = Math.sin(waveTime * 18) * 0.16;
      } else {
        entry.body.rotation.z = 0;
      }

      const labelHeight = this._contextNumber(entry.context, 'labelHeight', this._labelHeight);
      const bubbleHeight = this._contextNumber(entry.context, 'bubbleHeight', this._bubbleHeight);
      entry.nameLabel.position.y = entry.body.position.y + labelHeight;
      if (entry.bubble) {
        entry.bubble.position.y = entry.body.position.y + bubbleHeight;
        if (currentTime >= entry.bubbleUntil) this._disposeBubble(entry);
      }
    }
  }

  getPlayer(playerId) {
    const entry = this._players.get(normalizeKey(playerId));
    if (!entry) return null;
    return {
      playerId: entry.playerId,
      root: entry.root,
      body: entry.body,
      profile: { ...entry.profile },
      pose: copyPose(entry.latestPose),
      renderedPose: copyPose(entry.renderedPose),
      locationId: entry.locationId,
      visible: Boolean(entry.root.parent && entry.root.visible),
    };
  }

  removePlayer(playerId) {
    const safePlayerId = normalizeKey(playerId);
    const entry = safePlayerId ? this._players.get(safePlayerId) : null;
    if (!entry) return false;

    for (const cleanup of [...entry.cleanups]) {
      try { cleanup(); } catch (error) {
        this._reportError(error, { type: 'cleanup', playerId: safePlayerId });
      }
    }
    entry.cleanups.clear();
    this._disposeBubble(entry);
    disposeSprite(entry.nameLabel);
    entry.nameLabel = null;
    disposeCharacter(entry.body);
    entry.body = null;
    entry.root.removeFromParent();
    entry.root.clear();
    entry.root.userData.remotePlayerId = null;
    this._players.delete(safePlayerId);
    return true;
  }

  clear() {
    for (const playerId of [...this._players.keys()]) this.removePlayer(playerId);
  }

  dispose() {
    if (this._disposed) return;
    this.clear();
    this._contexts.clear();
    this._actionHandlers.clear();
    this._defaultContext = null;
    this._resolveContext = null;
    this._onAction = null;
    this._onError = null;
    this._disposed = true;
  }

  _createEntry(playerId, profile) {
    const root = new THREE.Group();
    root.name = `remote-player:${playerId}`;
    root.visible = false;
    root.userData.remotePlayerId = playerId;
    const entry = {
      playerId,
      root,
      body: null,
      nameLabel: null,
      bubble: null,
      bubbleUntil: 0,
      profile: normalizeProfile(profile),
      poses: [],
      latestPose: null,
      renderedPose: null,
      locationId: DEFAULT_LOCATION,
      context: null,
      flightAmount: 0,
      waveStartedAt: 0,
      waveUntil: 0,
      animationOffset: Math.random() * Math.PI * 2,
      cleanups: new Set(),
    };
    this._players.set(playerId, entry);
    this._replaceBody(entry);
    this._replaceNameLabel(entry);
    this._syncAttachment(entry);
    return entry;
  }

  _replaceBody(entry) {
    if (entry.body) disposeCharacter(entry.body);
    entry.body = buildMimimo(entry.profile);
    entry.body.name = 'remote-mimimo';
    entry.body.userData.anim.playerControlledFlight = true;
    entry.body.userData.anim.flightHeight = entry.flightAmount;
    entry.body.userData.anim.magicLift = 0;
    entry.root.add(entry.body);
  }

  _replaceNameLabel(entry) {
    disposeSprite(entry.nameLabel);
    entry.nameLabel = textSprite(entry.profile.name, { fontSize: 40, pad: 18 });
    entry.nameLabel.name = 'remote-name-label';
    entry.root.add(entry.nameLabel);
  }

  _disposeBubble(entry) {
    disposeSprite(entry.bubble);
    entry.bubble = null;
    entry.bubbleUntil = 0;
  }

  _contextFor(locationId) {
    const registered = this._contexts.get(locationId);
    if (registered) return registered;
    if (this._resolveContext) {
      try {
        const resolved = normalizeContext(this._resolveContext(locationId));
        if (resolved) return resolved;
      } catch (error) {
        this._reportError(error, { type: 'resolve-context', locationId });
      }
    }
    return this._defaultContext;
  }

  _syncAttachment(entry) {
    const context = this._contextFor(entry.locationId);
    entry.context = context;
    const shouldAttach = entry.playerId !== this._localPlayerId
      && entry.locationId === this._localLocationId
      && Boolean(context?.container);
    if (shouldAttach) {
      if (entry.root.parent !== context.container) context.container.add(entry.root);
      entry.root.visible = true;
    } else {
      entry.root.visible = false;
      entry.root.removeFromParent();
    }
  }

  _interpolate(entry, renderTime) {
    if (!entry.poses.length) return null;
    const last = entry.poses.at(-1);
    if (entry.poses.length === 1) {
      return { pose: last.pose, moving: last.pose.moving, flying: last.pose.flying };
    }

    const first = entry.poses[0];
    const duration = Math.max(0.001, last.receivedAt - first.receivedAt);
    const alpha = THREE.MathUtils.clamp((renderTime - first.receivedAt) / duration, 0, 1);
    const pose = {
      seq: alpha < 1 ? first.pose.seq : last.pose.seq,
      locationId: last.pose.locationId,
      x: THREE.MathUtils.lerp(first.pose.x, last.pose.x, alpha),
      y: THREE.MathUtils.lerp(first.pose.y, last.pose.y, alpha),
      z: THREE.MathUtils.lerp(first.pose.z, last.pose.z, alpha),
      rotation: normalizeAngle(
        first.pose.rotation + shortestAngleDelta(first.pose.rotation, last.pose.rotation) * alpha,
      ),
      moving: alpha < 1 ? (first.pose.moving || last.pose.moving) : last.pose.moving,
      flying: alpha < 0.5 ? first.pose.flying : last.pose.flying,
    };
    return { pose, moving: pose.moving, flying: pose.flying };
  }

  _transformPose(entry, pose, context) {
    let transformed = pose;
    if (typeof context?.transformPose === 'function') {
      try {
        const result = context.transformPose(copyPose(pose), {
          playerId: entry.playerId,
          profile: { ...entry.profile },
          root: entry.root,
        });
        if (result && typeof result === 'object') transformed = { ...pose, ...result };
      } catch (error) {
        this._reportError(error, { type: 'transform-pose', playerId: entry.playerId });
      }
    }
    return {
      x: clampFinite(transformed.x, pose.x),
      y: clampFinite(transformed.y, pose.y),
      z: clampFinite(transformed.z, pose.z),
      rotation: normalizeAngle(transformed.rotation, pose.rotation),
    };
  }

  _contextNumber(context, key, fallback) {
    return Math.max(0, clampFinite(context?.[key], fallback, 0, 20));
  }

  _registerCleanup(entry, cleanup) {
    if (typeof cleanup !== 'function') return () => {};
    entry.cleanups.add(cleanup);
    return () => entry.cleanups.delete(cleanup);
  }

  _captureCallbackResult(entry, result) {
    if (result && typeof result.then === 'function') {
      result.then((resolved) => {
        const cleanup = cleanupFromResult(resolved);
        if (!cleanup) return;
        if (this._players.get(entry.playerId) === entry) entry.cleanups.add(cleanup);
        else cleanup();
      }).catch((error) => {
        this._reportError(error, { type: 'async-action', playerId: entry.playerId });
      });
      return;
    }
    const cleanup = cleanupFromResult(result);
    if (cleanup) entry.cleanups.add(cleanup);
  }

  _reportError(error, details) {
    if (this._onError) {
      try { this._onError(error, details); } catch { /* never break the render loop */ }
    } else if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[remote-players]', details, error);
    }
  }

  _assertActive() {
    if (this._disposed) throw new Error('RemotePlayers has been disposed.');
  }
}

export function createRemotePlayers(options) {
  return new RemotePlayers(options);
}
