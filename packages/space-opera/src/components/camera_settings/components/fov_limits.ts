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
import {dispatchFovLimits} from '../reducer.js';
import {Limits} from '../types.js';

import {LimitsBase} from './limits_base.js';

/** Default minimum FOV angle (degrees) */
export const DEFAULT_MIN_FOV = 10;

/** Default maximum FOV angle (degrees) */
export const DEFAULT_MAX_FOV = 90;

/** The Camera Settings panel. */
@customElement('me-camera-fov-limits')
export class FovLimits extends LimitsBase {
  @internalProperty() fovLimitsDeg?: Limits;
  @internalProperty() toggle: boolean = false;

  stateChanged(state: State) {
    this.fovLimitsDeg = state.entities.modelViewerSnippet.camera.fovLimitsDeg;
    this.toggle = state.entities.currentCamera.toggle;
  }

  dispatchLimits(limits?: Limits) {
    reduxStore.dispatch(dispatchFovLimits(limits));
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
