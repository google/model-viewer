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

import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import * as Redux from 'redux';  // from //third_party/javascript/redux:redux_closurized
import {AnimationInfo} from './components/animation_controls/types.js';

import {Camera, CurrentCamera, INITIAL_CAMERA} from './components/camera_settings/camera_state.js';
import {HotspotInfoConfig} from './components/hotspot_panel/types.js';
import {INITIAL_ENVIRONMENT_IMAGES} from './components/ibl_selector/initial_environment_images.js';
import {EnvironmentImage} from './components/ibl_selector/lighting_state.js';
import {GltfEdits, GltfState, INITIAL_GLTF_EDITS, ModelViewerInfo} from './components/model_viewer_preview/types.js';

export interface HotspotsUIState {
  addHotspot: boolean;
}

export interface UIState {
  hotspots: HotspotsUIState;
}

export interface EnvironmentState {
  environmentImages: EnvironmentImage[];
}

export interface EntitiesState {
  environment: EnvironmentState;
  gltf: GltfState;
}

/**
 * Space Opera state.
 */
export interface State {
  modelViewerInfo: ModelViewerInfo;
  config: ModelViewerConfig;
  animationInfo: AnimationInfo;
  edits: GltfEdits;
  origEdits: GltfEdits;
  camera: Camera;
  // This reflects the camera values as they were after model-viewer loaded.
  initialCamera: Camera;
  currentCamera: CurrentCamera;
  hotspotInfo: HotspotInfoConfig;
  entities: EntitiesState;
  ui: UIState;
}

export const INITIAL_STATE: State = {
  ui: {hotspots: {addHotspot: false}},
  modelViewerInfo: {},
  currentCamera: {toggle: false},
  config: {},
  edits: INITIAL_GLTF_EDITS,
  origEdits: INITIAL_GLTF_EDITS,
  animationInfo: {animationNames: []},
  camera: INITIAL_CAMERA,
  initialCamera: INITIAL_CAMERA,
  hotspotInfo: {hotspots: []},
  entities: {
    environment: {environmentImages: INITIAL_ENVIRONMENT_IMAGES},
    gltf: {gltfJsonString: ''},
  },
};

export interface Action extends Redux.Action {
  type: string;
  payload?: any;
}

/**
 * Convenience function for components that import GLBs.
 * We consider "staging config" to be properties that are applicable to
 * any model, and thus are sensible to preserve when a new model is
 * loaded.
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