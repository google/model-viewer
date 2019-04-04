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
const angleValueNodeToRadians = (angleValueNode: ValueNode): number => {
  const value = parseFloat(angleValueNode.value as any);

  if ((self as any).isNaN(value)) {
    return 0;
  }

  return angleValueNode.unit === 'deg' ? ThreeMath.degToRad(value) : value;
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

          const theta = angleValueNodeToRadians(thetaNode);
          const phi = angleValueNodeToRadians(phiNode);
          const radius = radiusNode.value === 'auto' ?
              'auto' :
              lengthValueNodeToMeters(radiusNode);

          return [theta, phi, radius];
        }
      } catch (_error) {
      }

      return null;
    };

