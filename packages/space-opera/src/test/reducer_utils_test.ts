/**
 * @license
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
 *
 */



import {immutableArrayUpdate, immutableMapUpdate} from '../components/utils/reducer_utils.js';

describe('reducer utils test', () => {
  it('immutableArrayUpdate returns a copy with the expected update', () => {
    const input = [1, 2, 3];
    const output = immutableArrayUpdate(input, 1, 4);
    expect(output).toEqual([1, 4, 3]);
    // Must not mutate the input
    expect(input).toEqual([1, 2, 3]);
  });

  it('immutableMapUpdate returns a copy with the expected update', () => {
    const input = new Map<string, string>();
    input.set('name', 'alice');
    input.set('age', '25');
    const output = immutableMapUpdate(input, 'age', '30');

    // Creates a clone
    expect(output).not.toBe(input);

    // Clone has correct values.
    expect(output.size).toEqual(2);
    expect(output.get('name')).toEqual('alice');
    expect(output.get('age')).toEqual('30');

    // Input has old values
    expect(input.size).toEqual(2);
    expect(input.get('name')).toEqual('alice');
    expect(input.get('age')).toEqual('25');
  });
});
