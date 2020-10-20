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
import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';

import {reduxStore} from '../../space_opera_base.js';
import {Action} from '../../types.js';
import {dispatchSetEdits} from '../materials_panel/reducer.js';
import {getGltfEdits, GltfEdits, INITIAL_GLTF_EDITS} from '../model_viewer_preview/gltf_edits.js';

// ANIMATION NAMES //////////////

const SET_ANIMATION_NAMES = 'SET_ANIMATION_NAMES';
export function dispatchSetAnimationNames(animationNames: string[]) {
  reduxStore.dispatch({type: SET_ANIMATION_NAMES, payload: animationNames});
}

export function animationNamesReducer(
    state: string[] = [], action: Action): string[] {
  switch (action.type) {
    case SET_ANIMATION_NAMES:
      return action.payload;
    default:
      return state;
  }
}

// GLTF URL //////////////

/** The user has requested a new GLTF/GLB for editing. */
const SET_GLTF_URL = 'SET_GLTF_URL'
export function dispatchGltfUrl(gltfUrl?: string|undefined) {
  reduxStore.dispatch({type: SET_GLTF_URL, payload: gltfUrl});
}

export function
gltfUrlReducer(state: string|undefined, action: Action):
    string|undefined {
      switch (action.type) {
        case SET_GLTF_URL:
          return action.payload;
        default:
          return state;
      }
    }

class DispatchGltfArgs {
  constructor(
      readonly gltf: GltfModel|undefined, readonly edits: GltfEdits,
      readonly animationNames: string[], readonly jsonString: string) {
  }
}

// GLTF //////////////
const SET_GLTF = 'SET_GLTF'
export function dispatchSetGltf(gltf: GltfModel|undefined) {
  reduxStore.dispatch({type: SET_GLTF, payload: gltf});
}

export function gltfReducer(state: GltfModel|undefined, action: Action):
    GltfModel|undefined {
      switch (action.type) {
        case SET_GLTF:
          return action.payload;
        default:
          return state;
      }
    }

// GLTF JSON STRING//////////////
const SET_GLTF_JSON_STRING = 'SET_GLTF_JSON_STRING'
export function dispatchGltfJsonString(gltfJsonString?: string) {
  reduxStore.dispatch({type: SET_GLTF_JSON_STRING, payload: gltfJsonString});
}

export function gltfJsonStringReducer(state: string = '', action: Action):
    string {
      switch (action.type) {
        case SET_GLTF_JSON_STRING:
          return action.payload;
        default:
          return state;
      }
    }

// Orig Edits //////////////
const SET_ORIG_EDITS = 'SET_ORIG_EDITS'
export function dispatchSetOrigEdits(origEdits: GltfEdits) {
  reduxStore.dispatch({type: SET_ORIG_EDITS, payload: origEdits});
}

export function origEditsReducer(
    state: GltfEdits = INITIAL_GLTF_EDITS, action: Action):
    GltfEdits {
      switch (action.type) {
        case SET_ORIG_EDITS:
          return action.payload;
        default:
          return state;
      }
    }


function dispatchGltf(args?: DispatchGltfArgs) {
  if (!args) {
    throw new Error(`No args given!`);
  }
  const gltf = args.gltf;
  if (gltf !== undefined && reduxStore.getState().gltf === gltf) {
    throw new Error(`Same gltf was given! Only call this upon actual change`);
  }
  dispatchSetGltf(gltf);

  const edits = args.edits;
  if (!edits) {
    throw new Error(`Must give valid edits!`);
  }
  if (reduxStore.getState().edits === edits) {
    throw new Error(`Same edits was given! Only call this upon actual change`);
  }
  dispatchSetEdits(edits);
  dispatchSetOrigEdits(edits);
  dispatchSetAnimationNames(args.animationNames);
  dispatchGltfJsonString(args.jsonString);
}

/**
 * Helper async function
 */
export function dispatchGltfAndEdits(gltf: GltfModel|undefined) {
  // NOTE: This encodes a design decision: Whether or not we reset edits
  // upon loading a new GLTF. It may be sensible to not reset edits and just
  // apply previous edits to the same, but updated, GLTF. That could be
  // later exposed as an option, and in that case we would simply apply the
  // existing edits (with null previousEdits) to this new model and not
  // dispatch new edits.
  const edits = gltf ? getGltfEdits(gltf) : {...INITIAL_GLTF_EDITS};
  dispatchGltf(new DispatchGltfArgs(
      gltf, edits, (gltf?.animationNames) ?? [], (gltf?.jsonString) ?? ''));
}

// MODEL VIEWER //////////////

/** Only use in intialization. */
const MODEL_VIEWER = 'MODEL_VIEWER';
export function dispatchModelViewer(modelViewer?: ModelViewerElement) {
  reduxStore.dispatch({type: MODEL_VIEWER, paylaod: modelViewer});
}

export function modelViewerReducer(
    state: ModelViewerElement|undefined, action: Action): ModelViewerElement|
    undefined {
  switch (action.type) {
    case MODEL_VIEWER:
      return action.payload;
    default:
      return state;
  }
}