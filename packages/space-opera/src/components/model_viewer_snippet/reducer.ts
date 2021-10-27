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

import {Action, ImageType, INITIAL_STATE, ModelViewerConfig, ModelViewerSnippetState, PosterConfig, RelativeFilePathsState, State} from '../../types.js';

export const getModelViewerSnippet = (state: State): ModelViewerSnippetState =>
    state.entities.modelViewerSnippet;

/**
 * Sets the filepaths of a copy of the config.
 * Used when displaying and exporting the snippet.
 * NOT used inside the actual model-viewer element.
 */
export function applyRelativeFilePaths(
    editedConfig: ModelViewerConfig,
    gltfUrl: string|undefined,
    relativeFilePaths: RelativeFilePathsState) {
  if (gltfUrl) {
    editedConfig.src = relativeFilePaths.modelName
  } else {
    editedConfig.src = 'Upload model...';
  }

  if (editedConfig.environmentImage) {
    editedConfig.environmentImage = relativeFilePaths.environmentName;
  }

  editedConfig.poster = relativeFilePaths.posterName;
}

const SET_EXTRA_ATTRIBUTES = 'SET_EXTRA_ATTRIBUTES';
export function dispatchExtraAttributes(attributes: any) {
  return {type: SET_EXTRA_ATTRIBUTES, payload: attributes};
}

export const getExtraAttributes = (state: State): any =>
    state.entities.modelViewerSnippet.extraAttributes;

export function extraAttributesReducer(
    state: any = INITIAL_STATE.entities.modelViewerSnippet.extraAttributes,
    action: Action): any {
  switch (action.type) {
    case SET_EXTRA_ATTRIBUTES:
      return action.payload;
    default:
      return state;
  }
}

const SET_HEIGHT = 'SET_HEIGHT';
export function dispatchHeight(height: number) {
  return {type: SET_HEIGHT, payload: height};
}

const SET_MIMETYPE = 'SET_MIMETYPE';
export function dispatchMimeType(type: ImageType) {
  return {type: SET_MIMETYPE, payload: type};
}

export function getPosterConfig(state: State) {
  return state.entities.modelViewerSnippet.poster;
}

export function posterReducer(
    state: PosterConfig = INITIAL_STATE.entities.modelViewerSnippet.poster,
    action: Action): PosterConfig {
  switch (action.type) {
    case SET_HEIGHT:
      return {...state, height: action.payload};
    case SET_MIMETYPE:
      return {...state, mimeType: action.payload};
    default:
      return state;
  }
}
