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

import {parseValues, ValueNode} from './parsers.js';


/**
 * Converts a length-like ValueNode to meters expressed as a number. Currently,
 * only ValueNodes that represent a metric value (m, cm, mm) are supported.
 *
 * If no unit is specified, assumes meters. Returns 0 for a ValueNode that
 * cannot be parsed.
 */
const lengthValueNodeToMeters = (lengthValueNode: ValueNode): number => {
  const value = parseFloat(lengthValueNode.value as any);

  if ((self as any).isNaN(value)) {
    return 0;
  }

  let scale;

  switch (lengthValueNode.unit) {
    default:
    case 'm':
      scale = 1;
      break;
    case 'cm':
      scale = 1 / 100;
      break;
    case 'mm':
      scale = 1 / 1000;
      break;
  }

  return value * scale;
};

/**
 * Converts an angle-like ValueNode to radians expressed as a number. Currently,
 * only ValueNodes that represent an angle expressed in degrees (deg) or radians
 * (rad) are supported.
 *
 * Assumes radians if unit is not specified or recognized. Returns 0 for a
 * ValueNode that cannot be parsed.
 */
const convertAngleValueNode =
    (angleValueNode: ValueNode, desiredUnits: string = 'rad'): number => {
      const value = parseFloat(angleValueNode.value as any);

      if ((self as any).isNaN(value)) {
        return 0;
      }

      const inputUnits = angleValueNode.unit;
      return inputUnits === 'deg' ?
          desiredUnits === 'deg' ? value : ThreeMath.degToRad(value) :
          desiredUnits === 'deg' ? ThreeMath.radToDeg(value) : value;
    };

/**
 * Spherical String => Spherical Values
 *
 * Converts a "spherical string" to values suitable for assigning to a Three.js
 * Spherical object. Position strings are of the form "$theta $phi $radius".
 * Accepted units for theta and phi are radians (rad) and degrees (deg).
 * Accepted units for radius include meters (m), centimeters (cm) and
 * millimeters (mm), or auto. If radius is set to auto, it implies that the
 * consumer of the deserialized values has some idealized notion of the radius
 * that should be applied.
 *
 * Returns null if the spherical string cannot be parsed.
 */
export const deserializeSpherical =
    (sphericalString: string): [number, number, number|string]|null => {
      try {
        const sphericalValueNodes = parseValues(sphericalString);

        if (sphericalValueNodes.length === 3) {
          const [thetaNode, phiNode, radiusNode] = sphericalValueNodes;

          const theta = convertAngleValueNode(thetaNode);
          const phi = convertAngleValueNode(phiNode);
          const radius = radiusNode.value === 'auto' ?
              'auto' :
              lengthValueNodeToMeters(radiusNode);

          return [theta, phi, radius];
        }
      } catch (_error) {
      }

      return null;
    };

/**
 * Vector String => Vector Values
 *
 * Converts a "vector string" to 3 values, either numbers in meters or the
 * string 'auto'. Position strings are of the form "$x $y $z". Accepted units
 * include meters (m), centimeters (cm) and millimeters (mm).
 *
 * Returns null if the vector string cannot be parsed.
 */
export const deserializeVector3 =
    (vectorString: string): (number|string)[]|null => {
      try {
        const vectorValueNodes = parseValues(vectorString);

        const xyz = [];
        if (vectorValueNodes.length === 3) {
          for (let i = 0; i < 3; i++) {
            xyz.push(
                vectorValueNodes[i].value === 'auto' ?
                    'auto' :
                    lengthValueNodeToMeters(vectorValueNodes[i]));
          }

          return xyz;
        }
      } catch (_error) {
      }

      return null;
    };

export const deserializeAngleToDeg = (angleString: string): number|null => {
  try {
    const angleValueNode = parseValues(angleString);

    if (angleValueNode.length === 1) {
      return convertAngleValueNode(angleValueNode[0], 'deg');
    }
  } catch (_error) {
  }

  return null;
};

/**
 * For our purposes, an enumeration is a fixed set of CSS-expression-compatible
 * names. When serialized, a selected subset of the members may be specified as
 * whitespace-separated strings. An enumeration deserializer is a function that
 * parses a serialized subset of an enumeration and returns any members that are
 * found as a Set.
 *
 * The following example will produce a deserializer for the days of the
 * week:
 *
 * const deserializeDaysOfTheWeek = enumerationDeserializer([
 *   'Monday',
 *   'Tuesday',
 *   'Wednesday',
 *   'Thursday',
 *   'Friday',
 *   'Saturday',
 *   'Sunday'
 * ]);
 */
export const enumerationDeserializer = <T extends string>(allowedNames: T[]) =>
    (valueString: string): Set<T> => {
      try {
        const names = parseValues(valueString)
                          .map(valueNode => valueNode.value as T)
                          .filter((name) => allowedNames.indexOf(name) > -1);
        // NOTE(cdata): IE11 does not support constructing a Set directly from
        // an iterable, so we need to manually add all the items:
        const result = new Set<T>();
        for (const name of names) {
          result.add(name);
        }
        return result;
      } catch (_error) {
      }
      return new Set();
    };
