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

import {radToDeg} from '@google/model-viewer-editing-adapter/lib/util/math.js'
import {Camera} from '../../redux/camera_state.js';
import {registerStateMutator, State} from '../../redux/space_opera_base.js';
import {Limits} from '../../redux/state_types.js';

import {LimitsBase} from './limits_base.js';

// Pitch is degrees from the up-vector.

/** Default minimum pitch angle (degrees) */
export const DEFAULT_MIN_PITCH = 0;

/** Default maximum pitch angle (degrees) */
export const DEFAULT_MAX_PITCH = 180;

/** Dispatch change to maximum pitch */
export const dispatchPitchLimits = registerStateMutator(
    'SET_CAMERA_PITCH_LIMITS', (state, pitchLimits?: Limits) => {
      if (!pitchLimits) {
        throw new Error('No valid limits given');
      }
      if (pitchLimits === state.camera.pitchLimits) {
        throw new Error(
            'Do not edit pitchLimits in place. You passed in the same object');
      }

      state.camera = {
        ...state.camera,
        pitchLimits,
      };
    });


/** The Camera Settings panel. */
@customElement('me-camera-pitch-limits')
export class PitchLimits extends LimitsBase {
  @internalProperty() pitchLimits?: Limits;
  @internalProperty() currentCamera?: Camera;

  stateChanged(state: State) {
    this.pitchLimits = state.camera.pitchLimits;
    this.currentCamera = state.currentCamera;
  }

  dispatchLimits(limits?: Limits) {
    dispatchPitchLimits(limits);
  }

  get label() {
    return 'Pitch';
  }

  get absoluteMinimum() {
    return DEFAULT_MIN_PITCH;
  }

  get absoluteMaximum() {
    return DEFAULT_MAX_PITCH;
  }

  get currentPreviewValue() {
    if (!this.currentCamera || !this.currentCamera.orbit) return 0;
    return Math.round(radToDeg(this.currentCamera.orbit.phi));
  }

  get limitsProperty() {
    return this.pitchLimits;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-pitch-limits': PitchLimits;
  }
}
