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

import {Texture} from '@google/model-viewer/lib/features/scene-graph/texture';
import {GLTF} from '@google/model-viewer/lib/three-components/gltf-instance/gltf-defaulted';

export interface Thumbnail {
  objectUrl: string;
  texture: Texture;
}

export interface ModelState {
  gltfUrl?: string;
  rootPath?: string;
  fileMap: Map<string, File>;
  thumbnailsById?: Map<string, Thumbnail>;
  originalGltfJson?: string;
  originalGltf?: GLTF;
  isDirty?: boolean;
}