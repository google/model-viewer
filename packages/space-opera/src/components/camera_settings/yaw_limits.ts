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

import {radToDeg} from '@google/model-viewer-editing-adapter/lib/util/math.js'
import {customElement, internalProperty} from 'lit-element';

import {Camera} from '../../redux/camera_state.js';
import {registerStateMutator, State} from '../../redux/space_opera_base.js';
import {Limits} from '../../redux/state_types.js';

import {LimitsBase} from './limits_base.js';

// Yaw is degrees from forward.

/** Default minimum yaw angle (degrees) */
export const DEFAULT_MIN_YAW = -180;

/** Default maximum yaw angle (degrees) */
export const DEFAULT_MAX_YAW = 180;

/** Dispatch change to maximum pitch */
export const dispatchYawLimits = registerStateMutator(
    'SET_CAMERA_YAW_LIMITS', (state, yawLimits?: Limits) => {
      if (!yawLimits) {
        throw new Error('No limits given');
      }
      if (yawLimits === state.camera.yawLimits) {
        throw new Error(
            'Do not edit yawLimits in place. You passed in the same object');
      }

      state.camera = {
        ...state.camera,
        yawLimits,
      };
    });


/** The Camera Settings panel. */
@customElement('me-camera-yaw-limits')
export class YawLimits extends LimitsBase {
  @internalProperty() yawLimits?: Limits;
  @internalProperty() currentCamera?: Camera;

  stateChanged(state: State) {
    this.yawLimits = state.camera.yawLimits;
    this.currentCamera = state.currentCamera;
  }

  dispatchLimits(limits?: Limits) {
    dispatchYawLimits(limits);
  }

  get label() {
    return 'Yaw';
  }

  get absoluteMinimum() {
    return DEFAULT_MIN_YAW;
  }

  get absoluteMaximum() {
    return DEFAULT_MAX_YAW;
  }

  get currentPreviewValue() {
    return Math.round(radToDeg(this.currentCamera?.orbit?.theta ?? 0));
  }

  get limitsProperty() {
    return this.yawLimits;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-yaw-limits': YawLimits;
  }
}
