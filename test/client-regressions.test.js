import assert from 'node:assert/strict';
import test from 'node:test';

import { bindMultiplayerFurnitureEvents } from '../src/multiplayer-furniture.js';
import { isMultiplayerConnecting } from '../src/multiplayer.js';

test('a connection error overrides Socket.IO automatic reconnect state', () => {
  const retryingSocket = { active: true, connected: false };

  assert.equal(isMultiplayerConnecting(retryingSocket), true);
  assert.equal(
    isMultiplayerConnecting(retryingSocket, { code: 'CONNECTION_FAILED' }),
    false,
  );
});

test('shared furniture events refresh sleep controls after updating the room', () => {
  const handlers = new Map();
  const calls = [];
  const multiplayer = {
    on(event, handler) {
      handlers.set(event, handler);
      return () => handlers.delete(event);
    },
  };
  const interior = {
    applyFurnitureAdded(locationId, item) {
      calls.push(['add', locationId, item.itemId]);
    },
    applyFurnitureRemoved(locationId, itemId) {
      calls.push(['remove', locationId, itemId]);
    },
    applyFurnitureCleared(locationId) {
      calls.push(['clear', locationId]);
    },
  };

  const subscriptions = bindMultiplayerFurnitureEvents(
    multiplayer,
    interior,
    () => calls.push(['refresh']),
  );

  handlers.get('furniture:added')({
    locationId: 'house:home:floor:1',
    item: { itemId: 'bed-1' },
  });
  handlers.get('furniture:removed')({
    locationId: 'house:home:floor:1',
    itemId: 'bed-1',
  });
  handlers.get('furniture:cleared')({ locationId: 'house:home:floor:1' });

  assert.deepEqual(calls, [
    ['add', 'house:home:floor:1', 'bed-1'],
    ['refresh'],
    ['remove', 'house:home:floor:1', 'bed-1'],
    ['refresh'],
    ['clear', 'house:home:floor:1'],
    ['refresh'],
  ]);
  assert.equal(subscriptions.length, 3);
});
