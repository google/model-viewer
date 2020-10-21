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

import {combineReducers} from 'redux';

import {animationInfoReducer} from './components/animation_controls/reducer.js';
import {cameraReducer, currentCameraReducer, initialCameraReducer} from './components/camera_settings/reducer.js'
import {configReducer} from './components/config/reducer.js';
import {hotspotsInfoReducer} from './components/hotspot_panel/reducer.js';
import {environmentImagesReducer} from './components/ibl_selector/reducer.js'
import {editsReducer} from './components/materials_panel/reducer.js';
import {gltfInfoReducer, origEditsReducer} from './components/model_viewer_preview/reducer.js';
import {modelViewerInfoReducer} from './components/model_viewer_preview/reducer.js';

export const rootReducer = combineReducers({
  config: configReducer,
  edits: editsReducer,
  origEdits: origEditsReducer,
  animationInfo: animationInfoReducer,
  camera: cameraReducer,
  initialCamera: initialCameraReducer,
  hotspotInfo: hotspotsInfoReducer,
  environmentImages: environmentImagesReducer,
  modelViewerInfo: modelViewerInfoReducer,
  currentCamera: currentCameraReducer,
  gltfInfo: gltfInfoReducer,
});

export type RootState = ReturnType<typeof rootReducer>