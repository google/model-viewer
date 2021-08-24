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

import {bestPracticesReducer} from './components/best_practices/reducer.js';
import {isDirtyCameraReducer} from './components/camera_settings/reducer.js'
import {configReducer} from './components/config/reducer.js';
import {hotspotsReducer, hotspotsUiReducer} from './components/hotspot_panel/reducer.js';
import {environmentReducer} from './components/ibl_selector/reducer.js'
import {arReducer, mobileReducer} from './components/mobile_view/reducer.js';
import {modelReducer} from './components/model_viewer_preview/reducer.js';
import {extraAttributesReducer, posterReducer} from './components/model_viewer_snippet/reducer.js';
import {relativeFilePathsReducer} from './components/relative_file_paths/reducer.js';
import {INITIAL_STATE} from './types.js';

const modelViewerSnippetReducer = combineReducers({
  arConfig: arReducer,
  bestPractices: bestPracticesReducer,
  config: configReducer,
  poster: posterReducer,
  hotspots: hotspotsReducer,
  relativeFilePaths: relativeFilePathsReducer,
  extraAttributes: extraAttributesReducer,
});

const entitiesReducer = combineReducers({
  isDirtyCamera: isDirtyCameraReducer,
  mobile: mobileReducer,
  environment: environmentReducer,
  model: modelReducer,
  modelViewerSnippet: modelViewerSnippetReducer
});

const uiReducer = combineReducers({hotspots: hotspotsUiReducer});

const combinedReducer =
    combineReducers({entities: entitiesReducer, ui: uiReducer});

export const RESET_STORE = 'RESET_STORE';
export function dispatchReset() {
  return {type: RESET_STORE};
};

export const rootReducer = (state, action) => {
  if (action.type === RESET_STORE) {
    state = INITIAL_STATE;
  }
  return combinedReducer(state, action);
};

export type RootState = ReturnType<typeof rootReducer>