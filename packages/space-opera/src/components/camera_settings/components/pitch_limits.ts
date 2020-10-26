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

import {reduxStore} from '../../../space_opera_base.js';
import {State} from '../../../types.js';
import {getModelViewer} from '../../model_viewer_preview/model_viewer.js';
import {getCameraState} from '../../model_viewer_preview/model_viewer_preview.js';
import {dispatchPitchLimits} from '../reducer.js';
import {Limits} from '../types.js';

import {LimitsBase} from './limits_base.js';

// Pitch is degrees from the up-vector.

/** Default minimum pitch angle (degrees) */
export const DEFAULT_MIN_PITCH = 0;

/** Default maximum pitch angle (degrees) */
export const DEFAULT_MAX_PITCH = 180;


/** The Camera Settings panel. */
@customElement('me-camera-pitch-limits')
export class PitchLimits extends LimitsBase {
  @internalProperty() pitchLimitsDeg?: Limits;
  @internalProperty() toggle: boolean = false;

  stateChanged(state: State) {
    this.pitchLimitsDeg =
        state.entities.modelViewerSnippet.camera.pitchLimitsDeg;
    this.toggle = state.entities.cameraToggle;
  }

  dispatchLimits(limits?: Limits) {
    reduxStore.dispatch(dispatchPitchLimits(limits));
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
    const currentCamera = getCameraState(getModelViewer()!);
    if (!currentCamera || !currentCamera.orbit)
      return 0;
    return Math.round(currentCamera.orbit.phiDeg);
  }

  get limitsProperty() {
    return this.pitchLimitsDeg;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-pitch-limits': PitchLimits;
  }
}
