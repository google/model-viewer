/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {getLocallyUniqueId} from './utilities.js';

suite('utilities', () => {
  suite('getLocallyUniqueId', () => {
    test('always yields a unique ID', () => {
      const arbitrarilyLargeNumber = 9999;
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
