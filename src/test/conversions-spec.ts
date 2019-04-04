/*
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
import {deserializeSpherical} from '../conversions.js';

const expect = chai.expect;

suite('conversions', () => {
  suite('deserializeSpherical', () => {
    test('converts a spherical string to spherical values', () => {
      expect(deserializeSpherical('0rad 1.23rad 1m')).to.be.eql([0, 1.23, 1]);
    });

    test('assumes radians when units are omitted from theta and phi', () => {
      expect(deserializeSpherical('1.23 0 1m')).to.be.eql([1.23, 0, 1]);
    });

    test('assumes meters when units are omitted from radius', () => {
      expect(deserializeSpherical('1rad 20rad 3')).to.be.eql([1, 20, 3]);
    });

    test(
        'allows degress to be used instead of radians for theta and phi',
        () => {
          expect(deserializeSpherical('9.9rad 3.14deg 1m'))
              .to.be.eql([9.9, ThreeMath.degToRad(3.14), 1]);
        });

    test('allows radius to be expressed in mm or cm', () => {
      expect(deserializeSpherical('0 0 23mm')).to.be.eql([0, 0, 0.023]);
      expect(deserializeSpherical('0 0 100cm')).to.be.eql([0, 0, 1]);
    });

    test('is resilient to awkward whitespace', () => {
      expect(deserializeSpherical('  0 0\n   0 ')).to.be.eql([0, 0, 0]);
    });
  });
});
