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

import {NumberNode, ZERO} from './parsers';

/**
 * Ensures that a given number is expressed in radians. If the number is already
 * in radians, does nothing. If the value is in degrees, converts it to radians.
 * If the value has no specified unit, the unit is assumed to be radians. If the
 * value is not in radians or degrees, the value is resolved as 0 radians.
 *
 * Also accepts a second argument that is a default value to use if the input
 * numberNode number is NaN or Infinity.
 */
export const degreesToRadians =
    (numberNode: NumberNode, fallbackRadianValue: number = 0): NumberNode => {
      let {number, unit} = numberNode;
      if (!isFinite(number)) {
        number = fallbackRadianValue;
        unit = 'rad';
      } else if (numberNode.unit === 'rad' || numberNode.unit == null) {
        return numberNode;
      }

      const valueIsDegrees = unit === 'deg' && number != null;
      const value = valueIsDegrees ? number : 0;
      const radians = value * Math.PI / 180;

      return {type: 'number', number: radians, unit: 'rad'};
    };

/**
 * Ensures that a given number is expressed in degrees. If the number is already
 * in degrees, does nothing. If the value is in radians or has no specified
 * unit, converts it to degrees. If the value is not in radians or degrees, the
 * value is resolved as 0 degrees.
 *
 * Also accepts a second argument that is a default value to use if the input
 * numberNode number is NaN or Infinity.
 */
export const radiansToDegrees =
    (numberNode: NumberNode, fallbackDegreeValue: number = 0): NumberNode => {
      let {number, unit} = numberNode;

      if (!isFinite(number)) {
        number = fallbackDegreeValue;
        unit = 'deg';
      } else if (numberNode.unit === 'deg') {
        return numberNode;
      }

      const valueIsRadians =
          (unit === null || unit === 'rad') && number != null;

      const value = valueIsRadians ? number : 0;
      const degrees = value * 180 / Math.PI;

      return {type: 'number', number: degrees, unit: 'deg'};
    };

/**
 * Converts a given length to meters. Currently supported input units are
 * meters, centimeters and millimeters.
 *
 * Also accepts a second argument that is a default value to use if the input
 * numberNode number is NaN or Infinity.
 */
export const lengthToBaseMeters =
    (numberNode: NumberNode, fallbackMeterValue: number = 0): NumberNode => {
      let {number, unit} = numberNode;

      if (!isFinite(number)) {
        number = fallbackMeterValue;
        unit = 'm';
      } else if (numberNode.unit === 'm') {
        return numberNode;
      }

      let scale;

      switch (unit) {
        default:
          scale = 1;
          break;
        case 'cm':
          scale = 1 / 100;
          break;
        case 'mm':
          scale = 1 / 1000;
          break;
      }

      const value = scale * number;
      return {type: 'number', number: value, unit: 'm'};
    };

/**
 * Normalizes the unit of a given input number so that it is expressed in a
 * preferred unit. For length nodes, the return value will be expressed in
 * meters. For angle nodes, the return value will be expressed in radians.
 *
 * Also takes a fallback number that is used when the number value is not a
 * valid number or when the unit of the given number cannot be normalized.
 */
export const normalizeUnit = (() => {
  const identity = (node: NumberNode) => node;
  const unitNormalizers: {[index: string]: (node: NumberNode) => NumberNode} = {
    'rad': identity,
    'deg': degreesToRadians,
    'm': identity,
    'mm': lengthToBaseMeters,
    'cm': lengthToBaseMeters
  };

  return (node: NumberNode, fallback: NumberNode = ZERO) => {
    if (!isFinite(node.number)) {
      node.number = fallback.number;
      node.unit = fallback.unit;
    }

    const {unit} = node;

    if (unit == null) {
      return node;
    }

    const normalize = unitNormalizers[unit];

    if (normalize == null) {
      return fallback;
    }

    return normalize(node);
  };
})();