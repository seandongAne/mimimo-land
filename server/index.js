import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import http from 'node:http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';

import {
  CLEANUP_INTERVAL_MS,
  CLIENT_EVENTS,
  EMPTY_SESSION_TTL_MS,
  MAX_FURNITURE_PER_LOCATION,
  MAX_PLAYERS,
  PROTOCOL_VERSION,
  ProtocolError,
  RATE_LIMITS,
  SESSION_CODE_ALPHABET,
  SESSION_CODE_LENGTH,
  defaultPose,
  requireObject,
  validateAction,
  validateFurnitureItem,
  validateItemId,
  validateLocationId,
  validatePlayerId,
  validatePose,
  validateProfile,
  validateProtocol,
  validateSessionCode,
} from './protocol.js';

const DEFAULT_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.github\.io$/i,
  /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i,
];

function parseAllowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS || env.CLIENT_ORIGIN || '';
  return new Set(raw.split(',').map((origin) => origin.trim()).filter(Boolean));
}

export function createOriginChecker(env = process.env) {
  const allowed = parseAllowedOrigins(env);
  return (origin) => {
    if (!origin) return true;
    if (allowed.has('*') || allowed.has(origin)) return true;
    return DEFAULT_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
  };
}

function roomName(sessionCode) {
  return `session:${sessionCode}`;
}

function locationRoomName(sessionCode, locationId) {
  return `session:${sessionCode}:location:${locationId}`;
}

function publicPlayer(player) {
  return {
    playerId: player.playerId,
    profile: { ...player.profile },
    pose: { ...player.pose },
  };
}

function publicPlayers(session) {
  return [...session.players.values()]
    .filter((player) => player.socketId !== null)
    .map(publicPlayer);
}

function publicFurniture(session) {
  return Object.fromEntries(
    [...session.furnitureByLocation.entries()].map(([locationId, items]) => [
      locationId,
      items.map((item) => ({ ...item })),
    ]),
  );
}

function sessionSnapshot(sessionCode, session) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    sessionCode,
    players: publicPlayers(session),
    furnitureByLocation: publicFurniture(session),
  };
}

function sameRecord(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
}

function makeSession(now) {
  return {
    createdAt: now,
    emptySince: null,
    players: new Map(),
    furnitureByLocation: new Map(),
  };
}

function activePlayerCount(session) {
  let count = 0;
  for (const player of session.players.values()) {
    if (player.socketId !== null) count += 1;
  }
  return count;
}

function normalizeError(error) {
  if (error instanceof ProtocolError) return error;
  console.error(error);
  return new ProtocolError('INTERNAL_ERROR', 'The multiplayer server could not process that message');
}

