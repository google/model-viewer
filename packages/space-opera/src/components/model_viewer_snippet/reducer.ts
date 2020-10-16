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

import {registerStateMutator} from '../../space_opera_base.js';
import {State} from '../../space_opera_base.js';
import {INITIAL_CAMERA} from '../camera_settings/camera_state.js';

/** Use when the user wants to load a new config (probably from a snippet). */
export const dispatchConfig = registerStateMutator(
    'MODEL_VIEWER_CONFIG', (state: State, config?: ModelViewerConfig) => {
      if (!config) {
        throw new Error('No config given!');
      }
      if (config === state.config) {
        throw new Error(`Do not modify state.config in place!`);
      }
      state.config = config;

      // Clear camera settings. This is optional!
      state.camera = INITIAL_CAMERA;

      // Clear initialCamera too, as ModelViewerPreview will update this.
      state.initialCamera = INITIAL_CAMERA;
      delete state.currentCamera;
    });
