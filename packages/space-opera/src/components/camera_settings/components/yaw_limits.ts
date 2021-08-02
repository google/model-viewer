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
import {getCameraState, getModelViewer} from '../../model_viewer_preview/reducer.js';
import {dispatchYawLimits, getCamera, getIsDirtyCamera} from '../reducer.js';
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
  @internalProperty() isDirtyCamera: boolean = false;

  stateChanged(state: State) {
    this.limitsProperty = getCamera(state).yawLimitsDeg;
    this.isDirtyCamera = getIsDirtyCamera(state);
  }

  dispatchLimits(limits?: Limits) {
    reduxStore.dispatch(dispatchYawLimits(limits));
  }

  get label() {
    return 'Apply Yaw Limits';
  }

  get minimumLabel() {
    return 'Counter-Clockwise Limit';
  }

  get maximumLabel() {
    return 'Clockwise Limit';
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
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-yaw-limits': YawLimits;
  }
}
