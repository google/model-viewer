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

import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {Action, State} from '../../types.js';
import {GltfState} from '../model_viewer_preview/types.js';

/** The user has requested a new GLTF/GLB for editing. */
const SET_GLTF = 'SET_GLTF'
export function dispatchSetGltf(gltf: GltfModel|undefined) {
  return {type: SET_GLTF, payload: gltf};
}

const SET_GLTF_URL = 'SET_GLTF_URL'
export function dispatchGltfUrl(gltfUrl?: string|undefined) {
  return {type: SET_GLTF_URL, payload: gltfUrl};
}

const SET_GLTF_JSON_STRING = 'SET_GLTF_JSON_STRING'
export function dispatchGltfJsonString(gltfJsonString?: string) {
  return {type: SET_GLTF_JSON_STRING, payload: gltfJsonString};
}

export const getGltfUrl = (state: State) => state.entities.gltf.gltfUrl;
export const getGltfJsonString = (state: State) =>
    state.entities.gltf.gltfJsonString;
export const getGltfModel = (state: State) => state.entities.gltf.gltf;

export function gltfReducer(
    state: GltfState = {
      gltfJsonString: ''
    },
    action: Action): GltfState {
  switch (action.type) {
    case SET_GLTF:
      return {
        ...state, gltf: action.payload
      }
    case SET_GLTF_URL:
      return {
        ...state, gltfUrl: action.payload
      }
    case SET_GLTF_JSON_STRING:
      return {
        ...state, gltfJsonString: action.payload
      }
    default:
      return state;
  }
}