export function createMultiplayerServer(options = {}) {
  const env = options.env || process.env;
  const now = options.now || Date.now;
  const emptySessionTtlMs = options.emptySessionTtlMs ?? EMPTY_SESSION_TTL_MS;
  const cleanupIntervalMs = options.cleanupIntervalMs ?? CLEANUP_INTERVAL_MS;
  const isOriginAllowed = createOriginChecker(env);

  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin(origin, callback) {
        callback(isOriginAllowed(origin) ? null : new Error('Origin is not allowed'), isOriginAllowed(origin));
      },
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 64 * 1024,
    serveClient: false,
  });

  const sessions = new Map();

  app.disable('x-powered-by');
  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (origin && isOriginAllowed(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
    }
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') return response.sendStatus(204);
    return next();
  });

  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      protocolVersion: PROTOCOL_VERSION,
      sessions: sessions.size,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  function emitError(socket, error, ack, event) {
    const normalized = normalizeError(error);
    const payload = {
      protocolVersion: PROTOCOL_VERSION,
      code: normalized.code,
      message: normalized.message,
    };
    if (event) payload.event = event;
    socket.emit('session:error', payload);
    if (typeof ack === 'function') ack({ ok: false, error: payload });
  }

  function success(ack, details = {}) {
    if (typeof ack === 'function') ack({ ok: true, protocolVersion: PROTOCOL_VERSION, ...details });
  }

  function generateSessionCode() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      let code = '';
      for (let index = 0; index < SESSION_CODE_LENGTH; index += 1) {
        code += SESSION_CODE_ALPHABET[randomInt(SESSION_CODE_ALPHABET.length)];
      }
      if (!sessions.has(code)) return code;
    }
    throw new ProtocolError('SESSION_CODE_UNAVAILABLE', 'Could not allocate a room code');
  }

  function markEmptyIfNeeded(session) {
    session.emptySince = activePlayerCount(session) === 0 ? (session.emptySince ?? now()) : null;
  }

  function cleanupExpiredSessions() {
    const cutoff = now() - emptySessionTtlMs;
    for (const [sessionCode, session] of sessions) {
      if (session.emptySince !== null && session.emptySince <= cutoff) {
        sessions.delete(sessionCode);
        continue;
      }
      for (const [playerId, player] of session.players) {
        if (player.socketId === null && player.disconnectedAt !== null && player.disconnectedAt <= cutoff) {
          session.players.delete(playerId);
        }
      }
    }
  }

  const cleanupTimer = setInterval(cleanupExpiredSessions, cleanupIntervalMs);
  cleanupTimer.unref?.();

  function ownedPlayer(socket) {
    const { sessionCode, playerId } = socket.data;
    if (!sessionCode || !playerId) {
      throw new ProtocolError('NOT_IN_SESSION', 'Join a multiplayer session first');
    }
    const session = sessions.get(sessionCode);
    const player = session?.players.get(playerId);
    if (!session || !player || player.socketId !== socket.id) {
      socket.data.sessionCode = null;
      socket.data.playerId = null;
      throw new ProtocolError('NOT_IN_SESSION', 'This connection is no longer in the session');
    }
    return { sessionCode, session, player };
  }

  function removeCurrentPlayer(socket, { broadcast = true } = {}) {
    const { sessionCode, playerId } = socket.data;
    if (!sessionCode || !playerId) return null;
    const session = sessions.get(sessionCode);
    const player = session?.players.get(playerId);
    socket.data.sessionCode = null;
    socket.data.playerId = null;
    if (!session || !player || player.socketId !== socket.id) return null;

    session.players.delete(playerId);
    socket.leave(roomName(sessionCode));
    socket.leave(locationRoomName(sessionCode, player.pose.locationId));
    if (broadcast) {
      socket.to(roomName(sessionCode)).emit('player:left', {
        protocolVersion: PROTOCOL_VERSION,
        playerId,
      });
    }
    markEmptyIfNeeded(session);
    return { sessionCode, playerId };
  }

  function replaceOldSocket(player, nextSocket) {
    if (!player.socketId || player.socketId === nextSocket.id) return;
    const oldSocket = io.sockets.sockets.get(player.socketId);
    if (!oldSocket) return;
    oldSocket.data.replaced = true;
    oldSocket.data.sessionCode = null;
    oldSocket.data.playerId = null;
    oldSocket.emit('session:error', {
      protocolVersion: PROTOCOL_VERSION,
      code: 'CONNECTION_REPLACED',
      message: 'This player reconnected from another socket',
    });
    oldSocket.disconnect(true);
  }

  async function attachPlayer(socket, sessionCode, playerId, profile) {
    const session = sessions.get(sessionCode);
    if (!session) throw new ProtocolError('SESSION_NOT_FOUND', 'That room no longer exists');

    const existing = session.players.get(playerId);
    if (!existing && session.players.size >= MAX_PLAYERS) {
      throw new ProtocolError('SESSION_FULL', `This room already has ${MAX_PLAYERS} players`);
    }

    const sameMembership = socket.data.sessionCode === sessionCode && socket.data.playerId === playerId;
    if (!sameMembership) removeCurrentPlayer(socket);

    const wasConnected = Boolean(existing?.socketId);
    const oldProfile = existing?.profile;
    const player = existing || {
      playerId,
      profile,
      pose: defaultPose(),
      socketId: null,
      disconnectedAt: null,
    };

    if (existing) replaceOldSocket(existing, socket);
    player.profile = profile;
    player.socketId = socket.id;
    player.disconnectedAt = null;
    session.players.set(playerId, player);
    session.emptySince = null;

    socket.data.sessionCode = sessionCode;
    socket.data.playerId = playerId;
    socket.data.replaced = false;
    await socket.join(roomName(sessionCode));
    await socket.join(locationRoomName(sessionCode, player.pose.locationId));

    if (!sameMembership && !wasConnected) {
      socket.to(roomName(sessionCode)).emit('player:joined', {
        protocolVersion: PROTOCOL_VERSION,
        player: publicPlayer(player),
      });
    } else if (oldProfile && !sameRecord(oldProfile, profile)) {
      socket.to(roomName(sessionCode)).emit('player:updated', {
        protocolVersion: PROTOCOL_VERSION,
        playerId,
        profile: { ...profile },
      });
    }
    return { session, player };
  }

  function ensureFurnitureLocation(player, locationId) {
    const normalized = validateLocationId(locationId, { houseOnly: true });
    if (player.pose.locationId !== normalized) {
      throw new ProtocolError('LOCATION_MISMATCH', 'Furniture can only be changed on the player current house floor');
    }
    return normalized;
  }

  function consumeRateLimit(socket, event) {
    const config = RATE_LIMITS[event];
    if (!config) return;
    const currentTime = now();
    const record = socket.data.rateLimits.get(event);
    if (!record || currentTime - record.startedAt >= config.windowMs) {
      socket.data.rateLimits.set(event, { startedAt: currentTime, count: 1 });
      return;
    }
    record.count += 1;
    if (record.count > config.limit) {
      throw new ProtocolError('RATE_LIMITED', `Too many ${event} messages; please slow down`);
    }
  }

  function register(socket, event, handler) {
    socket.on(event, async (payload, ack) => {
      try {
        consumeRateLimit(socket, event);
        validateProtocol(payload);
        await handler(payload, ack);
      } catch (error) {
        emitError(socket, error, ack, event);
      }
    });
  }

  io.on('connection', (socket) => {
    socket.data.sessionCode = null;
    socket.data.playerId = null;
    socket.data.replaced = false;
    socket.data.rateLimits = new Map();

    socket.onAny((event) => {
      if (!CLIENT_EVENTS.includes(event)) {
        emitError(socket, new ProtocolError('INVALID_EVENT', `Unsupported event: ${event}`), undefined, event);
      }
    });

    register(socket, 'session:create', async (payload, ack) => {
      const playerId = validatePlayerId(payload.playerId);
      const profile = validateProfile(payload.profile);
      removeCurrentPlayer(socket);
      const sessionCode = generateSessionCode();
      sessions.set(sessionCode, makeSession(now()));
      const { session } = await attachPlayer(socket, sessionCode, playerId, profile);
      const snapshot = sessionSnapshot(sessionCode, session);
      socket.emit('session:created', snapshot);
      success(ack, { sessionCode });
    });

    register(socket, 'session:join', async (payload, ack) => {
      const sessionCode = validateSessionCode(payload.sessionCode);
      const playerId = validatePlayerId(payload.playerId);
      const profile = validateProfile(payload.profile);
      cleanupExpiredSessions();
      const { session } = await attachPlayer(socket, sessionCode, playerId, profile);
      socket.emit('session:joined', sessionSnapshot(sessionCode, session));
      success(ack, { sessionCode });
    });

    register(socket, 'session:leave', (_payload, ack) => {
      removeCurrentPlayer(socket);
      success(ack);
    });

    register(socket, 'player:profile', (payload, ack) => {
      const { sessionCode, player } = ownedPlayer(socket);
      const patch = validateProfile(payload.profile, { partial: true });
      player.profile = { ...player.profile, ...patch };
      socket.to(roomName(sessionCode)).emit('player:updated', {
        protocolVersion: PROTOCOL_VERSION,
        playerId: player.playerId,
        profile: { ...player.profile },
      });
      success(ack);
    });

    register(socket, 'player:pose', async (payload, ack) => {
      const { sessionCode, player } = ownedPlayer(socket);
      const pose = validatePose(payload);
      if (pose.seq <= player.pose.seq) {
        success(ack, { ignored: true });
        return;
      }
      const oldLocation = player.pose.locationId;
      player.pose = pose;
      if (oldLocation !== pose.locationId) {
        await socket.leave(locationRoomName(sessionCode, oldLocation));
        await socket.join(locationRoomName(sessionCode, pose.locationId));
      }
      socket.to(roomName(sessionCode)).emit('player:updated', {
        protocolVersion: PROTOCOL_VERSION,
        playerId: player.playerId,
        pose: { ...pose },
      });
      success(ack);
    });

    register(socket, 'player:action', (payload, ack) => {
      const { sessionCode, player } = ownedPlayer(socket);
      const action = validateAction(payload);
      if (action.locationId !== player.pose.locationId) {
        throw new ProtocolError('LOCATION_MISMATCH', 'Actions must use the player current location');
      }
      socket.to(locationRoomName(sessionCode, action.locationId)).emit('player:action', {
        protocolVersion: PROTOCOL_VERSION,
        playerId: player.playerId,
        ...action,
      });
      success(ack);
    });

    register(socket, 'furniture:add', (payload, ack) => {
      requireObject(payload);
      const { sessionCode, session, player } = ownedPlayer(socket);
      const locationId = ensureFurnitureLocation(player, payload.locationId);
      const item = validateFurnitureItem(payload.item);
      const items = session.furnitureByLocation.get(locationId) || [];
      const existing = items.find((candidate) => candidate.itemId === item.itemId);
      if (existing && !sameRecord(existing, item)) {
        throw new ProtocolError('ITEM_CONFLICT', 'That furniture itemId already describes a different item');
      }
      if (!existing) {
        if (items.length >= MAX_FURNITURE_PER_LOCATION) {
          throw new ProtocolError('FURNITURE_LIMIT', 'This house floor has reached its furniture limit');
        }
        items.push(item);
        session.furnitureByLocation.set(locationId, items);
      }
      io.to(roomName(sessionCode)).emit('furniture:added', {
        protocolVersion: PROTOCOL_VERSION,
        locationId,
        item: { ...(existing || item) },
      });
      success(ack, { duplicate: Boolean(existing) });
    });

    register(socket, 'furniture:remove', (payload, ack) => {
      requireObject(payload);
      const { sessionCode, session, player } = ownedPlayer(socket);
      const locationId = ensureFurnitureLocation(player, payload.locationId);
      const itemId = validateItemId(payload.itemId);
      const items = session.furnitureByLocation.get(locationId) || [];
      const nextItems = items.filter((item) => item.itemId !== itemId);
      if (nextItems.length === 0) session.furnitureByLocation.delete(locationId);
      else if (nextItems.length !== items.length) session.furnitureByLocation.set(locationId, nextItems);
      io.to(roomName(sessionCode)).emit('furniture:removed', {
        protocolVersion: PROTOCOL_VERSION,
        locationId,
        itemId,
      });
      success(ack, { existed: nextItems.length !== items.length });
    });

    register(socket, 'furniture:clear', (payload, ack) => {
      requireObject(payload);
      const { sessionCode, session, player } = ownedPlayer(socket);
      const locationId = ensureFurnitureLocation(player, payload.locationId);
      session.furnitureByLocation.delete(locationId);
      io.to(roomName(sessionCode)).emit('furniture:cleared', {
        protocolVersion: PROTOCOL_VERSION,
        locationId,
      });
      success(ack);
    });

    socket.on('disconnect', () => {
      if (socket.data.replaced) return;
      const { sessionCode, playerId } = socket.data;
      const session = sessions.get(sessionCode);
      const player = session?.players.get(playerId);
      if (!session || !player || player.socketId !== socket.id) return;
      player.socketId = null;
      player.disconnectedAt = now();
      io.to(roomName(sessionCode)).emit('player:left', {
        protocolVersion: PROTOCOL_VERSION,
        playerId,
      });
      markEmptyIfNeeded(session);
    });
  });

  async function start(port = Number(env.PORT) || 3000, host = '0.0.0.0') {
    if (httpServer.listening) return httpServer.address();
    await new Promise((resolveStart, rejectStart) => {
      const onError = (error) => {
        httpServer.off('listening', onListening);
        rejectStart(error);
      };
      const onListening = () => {
        httpServer.off('error', onError);
        resolveStart();
      };
      httpServer.once('error', onError);
      httpServer.once('listening', onListening);
      httpServer.listen(port, host);
    });
    return httpServer.address();
  }

  async function stop() {
    clearInterval(cleanupTimer);
    if (!httpServer.listening) return;
    await new Promise((resolveStop) => io.close(resolveStop));
  }

  return {
    app,
    httpServer,
    io,
    sessions,
    start,
    stop,
    cleanupExpiredSessions,
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const service = createMultiplayerServer();
  const address = await service.start(Number(process.env.PORT) || 3000, '0.0.0.0');
  console.log(`MIMIMO multiplayer server listening on 0.0.0.0:${address.port}`);

  const shutdown = async () => {
    await service.stop();
    process.exit(0);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
