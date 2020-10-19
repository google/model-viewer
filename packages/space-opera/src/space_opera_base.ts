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

import {GltfModel, ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';
import * as Redux from 'redux';  // from //third_party/javascript/redux:redux_closurized

import {Camera, INITIAL_CAMERA} from './components/camera_settings/camera_state.js';
import {HotspotConfig} from './components/hotspot_panel/hotspot_config.js';
import {INITIAL_ENVIRONMENT_IMAGES} from './components/ibl_selector/initial_environment_images.js';
import {EnvironmentImage} from './components/ibl_selector/lighting_state.js';
import {GltfEdits, INITIAL_GLTF_EDITS} from './components/model_viewer_preview/gltf_edits.js';
import {RESET_STATE_ACTION_TYPE} from './components/reset/reducer.js';

/**
 * Space Opera state.
 */
export interface State {
  modelViewer?: ModelViewerElement;
  config: ModelViewerConfig;
  // This should only be modified by actions that load entirely new glTFs.
  gltfUrl?: string;
  // This is just a shared reference, not essential state. The object referenced
  // is NOT immutable, for example.
  gltf?: GltfModel;
  animationNames: string[];
  gltfJsonString: string;
  edits: GltfEdits;
  // A copy of the original, so we can revert individual properties.
  origEdits: GltfEdits;
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

export const INITIAL_STATE: State = {
  config: {},
  edits: INITIAL_GLTF_EDITS,
  origEdits: INITIAL_GLTF_EDITS,
  animationNames: [],
  gltfJsonString: '',
  camera: INITIAL_CAMERA,
  initialCamera: INITIAL_CAMERA,
  hotspots: [],
  playAnimation: true,
  environmentImages: INITIAL_ENVIRONMENT_IMAGES,
};

export interface Action extends Redux.Action {
  type: string;
  payload?: any;
}

const subReducers = new Map<string, Redux.Reducer<State>>();

function makeRootReducer() {
  return (state: State = INITIAL_STATE, action: Action) => {
    if (action.type === RESET_STATE_ACTION_TYPE) {
      return INITIAL_STATE;
    }
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

/**
 * Convenience function for components that import GLBs.
 * We consider "staging config" to be properties that are applicable to any
 * model, and thus are sensible to preserve when a new model is loaded.
 */
export function extractStagingConfig(config: ModelViewerConfig):
    ModelViewerConfig {
  return {
    environmentImage: config.environmentImage, exposure: config.exposure,
        useEnvAsSkybox: config.useEnvAsSkybox,
        shadowIntensity: config.shadowIntensity,
        shadowSoftness: config.shadowSoftness,
        cameraControls: config.cameraControls, autoRotate: config.autoRotate,
  }
}

/** Setup devtools */
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof Redux.compose;
  }
}
const composeEnhancers =
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || Redux.compose

/** Global Redux store. */
export const reduxStore =
    Redux.createStore(makeRootReducer(), composeEnhancers());