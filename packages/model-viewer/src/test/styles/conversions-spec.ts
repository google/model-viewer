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

import {expect} from 'chai';

import {degreesToRadians, lengthToBaseMeters, normalizeUnit, radiansToDegrees} from '../../styles/conversions.js';
import {numberNode} from '../../styles/parsers.js';

suite('conversions', () => {
  suite('degreesToRadians', () => {
    test('converts a number expressed in degrees to radians', () => {
      expect(degreesToRadians(numberNode(180, 'deg')))
          .to.be.eql(numberNode(Math.PI, 'rad'));
    });

    test('passes through numbers expressed in radians', () => {
      expect(degreesToRadians(numberNode(1, 'rad')))
          .to.be.eql(numberNode(1, 'rad'));
    });

    test('passes through numbers without a unit', () => {
      expect(degreesToRadians(numberNode(1, null)))
          .to.be.eql(numberNode(1, null));
    });
  });

  suite('radiansToDegrees', () => {
    test('converts a number expressed in radians to degrees', () => {
      expect(radiansToDegrees(numberNode(Math.PI, 'rad')))
          .to.be.eql(numberNode(180, 'deg'));
    });

    test('passes through numbers expressed in degrees', () => {
      expect(radiansToDegrees(numberNode(1, 'deg')))
          .to.be.eql(numberNode(1, 'deg'));
    });

    test('treats numbers without a unit as radians', () => {
      expect(radiansToDegrees(numberNode(Math.PI, null)))
          .to.be.eql(numberNode(180, 'deg'));
    });
  });

  suite('lengthToBaseMeters', () => {
    test('passes through numbers expressed in base meters', () => {
      expect(lengthToBaseMeters(numberNode(1, 'm')))
          .to.be.eql(numberNode(1, 'm'));
    });

    test('converts numbers expressed in centimeters to base meters', () => {
      expect(lengthToBaseMeters(numberNode(123, 'cm')))
          .to.be.eql(numberNode(1.23, 'm'));
    });

    test('converts numbers expressed in millimeters to base meters', () => {
      expect(lengthToBaseMeters(numberNode(1234, 'mm')))
          .to.be.eql(numberNode(1.234, 'm'));
    });
  });

  suite('normalizeUnit', () => {
    test('normalizes angles to radians', () => {
      expect(normalizeUnit(numberNode(180, 'deg')))
          .to.be.eql(numberNode(Math.PI, 'rad'));

      expect(normalizeUnit(numberNode(180, 'rad')))
          .to.be.eql(numberNode(180, 'rad'));
    });

    test('normalizes lengths to base meters', () => {
      expect(normalizeUnit(numberNode(1, 'm'))).to.be.eql(numberNode(1, 'm'));

      expect(normalizeUnit(numberNode(1000, 'mm')))
          .to.be.eql(numberNode(1, 'm'));
    });
  });
});