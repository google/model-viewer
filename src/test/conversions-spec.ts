/* @license
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {Math as ThreeMath} from 'three';
import {Vector3} from 'three';

import {deserializeAngleToDeg, deserializeSpherical, deserializeVector3, enumerationDeserializer} from '../conversions.js';

const expect = chai.expect;
const DEFAULT_SPHERICAL: [number, number, number, number] = [0, 0, 0, 0];

suite('conversions', () => {
  suite('deserializeSpherical', () => {
    test('converts a spherical string to spherical values', () => {
      expect(deserializeSpherical('0rad 1.23rad 1m', DEFAULT_SPHERICAL))
          .to.be.eql([0, 1.23, 1, null]);
    });

    test('assumes radians when units are omitted from theta and phi', () => {
      expect(deserializeSpherical('1.23 0 1m', DEFAULT_SPHERICAL))
          .to.be.eql([1.23, 0, 1, null]);
    });

    test('assumes meters when units are omitted from radius', () => {
      expect(deserializeSpherical('1rad 20rad 3', DEFAULT_SPHERICAL))
          .to.be.eql([1, 20, 3, null]);
    });

    test(
        'allows degress to be used instead of radians for theta and phi',
        () => {
          expect(deserializeSpherical('9.9rad 3.14deg 1m', DEFAULT_SPHERICAL))
              .to.be.eql([9.9, ThreeMath.degToRad(3.14), 1, null]);
        });

    test('allows radius to be expressed in mm or cm', () => {
      expect(deserializeSpherical('0 0 23mm', DEFAULT_SPHERICAL))
          .to.be.eql([0, 0, 0.023, null]);
      expect(deserializeSpherical('0 0 100cm', DEFAULT_SPHERICAL))
          .to.be.eql([0, 0, 1, null]);
    });

    test('returns a factor if radius is expressed in %', () => {
      expect(deserializeSpherical('0 0 110%', DEFAULT_SPHERICAL))
          .to.be.eql([0, 0, null, 1.1]);
    });

    test('is resilient to awkward whitespace', () => {
      expect(deserializeSpherical('  0 0\n   0 ', DEFAULT_SPHERICAL))
          .to.be.eql([0, 0, 0, null]);
    });
  });

  suite('deserializeAngleToDeg', () => {
    test('converts an angle string to degrees', () => {
      expect(deserializeAngleToDeg('1.23rad', 0))
          .to.be.eql(ThreeMath.radToDeg(1.23));
    });

    test('assumes radians when units are omitted', () => {
      expect(deserializeAngleToDeg('1.23', 0))
          .to.be.eql(ThreeMath.radToDeg(1.23));
    });

    test('allows degress to be used instead of radians', () => {
      expect(deserializeAngleToDeg('1.23deg', 0)).to.be.eql(1.23);
    });
  });

  suite('deserializeVector3', () => {
    test('handles mixed units', () => {
      expect(deserializeVector3('1.5m 150cm 1500mm', new Vector3(0, 0, 0)))
          .to.be.eql(new Vector3(1.5, 1.5, 1.5));
    });

    test('returns the default for garbage', () => {
      expect(deserializeVector3('2 abc %', new Vector3(1, 2, 3)))
          .to.be.eql(new Vector3(2, 2, 3));
    });
  });

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
