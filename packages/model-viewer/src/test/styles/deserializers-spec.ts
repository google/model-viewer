/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {expect} from '@esm-bundle/chai';

import {enumerationDeserializer} from '../../styles/deserializers.js';

suite('deserializers', () => {
  suite('enumerationDeserializer', () => {
    type Animal = 'elephant'|'octopus'|'chinchilla';
    let animals: Animal[];
    let deserializeAnimals: (input: string) => Set<Animal>;

    setup(() => {
      animals = ['elephant', 'octopus', 'chinchilla'];
      deserializeAnimals = enumerationDeserializer<Animal>(animals);
    });

    test('yields the members of the enumeration in the input string', () => {
      const deserialized = deserializeAnimals('elephant chinchilla');
      expect(deserialized.size).to.be.equal(2);
      expect(deserialized.has('elephant')).to.be.true;
      expect(deserialized.has('chinchilla')).to.be.true;
    });

    test('filters out non-members of the enumeration', () => {
      const deserialized = deserializeAnimals('octopus paris');
      expect(deserialized.size).to.be.equal(1);
      expect(deserialized.has('octopus')).to.be.true;
    });

    test('yields an empty set from null input', () => {
      // tsc would normally warn about null not being accepted
      // but it is worth ensuring the correct behavior all the same:
      const deserialized = deserializeAnimals(null as any);
      expect(deserialized.size).to.be.equal(0);
    });
  });
});