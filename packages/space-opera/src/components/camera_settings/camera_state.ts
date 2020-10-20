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

import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import {roundToDigits} from '@google/model-viewer-editing-adapter/lib/util/math.js'
import {Limits, SphericalPositionDeg, Vector3D} from './types.js';

const DIGITS = 4;

/**
 * Space Opera camera state. For any field, if defined. All units are degrees
 * and meters, unless otherwise specified (such as orbit.phi, in radians).
 */
export interface Camera {
  readonly orbit?: SphericalPositionDeg;
  readonly fieldOfViewDeg?: number;
  readonly target?: Vector3D;

  // Limits
  readonly yawLimitsDeg?: Limits;
  readonly pitchLimitsDeg?: Limits;
  readonly radiusLimits?: Limits;
  readonly fovLimitsDeg?: Limits;
}

export interface CurrentCamera {
  currentCamera?: Camera
}

/** Initial values. All are undefined, which is to say "no opinion". */
export const INITIAL_CAMERA = {};

function getMinString(limits: Limits|undefined, suffix: string) {
  if (!limits || !limits.enabled) {
    return 'auto';
  }
  return `${roundToDigits(limits.min, DIGITS)}${suffix}`;
}

function getMaxString(limits: Limits|undefined, suffix: string) {
  if (!limits || !limits.enabled) {
    return 'auto';
  }
  return `${roundToDigits(limits.max, DIGITS)}${suffix}`;
}

/**
 * Applies the camera edits to the given config. If a setting is not defined in
 * edits, then the corresponding config field will *NOT* be changed.
 */
export function applyCameraEdits(config: ModelViewerConfig, edits: Camera) {
  const orbit = edits.orbit;
  if (orbit) {
    config.cameraOrbit = `${roundToDigits(orbit.thetaDeg, DIGITS)}deg ${
        roundToDigits(
            orbit.phiDeg, DIGITS)}deg ${roundToDigits(orbit.radius, DIGITS)}m`;
  }

  const target = edits.target;
  if (target) {
    config.cameraTarget = `${roundToDigits(target.x, DIGITS)}m ${
        roundToDigits(target.y, DIGITS)}m ${roundToDigits(target.z, DIGITS)}m`;
  }

  const fov = edits.fieldOfViewDeg;
  if (fov) {
    config.fieldOfView = `${roundToDigits(fov, DIGITS)}deg`;
  }

  if (edits.yawLimitsDeg || edits.pitchLimitsDeg || edits.radiusLimits) {
    config.minCameraOrbit = getMinString(edits.yawLimitsDeg, 'deg') + ' ' +
        getMinString(edits.pitchLimitsDeg, 'deg') + ' ' +
        getMinString(edits.radiusLimits, 'm');
    config.maxCameraOrbit = getMaxString(edits.yawLimitsDeg, 'deg') + ' ' +
        getMaxString(edits.pitchLimitsDeg, 'deg') + ' ' +
        getMaxString(edits.radiusLimits, 'm');
  }

  if (edits.fovLimitsDeg) {
    config.minFov = getMinString(edits.fovLimitsDeg, 'deg');
    config.maxFov = getMaxString(edits.fovLimitsDeg, 'deg');
  }
}
