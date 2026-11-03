// Game events: one part of the game announces something (a fire lit, a site found, a hare
// taken) and any other part can respond, without the two knowing about each other.
//   onGame('campfire', (fire) => ...)    emitGame('campfire', fire)
const gameListeners = new Map();

function onGame(name, fn) {
  if (!gameListeners.has(name)) gameListeners.set(name, []);
  gameListeners.get(name).push(fn);
}

function emitGame(name, ...args) {
  for (const fn of gameListeners.get(name) || []) {
    // One broken listener shouldn't stop the others, or the game.
    try { fn(...args); } catch (err) { console.error(`Error in "${name}" listener`, err); }
  }
}
