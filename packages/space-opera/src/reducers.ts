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

import {animationNamesReducer} from './components/animation_controls/reducer.js';
import {cameraReducer, isDirtyCameraReducer} from './components/camera_settings/reducer.js'
import {configReducer} from './components/config/reducer.js';
import {hotspotsReducer, hotspotsUiReducer} from './components/hotspot_panel/reducer.js';
import {environmentReducer} from './components/ibl_selector/reducer.js'
import {editsReducer, origEditsReducer} from './components/materials_panel/reducer.js';
import {arReducer, isRefreshableReducer} from './components/mobile_view/reducer.js';
import {gltfReducer} from './components/model_viewer_preview/reducer.js';
import {relativeFilePathsReducer} from './components/relative_file_paths/reducer.js';

const gltfEditsReducer =
    combineReducers({edits: editsReducer, origEdits: origEditsReducer});

const modelViewerSnippetReducer = combineReducers({
  arConfig: arReducer,
  animationNames: animationNamesReducer,
  camera: cameraReducer,
  config: configReducer,
  hotspots: hotspotsReducer,
  relativeFilePaths: relativeFilePathsReducer,
});

const entitiesReducer = combineReducers({
  isDirtyCamera: isDirtyCameraReducer,
  isRefreshable: isRefreshableReducer,
  environment: environmentReducer,
  gltf: gltfReducer,
  gltfEdits: gltfEditsReducer,
  modelViewerSnippet: modelViewerSnippetReducer
});

const uiReducer = combineReducers({hotspots: hotspotsUiReducer});

export const rootReducer =
    combineReducers({entities: entitiesReducer, ui: uiReducer});

export type RootState = ReturnType<typeof rootReducer>