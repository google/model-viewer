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
import {dispatchYawLimits, getCamera} from '../reducer.js';
import {Limits} from '../types.js';

import {LimitsBase} from './limits_base.js';

// Yaw is degrees from forward.

/** Default minimum yaw angle (degrees) */
export const DEFAULT_MIN_YAW = -180;

/** Default maximum yaw angle (degrees) */
export const DEFAULT_MAX_YAW = 180;


/** The Camera Settings panel. */
@customElement('me-camera-yaw-limits')
export class YawLimits extends LimitsBase {
  @internalProperty() yawLimitsDeg?: Limits;
  @internalProperty() toggle: boolean = false;

  stateChanged(state: State) {
    this.yawLimitsDeg = getCamera(state).yawLimitsDeg;
    this.toggle = state.entities.cameraToggle;
  }

  dispatchLimits(limits?: Limits) {
    reduxStore.dispatch(dispatchYawLimits(limits));
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
    const currentCamera = getCameraState(getModelViewer()!);
    return Math.round(currentCamera.orbit?.thetaDeg ?? 0);
  }

  get limitsProperty() {
    return this.yawLimitsDeg;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-yaw-limits': YawLimits;
  }
}
