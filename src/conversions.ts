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

import {Math as ThreeMath, Vector3} from 'three';

import {parseValues, ValueNode} from './parsers.js';


/**
 * Converts a length-like ValueNode to meters expressed as a number. Currently,
 * only ValueNodes that represent a metric value (m, cm, mm) are supported.
 *
 * Assumes meters if unit is not specified or recognized. Returns the supplied
 * default if 'auto' is given or the ValueNode cannot be parsed.
 */
const lengthValueNodeToMeters =
    (lengthValueNode: ValueNode, defaultMeters: number): number => {
      let length = parseFloat(lengthValueNode.value as any);

      if (isNaN(length)) {
        return defaultMeters;
      }

      switch (lengthValueNode.unit) {
        default:
        case 'm':
          break;
        case 'cm':
          length /= 100;
          break;
        case 'mm':
          length /= 1000;
          break;
      }

      return length;
    };

/**
 * Converts an angle-like ValueNode to radians expressed as a number. Currently,
 * only ValueNodes that represent an angle expressed in degrees (deg) or radians
 * (rad) are supported.
 *
 * Assumes radians if unit is not specified or recognized. Returns the supplied
 * default if 'auto' is given or the ValueNode cannot be parsed.
 */
const convertAngleValueNode =
    (angleValueNode: ValueNode,
     defaultRadians: number,
     desiredUnits: string = 'rad'): number => {
      const value = parseFloat(angleValueNode.value as any);

      if ((self as any).isNaN(value)) {
        return defaultRadians;
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
 * millimeters (mm), or percent (%). If percent is used, the radius parameter
 * will be set to the appropriate fraction of the supplied default radius. The
 * supplied default values are [theta (rad), phi(rad), radius(m), percent(%).]
 *
 * Assumes radians/meters if unit is not specified or recognized. Returns the
 * supplied default if 'auto' is given or the ValueNode cannot be parsed. 'auto'
 * for radius returns the product of the default radius and default percent.
 */
export const deserializeSpherical =
    (sphericalString: string, defaultValues: [number, number, number, number]):
        [number, number, number] => {
          let [theta, phi, radius, percent] = defaultValues;
          try {
            const sphericalValueNodes = parseValues(sphericalString);

            if (sphericalValueNodes.length === 3) {
              const [thetaNode, phiNode, radiusNode] = sphericalValueNodes;

              theta = convertAngleValueNode(thetaNode, theta);
              phi = convertAngleValueNode(phiNode, phi);

              if (radiusNode.unit == '%') {
                radius *= lengthValueNodeToMeters(radiusNode, percent) / 100;
              } else {
                radius = lengthValueNodeToMeters(radiusNode, radius * percent);
              }
            }
          } catch (_error) {
          }

          return [theta, phi, radius];
        };

/**
 * Vector String => Vector Values
 *
 * Converts a "vector string" to a Vector3. Position strings are of the form "$x
 * $y $z". Accepted units include meters (m), centimeters (cm) and millimeters
 * (mm).
 *
 * Assumes meters if unit is not specified or recognized. Returns the supplied
 * default if 'auto' is given or the vector string cannot be parsed.
 */
export const deserializeVector3 =
    (vectorString: string, defaultValues: Vector3): Vector3 => {
      try {
        const vectorValueNodes = parseValues(vectorString);
        const xyz = new Vector3(
            lengthValueNodeToMeters(vectorValueNodes[0], defaultValues.x),
            lengthValueNodeToMeters(vectorValueNodes[1], defaultValues.y),
            lengthValueNodeToMeters(vectorValueNodes[2], defaultValues.z));
        return xyz;
      } catch (_error) {
        return defaultValues;
      }
    };

export const deserializeAngleToDeg =
    (angleString: string, defaultDeg: number): number|null => {
      try {
        const angleValueNode = parseValues(angleString);
        return convertAngleValueNode(angleValueNode[0], defaultDeg, 'deg');
      } catch (_error) {
        return defaultDeg;
      }
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
