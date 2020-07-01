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
 * istributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import {radToDeg} from '@google/model-viewer-editing-adapter/lib/util/math.js'

import {Limits, SphericalPosition, Vector3D} from './state_types.js';

/**
 * Space Opera camera state. For any field, if defined. All units are degrees
 * and meters, unless otherwise specified (such as orbit.phi, in radians).
 */
export interface Camera {
  readonly orbit?: SphericalPosition;
  readonly fieldOfView?: number;
  readonly target?: Vector3D;

  // Limits
  readonly yawLimits?: Limits;
  readonly pitchLimits?: Limits;
  readonly radiusLimits?: Limits;
  readonly fovLimits?: Limits;
}

/** Initial values. All are undefined, which is to say "no opinion". */
export const INITIAL_CAMERA = {};

function getMinString(limits: Limits|undefined, suffix: string) {
  if (!limits || !limits.enabled) {
    return 'auto';
  }
  return `${limits.min}${suffix}`;
}

function getMaxString(limits: Limits|undefined, suffix: string) {
  if (!limits || !limits.enabled) {
    return 'auto';
  }
  return `${limits.max}${suffix}`;
}

/**
 * Applies the camera edits to the given config. If a setting is not defined in
 * edits, then the corresponding config field will *NOT* be changed.
 */
export function applyCameraEdits(config: ModelViewerConfig, edits: Camera) {
  const orbit = edits.orbit;
  if (orbit) {
    config.cameraOrbit = `${radToDeg(orbit.theta)}deg ${
        radToDeg(orbit.phi)}deg ${orbit.radius}m`;
  }

  const target = edits.target;
  if (target) {
    config.cameraTarget = `${target.x}m ${target.y}m ${target.z}m`;
  }

  const fov = edits.fieldOfView;
  if (fov) {
    config.fieldOfView = `${fov}deg`;
  }

  if (edits.yawLimits || edits.pitchLimits || edits.radiusLimits) {
    config.minCameraOrbit = getMinString(edits.yawLimits, 'deg') + ' ' +
        getMinString(edits.pitchLimits, 'deg') + ' ' +
        getMinString(edits.radiusLimits, 'm');
    config.maxCameraOrbit = getMaxString(edits.yawLimits, 'deg') + ' ' +
        getMaxString(edits.pitchLimits, 'deg') + ' ' +
        getMaxString(edits.radiusLimits, 'm');
  }

  if (edits.fovLimits) {
    config.minFov = getMinString(edits.fovLimits, 'deg');
    config.maxFov = getMaxString(edits.fovLimits, 'deg');
  }
}
