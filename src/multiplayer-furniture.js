/**
 * Apply shared furniture events before refreshing controls that depend on the
 * rendered room contents, such as the sleep button.
 */
export function bindMultiplayerFurnitureEvents(multiplayer, interior, onFurnitureChanged) {
  const refresh = typeof onFurnitureChanged === 'function' ? onFurnitureChanged : () => {};

  return [
    multiplayer.on('furniture:added', ({ locationId, item }) => {
      interior.applyFurnitureAdded(locationId, item);
      refresh();
    }),
    multiplayer.on('furniture:removed', ({ locationId, itemId }) => {
      interior.applyFurnitureRemoved(locationId, itemId);
      refresh();
    }),
    multiplayer.on('furniture:cleared', ({ locationId }) => {
      interior.applyFurnitureCleared(locationId);
      refresh();
    }),
  ];
}
