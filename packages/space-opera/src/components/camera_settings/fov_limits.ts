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

import {customElement, internalProperty} from 'lit-element';

import {Camera} from '../../redux/camera_state.js';
import {registerStateMutator, State} from '../../redux/space_opera_base.js';
import {Limits} from '../../redux/state_types.js';

import {LimitsBase} from './limits_base.js';

/** Default minimum FOV angle (degrees) */
export const DEFAULT_MIN_FOV = 10;

/** Default maximum FOV angle (degrees) */
export const DEFAULT_MAX_FOV = 90;

/** Dispatch change to maximum FOV */
export const dispatchFovLimits = registerStateMutator(
    'SET_CAMERA_FOV_LIMITS', (state, fovLimitsDeg?: Limits) => {
      if (!fovLimitsDeg) {
        throw new Error('No valid FOV limit given');
      }
      if (fovLimitsDeg === state.camera.fovLimitsDeg) {
        throw new Error(
            'Do not edit fovLimitsDeg in place. You passed in the same object');
      }

      state.camera = {
        ...state.camera,
        fovLimitsDeg,
      };
    });


/** The Camera Settings panel. */
@customElement('me-camera-fov-limits')
export class FovLimits extends LimitsBase {
  @internalProperty() fovLimitsDeg?: Limits;
  @internalProperty() currentCamera?: Camera;

  stateChanged(state: State) {
    this.fovLimitsDeg = state.camera.fovLimitsDeg;
    this.currentCamera = state.currentCamera;
  }

  dispatchLimits(limits?: Limits) {
    dispatchFovLimits(limits);
  }

  get label() {
    return 'Field of view';
  }

  get absoluteMinimum() {
    return DEFAULT_MIN_FOV;
  }

  get absoluteMaximum() {
    return DEFAULT_MAX_FOV;
  }

  get currentPreviewValue() {
    return Math.round(this.currentCamera?.fieldOfViewDeg ?? DEFAULT_MIN_FOV);
  }

  get limitsProperty() {
    return this.fovLimitsDeg;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-fov-limits': FovLimits;
  }
}
