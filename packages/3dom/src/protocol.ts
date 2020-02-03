/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
 */

import {RGBA} from './api.js';

export const ThreeDOMMessageType = {
  HANDSHAKE: 1,
  CONTEXT_INITIALIZED: 2,
  IMPORT_SCRIPT: 3,
  MODEL_CHANGED: 4,
  MUTATE: 5
};

export declare interface SerializedElementMap {
  'model-graph': SerializedModelGraph;
  'scene': SerializedScene;
  'node': SerializedNode;
  'mesh': SerializedMesh;
  'primitive': SerializedPrimitive;
  'material': SerializedMaterial;
  'pbr-metallic-roughness': SerializedPBRMetallicRoughness;
}

export declare interface SerializedThreeDOMElement {
  id: number;
  name?: string;
}

export declare interface SerializedScene extends SerializedThreeDOMElement {
  nodes?: Array<SerializedNode>;
}

export declare interface SerializedNode extends SerializedThreeDOMElement {
  mesh?: SerializedMesh;
  children?: Array<SerializedNode>;
}

export declare interface SerializedPBRMetallicRoughness extends
    SerializedThreeDOMElement {
  baseColorFactor: RGBA;
}

export declare interface SerializedMaterial extends SerializedThreeDOMElement {
  pbrMetallicRoughness: SerializedPBRMetallicRoughness;
}

export declare interface SerializedPrimitive extends SerializedThreeDOMElement {
  material?: SerializedMaterial;
}

export declare interface SerializedMesh extends SerializedThreeDOMElement {
  primitives?: Array<SerializedPrimitive>;
}

export declare interface SerializedModelGraph extends
    SerializedThreeDOMElement {
  modelUri: string;
  scene: SerializedScene;
}