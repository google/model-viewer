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

import {Camera, INITIAL_CAMERA} from './components/camera_settings/camera_state.js';
import {HotspotConfig} from './components/hotspot_panel/types.js';
import {EnvironmentImage, INITIAL_ENVIRONMENT_IMAGES} from './components/ibl_selector/types.js';
import {MobileState} from './components/mobile_view/types.js';
import {GltfEdits, GltfState, INITIAL_GLTF_EDITS} from './components/model_viewer_preview/types.js';

interface HotspotsUIState {
  addHotspot: boolean;
}

interface UIState {
  hotspots: HotspotsUIState;
}

export interface RelativeFilePathsState {
  iosName?: string|undefined;
  modelName?: string|undefined;
  environmentName?: string|undefined;
  posterName?: string|undefined;
}

export interface EnvironmentState {
  environmentImages: EnvironmentImage[];
}

interface GltfEditsState {
  edits: GltfEdits;
  origEdits: GltfEdits;
}

export interface ArConfigState {
  ar?: boolean;
  arModes?: string;
  iosSrc?: string;
}

export interface BestPracticesState {
  progressBar: boolean;
  arButton: boolean;
  arPrompt: boolean;
}

export interface ModelViewerSnippetState {
  arConfig: ArConfigState;
  animationNames: string[];
  bestPractices: BestPracticesState;
  camera: Camera;
  config: ModelViewerConfig;
  hotspots: HotspotConfig[];
  relativeFilePaths: RelativeFilePathsState;
  extraAttributes: any;
}

export interface EntitiesState {
  isDirtyCamera: boolean;
  mobile: MobileState;
  environment: EnvironmentState;
  gltf: GltfState;
  gltfEdits: GltfEditsState;
  modelViewerSnippet: ModelViewerSnippetState;
}

/**
 * Space Opera state.
 */
export interface State {
  entities: EntitiesState;
  ui: UIState;
}

export const INITIAL_STATE: State = {
  ui: {hotspots: {addHotspot: false}},
  entities: {
    isDirtyCamera: false,
    mobile: {
      isRefreshable: false,
      forcePost: false,
    },
    environment: {environmentImages: INITIAL_ENVIRONMENT_IMAGES},
    gltf: {gltfJsonString: ''},
    gltfEdits: {
      edits: INITIAL_GLTF_EDITS,
      origEdits: INITIAL_GLTF_EDITS,
    },
    modelViewerSnippet: {
      arConfig: {},
      animationNames: [],
      bestPractices: {progressBar: true, arButton: true, arPrompt: true},
      config: {},
      hotspots: [],
      camera: INITIAL_CAMERA,
      relativeFilePaths: {},
      extraAttributes: {},
    },
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