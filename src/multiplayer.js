import { io } from 'socket.io-client';

export const PROTOCOL_VERSION = 1;

const PLAYER_ID_KEY = 'mimimo.multiplayer.playerId.v1';
const SESSION_CODE_KEY = 'mimimo.multiplayer.sessionCode.v1';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function makeId(prefix = 'player') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function stablePlayerId() {
  let id = sessionStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = makeId();
    sessionStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function normaliseCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function serialisableProfile(profile = {}) {
  return {
    name: String(profile.name || '').trim().slice(0, 12),
    species: String(profile.species || 'bunny'),
    color: String(profile.color || '#ff9ed2'),
    shape: String(profile.shape || 'classic'),
  };
}

function cloneFurnitureMap(value) {
  const result = new Map();
  if (!value || typeof value !== 'object') return result;
  for (const [locationId, items] of Object.entries(value)) {
    if (Array.isArray(items)) result.set(locationId, items.map((item) => ({ ...item })));
  }
  return result;
}

/**
 * Socket.IO session client. It stays completely dormant for single-player
 * visitors unless they explicitly open a session or this tab has a room to
 * restore after refresh.
 */
export function createMultiplayerClient({
  url = import.meta.env.VITE_MULTIPLAYER_URL || '',
  getProfile,
} = {}) {
  const playerId = stablePlayerId();
  const listeners = new Map();
  const players = new Map();
  let furnitureByLocation = new Map();
  let sessionCode = normaliseCode(sessionStorage.getItem(SESSION_CODE_KEY));
  let pendingIntent = sessionCode ? { type: 'join', sessionCode } : null;
  let joined = false;
  let lastError = null;
  let lastPose = null;
  let lastPoseAt = 0;
  let seq = 0;

  const socket = io(url || window.location.origin, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    timeout: 7000,
  });

  function on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  }

  function emitLocal(event, payload) {
    for (const handler of listeners.get(event) || []) handler(payload);
    for (const handler of listeners.get('*') || []) handler({ event, payload });
  }

  function state() {
    return {
      available: Boolean(url),
      connected: socket.connected,
      connecting: socket.active && !socket.connected,
      joined,
      playerId,
      sessionCode,
      playerCount: players.size,
      players: [...players.values()],
      error: lastError,
    };
  }

  function announceState() {
    emitLocal('state', state());
  }

  function profile() {
    return serialisableProfile(getProfile?.() || {});
  }

  function packet(extra = {}) {
    return { protocolVersion: PROTOCOL_VERSION, ...extra };
  }

  function connectFor(intent) {
    lastError = null;
    pendingIntent = intent;
    announceState();
    if (socket.connected) sendIntent();
    else if (!socket.active) socket.connect();
  }

  function sendIntent() {
    if (!socket.connected || !pendingIntent) return;
    if (pendingIntent.type === 'create') {
      socket.emit('session:create', packet({ playerId, profile: profile() }));
    } else {
      socket.emit('session:join', packet({
        sessionCode: pendingIntent.sessionCode,
        playerId,
        profile: profile(),
      }));
    }
  }

  function acceptSnapshot(payload, eventName) {
    if (!payload || payload.protocolVersion !== PROTOCOL_VERSION) return;
    sessionCode = normaliseCode(payload.sessionCode);
    if (!CODE_PATTERN.test(sessionCode)) return;
    sessionStorage.setItem(SESSION_CODE_KEY, sessionCode);
    pendingIntent = { type: 'join', sessionCode };
    joined = true;
    lastError = null;
    players.clear();
    for (const player of payload.players || []) {
      if (player?.playerId) players.set(player.playerId, player);
    }
    const ownSnapshotSeq = Number(players.get(playerId)?.pose?.seq);
    if (Number.isSafeInteger(ownSnapshotSeq) && ownSnapshotSeq >= 0) {
      seq = Math.max(seq, ownSnapshotSeq);
    }
    furnitureByLocation = cloneFurnitureMap(payload.furnitureByLocation);
    lastPose = null;
    emitLocal('snapshot', {
      eventName,
      sessionCode,
      players: [...players.values()],
      furnitureByLocation,
    });
    announceState();
  }

  socket.on('connect', () => {
    announceState();
    sendIntent();
  });
  socket.on('disconnect', (reason) => {
    joined = false;
    emitLocal('disconnect', { reason, willReconnect: Boolean(sessionCode) });
    announceState();
  });
  socket.on('connect_error', (error) => {
    lastError = { code: 'CONNECTION_FAILED', message: error?.message || 'Multiplayer service is offline.' };
    emitLocal('error', lastError);
    announceState();
  });
  socket.on('session:created', (payload) => acceptSnapshot(payload, 'session:created'));
  socket.on('session:joined', (payload) => acceptSnapshot(payload, 'session:joined'));
  socket.on('session:error', (error = {}) => {
    lastError = {
      code: String(error.code || 'SESSION_ERROR'),
      message: String(error.message || 'Unable to join this room.'),
    };
    if (['SESSION_NOT_FOUND', 'INVALID_SESSION_CODE', 'CONNECTION_REPLACED'].includes(lastError.code)) {
      sessionStorage.removeItem(SESSION_CODE_KEY);
      sessionCode = '';
      pendingIntent = null;
      joined = false;
      players.clear();
      furnitureByLocation.clear();
    }
    emitLocal('error', lastError);
    announceState();
  });
  socket.on('player:joined', (payload = {}) => {
    const player = payload.player;
    if (!player?.playerId || player.playerId === playerId) return;
    players.set(player.playerId, player);
    emitLocal('player:joined', player);
    announceState();
  });
  socket.on('player:updated', (payload = {}) => {
    if (!payload.playerId || payload.playerId === playerId) return;
    const previous = players.get(payload.playerId) || { playerId: payload.playerId };
    const next = {
      ...previous,
      ...(payload.profile ? { profile: payload.profile } : {}),
      ...(payload.pose ? { pose: payload.pose } : {}),
    };
    players.set(payload.playerId, next);
    emitLocal('player:updated', { ...payload, player: next });
  });
  socket.on('player:left', (payload = {}) => {
    if (!payload.playerId) return;
    players.delete(payload.playerId);
    emitLocal('player:left', payload);
    announceState();
  });
  socket.on('player:action', (payload = {}) => {
    if (payload.playerId !== playerId) emitLocal('player:action', payload);
  });
  socket.on('furniture:added', (payload = {}) => {
    if (!payload.locationId || !payload.item) return;
    const items = furnitureByLocation.get(payload.locationId) || [];
    const index = items.findIndex((item) => item.itemId === payload.item.itemId);
    if (index >= 0) items[index] = { ...payload.item };
    else items.push({ ...payload.item });
    furnitureByLocation.set(payload.locationId, items);
    emitLocal('furniture:added', payload);
  });
  socket.on('furniture:removed', (payload = {}) => {
    if (!payload.locationId || !payload.itemId) return;
    const items = furnitureByLocation.get(payload.locationId) || [];
    furnitureByLocation.set(payload.locationId, items.filter((item) => item.itemId !== payload.itemId));
    emitLocal('furniture:removed', payload);
  });
  socket.on('furniture:cleared', (payload = {}) => {
    if (!payload.locationId) return;
    furnitureByLocation.set(payload.locationId, []);
    emitLocal('furniture:cleared', payload);
  });

  function createSession() {
    connectFor({ type: 'create' });
  }

  function joinSession(code) {
    const clean = normaliseCode(code);
    if (!CODE_PATTERN.test(clean)) {
      lastError = { code: 'INVALID_SESSION_CODE', message: 'Room codes have 6 letters or numbers.' };
      emitLocal('error', lastError);
      announceState();
      return false;
    }
    sessionCode = clean;
    connectFor({ type: 'join', sessionCode: clean });
    return true;
  }

  function leaveSession() {
    if (socket.connected && joined) socket.emit('session:leave', packet());
    sessionStorage.removeItem(SESSION_CODE_KEY);
    sessionCode = '';
    pendingIntent = null;
    joined = false;
    players.clear();
    furnitureByLocation.clear();
    lastPose = null;
    socket.disconnect();
    emitLocal('left');
    announceState();
  }

  function updateProfile() {
    if (socket.connected && joined) socket.emit('player:profile', packet({ profile: profile() }));
  }

  function publishPose(pose, now = performance.now()) {
    if (!socket.connected || !joined || !pose?.locationId) return false;
    const clean = {
      locationId: String(pose.locationId),
      x: Number(pose.x),
      y: Number(pose.y),
      z: Number(pose.z),
      rotation: Number(pose.rotation),
      moving: Boolean(pose.moving),
      flying: Boolean(pose.flying),
    };
    if (![clean.x, clean.y, clean.z, clean.rotation].every(Number.isFinite)) return false;
    const stateChanged = !lastPose
      || clean.locationId !== lastPose.locationId
      || clean.moving !== lastPose.moving
      || clean.flying !== lastPose.flying;
    const interval = clean.moving ? 100 : 1000;
    if (!stateChanged && now - lastPoseAt < interval) return false;
    lastPose = clean;
    lastPoseAt = now;
    seq += 1;
    socket.emit('player:pose', packet({ seq, ...clean }));
    return true;
  }

  function sendAction(actionId, locationId, payload = {}) {
    if (!socket.connected || !joined || !locationId) return false;
    socket.emit('player:action', packet({
      actionId: String(actionId),
      locationId: String(locationId),
      payload,
    }));
    return true;
  }

  function requestFurnitureAdd(locationId, item) {
    if (!socket.connected || !joined) return false;
    socket.emit('furniture:add', packet({ locationId, item }));
    return true;
  }

  function requestFurnitureRemove(locationId, itemId) {
    if (!socket.connected || !joined) return false;
    socket.emit('furniture:remove', packet({ locationId, itemId }));
    return true;
  }

  function requestFurnitureClear(locationId) {
    if (!socket.connected || !joined) return false;
    socket.emit('furniture:clear', packet({ locationId }));
    return true;
  }

  function furnitureSnapshot(locationId) {
    return (furnitureByLocation.get(locationId) || []).map((item) => ({ ...item }));
  }

  function restoreIfNeeded() {
    if (sessionCode) connectFor({ type: 'join', sessionCode });
  }

  return {
    on,
    state,
    createSession,
    joinSession,
    leaveSession,
    updateProfile,
    publishPose,
    sendAction,
    requestFurnitureAdd,
    requestFurnitureRemove,
    requestFurnitureClear,
    furnitureSnapshot,
    restoreIfNeeded,
  };
}
