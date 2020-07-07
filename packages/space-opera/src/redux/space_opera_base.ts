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

import * as Redux from 'redux'; // from //third_party/javascript/redux:redux_closurized

import {GltfModel, ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'

import {Camera, INITIAL_CAMERA} from './camera_state.js';
import {EnvironmentImage} from './environment_lighting_state.js';
import {getGltfEdits, GltfEdits, INITIAL_GLTF_EDITS} from './gltf_edits.js';
import {HotspotConfig} from './hotspot_config.js';
import {INITIAL_ENVIRONMENT_IMAGES} from './initial_environment_images.js';

/**
 * Space Opera state.
 */
export interface State {
  config: ModelViewerConfig;
  // This should only be modified by actions that load entirely new glTFs.
  gltfUrl?: string;
  // This is just a shared reference, not essential state. The object referenced
  // is NOT immutable, for example.
  gltf?: GltfModel;
  animationNames: string[];
  gltfJsonString: string;
  edits: GltfEdits;
  playAnimation?: boolean;
  camera: Camera;
  // This reflects the camera values as they were after model-viewer loaded.
  initialCamera: Camera;
  currentCamera?: Camera;
  // A list of hotspots to render.
  hotspots: HotspotConfig[];
  // On true, a click on Model-viewer tag would add a hotspot to the clicked
  // position
  addHotspotMode?: boolean;
  // A list of user provided environment images to select from
  environmentImages: EnvironmentImage[];
}

const INITIAL_STATE: State = {
  config: {},
  edits: INITIAL_GLTF_EDITS,
  animationNames: [],
  gltfJsonString: '',
  camera: INITIAL_CAMERA,
  initialCamera: INITIAL_CAMERA,
  hotspots: [],
  playAnimation: true,
  environmentImages: INITIAL_ENVIRONMENT_IMAGES,
};

interface Action extends Redux.Action {
  type: string;
}

const subReducers = new Map<string, Redux.Reducer<State>>();

function makeRootReducer() {
  return (state: State = INITIAL_STATE, action: Action) => {
    const subReducer = subReducers.get(action.type);
    if (subReducer) {
      return subReducer(state, action);
    } else {
      // It's fine to not have a reducer for an action. Such as, redux built-in
      // actions.
      return state;
    }
  };
}

/** Global Redux store. */
export const reduxStore = Redux.createStore(makeRootReducer());

/**
 * A synchronous mutator of fixed paylod type.
 */
export type StateMutator<T> = (state: State, payload?: T) => void;

/**
 * For better or worse, a common usecase in our codebase is a single user action
 * which maps to a specific, localized state change. To reduce boilerplate for
 * this case, we provide a mechanism to automatically register a named action
 * along with its accompanying state mutator.
 */
class TypedAction<T> implements Action {
  type: string = '';
  payload?: T;
}

/**
 * Call this function to register your state mutator. It will return a bound
 * function which you can use to dispatch future payloads to the store, or you
 * can directly construct and dispatch actions through the usual path.
 */
export function registerStateMutator<T>(
    actionType: string, stateMutator: StateMutator<T>) {
  if (subReducers.has(actionType)) {
    throw new Error(
        `Duplicate mutator action type: ${actionType} - not allowed.`);
  }

  const subReducer = (state = INITIAL_STATE, action: TypedAction<T>) => {
    if (action.type !== actionType) {
      throw new Error(`Reducer was called for the wrong action type. Expected ${
          actionType}, got ${action.type}`);
    }
    state = {...state};
    stateMutator(state, action.payload);
    return state;
  };
  subReducers.set(actionType, subReducer);

  // Update the root reducer
  reduxStore.replaceReducer(makeRootReducer());

  return (payload?: T) => {
    reduxStore.dispatch({type: actionType, payload});
  };
}

/** The user has requested a new GLTF/GLB for editing. */
export const dispatchGltfUrl =
    registerStateMutator('SET_GLTF_URL', (state: State, gltfUrl?: string) => {
      state.gltfUrl = gltfUrl;
    });

class DispatchGltfArgs {
  constructor(
      readonly gltf: GltfModel|undefined, readonly edits: GltfEdits,
      readonly animationNames: string[], readonly jsonString: string) {}
}

const dispatchGltf = registerStateMutator(
    'SET_GLTF', (state: State, args?: DispatchGltfArgs) => {
      if (!args) {
        throw new Error(`No args given!`);
      }
      const gltf = args.gltf;
      if (gltf !== undefined && state.gltf === gltf) {
        throw new Error(
            `Same gltf was given! Only call this upon actual change`);
      }
      state.gltf = gltf;

      const edits = args.edits;
      if (!edits) {
        throw new Error(`Must give valid edits!`);
      }
      if (state.edits === edits) {
        throw new Error(
            `Same edits was given! Only call this upon actual change`);
      }
      state.edits = edits;
      state.animationNames = args.animationNames;
      state.gltfJsonString = args.jsonString;
    });

/**
 * Helper async function
 */
export async function dispatchGltfAndEdits(gltf: GltfModel|undefined) {
  // NOTE: This encodes a design decision: Whether or not we reset edits
  // upon loading a new GLTF. It may be sensible to not reset edits and just
  // apply previous edits to the same, but updated, GLTF. That could be
  // later exposed as an option, and in that case we would simply apply the
  // existing edits (with null previousEdits) to this new model and not
  // dispatch new edits.
  const edits = gltf ? await getGltfEdits(gltf) : {...INITIAL_GLTF_EDITS};
  dispatchGltf(new DispatchGltfArgs(
      gltf, edits, (await gltf?.animationNames) ?? [],
      (await gltf?.jsonString) ?? ''));
}

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

/**
 * Used to initialize camera state with model-viewer's initial state. This means
 * we can rely on it to parse things like camera orbit strings, rather than
 * doing it ourselves.
 */
export const dispatchInitialCameraState = registerStateMutator(
    'SET_INITIAL_CAMERA_STATE', (state, initialCamera?: Camera) => {
      if (!initialCamera) return;
      state.initialCamera = {...initialCamera};
    });

/**
 * For any component to use when they need to reference the current preview
 * camera state.
 */
export const dispatchCurrentCameraState = registerStateMutator(
    'SET_CURRENT_CAMERA_STATE', (state, currentCamera?: Camera) => {
      if (!currentCamera) return;
      state.currentCamera = {...currentCamera};
    });
