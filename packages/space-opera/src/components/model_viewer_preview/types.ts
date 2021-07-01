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

import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main';

import {GLTF} from '../../../../model-viewer/lib/three-components/gltf-instance/gltf-2.0.js';
import {Material, Texture, TexturesById} from '../materials_panel/material_state.js';

/**
 * All the state that the user can edit. It's important to capture all that in a
 * single object so components can easily subscribe to changes on a single
 * object.
 */
export interface GltfEdits {
  texturesById: TexturesById;
  materials: Material[];
}

/**
 * Use this to initialize references in components.
 */
export const INITIAL_GLTF_EDITS: GltfEdits = {
  texturesById: new Map<string, Texture>(),
  materials: [],
};

export interface GltfState {
  gltfUrl?: string;
  gltf?: GltfModel;
  gltfJsonString: string;
}

export interface ModelState {
  thumbnailsById: Map<string, string>;
  originalGltfJson: string;
  originalGltf: GLTF;
}