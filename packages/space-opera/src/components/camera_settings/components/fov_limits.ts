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
// import {getFOV, getOrbitString} from '../camera_state.js';
import {dispatchFovLimits, getCamera, getIsDirtyCamera} from '../reducer.js';
import {Limits} from '../types.js';

import {LimitsBase} from './limits_base.js';

/** Default minimum FOV angle (degrees) */
export const DEFAULT_MIN_FOV = 10;

/** Default maximum FOV angle (degrees) */
export const DEFAULT_MAX_FOV = 45;

/** The Camera Settings panel. */
@customElement('me-camera-fov-limits')
export class FovLimits extends LimitsBase {
  @internalProperty() fovLimitsDeg?: Limits;
  @internalProperty() isDirtyCamera: boolean = false;

  stateChanged(state: State) {
    this.fovLimitsDeg = getCamera(state).fovLimitsDeg;
    this.isDirtyCamera = getIsDirtyCamera(state);
  }

  // Only called on setting the minumum value for fov
  dispatchLimits(limits: Limits) {
    if (limits === undefined || typeof limits.min === 'string') {
      throw new Error('FOV Limits undefined or fov.min is a string');
    }

    // Update radius/fov of model viewer if minimum zoom checkbox is active
    // if (limits.enabled) {
    //   const modelViewer = getModelViewer()!;
    //   // Set radius to 0 to clamp radius, thus keeping it in synv with the
    //   FOV
    //   // when we are setting the minimum FOV value.
    //   const currentCamera = getCameraState(getModelViewer()!);
    //   if (currentCamera.orbit !== undefined) {
    //     const orb = {...currentCamera.orbit, radius: 0};
    //     const newOrbit = getOrbitString(orb);
    //     modelViewer.cameraOrbit = newOrbit;
    //   }
    //   // Set current FOV to the minimum value to keep the actual minimum
    //   // zoomed represention visible in the model viewer element on the page
    //   // but do NOT dispatch it, because that would set the FOV in the
    //   initial
    //   // FOV to the value.
    //   modelViewer.fieldOfView = getFOV(limits.min);
    // }

    // reduxStore.dispatch(dispatchFovDeg(limits.min));
    const actualLimits: Limits = {...limits, max: 'auto'};
    reduxStore.dispatch(
        dispatchFovLimits(actualLimits));  // uses fov limits to set

    // set min radius limit to current
    // const currentCamera = getCameraState(getModelViewer()!);
    // const radiusLimits: Limits = {
    //   enabled: true,
    //   min: currentCamera.orbit?.radius!,
    //   max: currentCamera.radiusLimits?.max!
    // };

    // if (typeof radiusLimits.min !== 'string') {
    //   reduxStore.dispatch(dispatchSetMinZoom(limits.min, radiusLimits.min));
    // }
  }

  get label() {
    return 'Zoom';
  }

  get absoluteMinimum() {
    return DEFAULT_MIN_FOV;
  }

  get absoluteMaximum() {
    return DEFAULT_MAX_FOV;
  }

  get currentPreviewValue() {
    const currentCamera = getCameraState(getModelViewer()!);
    return Math.round(currentCamera.fieldOfViewDeg ?? DEFAULT_MIN_FOV);
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
