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

import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js';

import {reduxStore} from '../../space_opera_base.js';
import {INITIAL_CAMERA} from '../camera_settings/camera_state.js';
import {dispatchInitialCameraState, dispatchSetCamera} from '../camera_settings/reducer.js';
import {dispatchSetConfig} from '../config/reducer.js';

/** Use when the user wants to load a new config (probably from a snippet). */
export function dispatchConfig(config?: ModelViewerConfig) {
  if (!config) {
    throw new Error('No config given!');
  }

  reduxStore.dispatch(dispatchSetConfig(config));

  // Clear camera settings. This is optional!
  reduxStore.dispatch(dispatchSetCamera(INITIAL_CAMERA));

  // Clear initialCamera too, as ModelViewerPreview will update this.
  reduxStore.dispatch(dispatchInitialCameraState(INITIAL_CAMERA));

  // This should only be done if they aren't set
  // reduxStore.dispatch(dispatchRadiusLimits(INITIAL_RADIUS_LIMITS));

  // reduxStore.dispatch(dispatchFovLimits(INITIAL_FOV_LIMITS));
}
