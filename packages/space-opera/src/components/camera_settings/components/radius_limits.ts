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
import {Camera} from '../camera_state.js';
import {dispatchRadiusLimits} from '../reducer.js';
import {Limits} from '../types.js';

import {LimitsBase} from './limits_base.js';

/** Absolute minimum radius (meters) */
export const DEFAULT_MIN_RADIUS = 0;

/** The Camera Settings panel. */
@customElement('me-camera-radius-limits')
export class RadiusLimits extends LimitsBase {
  @internalProperty() radiusLimits?: Limits;
  @internalProperty() initialCamera?: Camera;
  @internalProperty() toggle: boolean = false;

  stateChanged(state: State) {
    this.radiusLimits = state.camera.radiusLimits;
    this.initialCamera = state.initialCamera;
    this.toggle = state.currentCamera.toggle;
  }

  dispatchLimits(limits?: Limits) {
    reduxStore.dispatch(dispatchRadiusLimits(limits));
  }

  get label() {
    return 'Radius (distance)';
  }

  get absoluteMinimum() {
    return DEFAULT_MIN_RADIUS;
  }

  get absoluteMaximum() {
    // TODO: Read the bounding box and set something reasonable
    // based on it.
    return Math.ceil((this.initialCamera?.orbit?.radius ?? 1) * 5);
  }

  get currentPreviewValue() {
    const currentCamera = getCameraState(getModelViewer()!);
    return currentCamera.orbit?.radius ?? 1;
  }

  get limitsProperty() {
    return this.radiusLimits;
  }

  get decimalPlaces() {
    return Math.max(0, 2 - Math.round(Math.log10(this.absoluteMaximum)));
  }

  get sliderStep() {
    return this.absoluteMaximum / 100;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-radius-limits': RadiusLimits;
  }
}
