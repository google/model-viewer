import {getLocallyUniqueId} from './utilities.js';

suite('utilities', () => {
  suite('getLocallyUniqueId', () => {
    test('always yields a unique ID', () => {
      const arbitrarilyLargeNumber = 9999
      const yieldedIds: Set<number> = new Set();
      for (let i = 0; i < arbitrarilyLargeNumber; ++i) {
        const nextId = getLocallyUniqueId();
        if (yieldedIds.has(nextId)) {
          throw new Error('ID already yielded!');
        }
        yieldedIds.add(nextId);
      }
    });
  });
});