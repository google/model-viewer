/* @license
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
 */

import {RGBA} from './api.js';

/**
 * The protocol between 3DOM execution contexts is strictly defined.
 * Only specific types of messages are allowed, and their types are
 * all included in the ThreeDOMMessageType map.
 */
export const ThreeDOMMessageType = {
  // Used when the host execution context and scene graph execution context
  // are negotiating a connection
  HANDSHAKE: 1,

  // Notification sent to the host execution context to indicate that the
  // scene graph execution context has finished initializing
  CONTEXT_INITIALIZED: 2,

  // A message that indicates that a custom script is meant to be imported
  // into the scene graph execution context
  IMPORT_SCRIPT: 3,

  // A notification from the host execution context that the main Model has
  // changed, including the sparse, serialized scene graph of the new Model
  MODEL_CHANGED: 4,

  // A request from the scene graph execution context to mutate some detail
  // of the backing host scene graph
  MUTATE: 5
};

/**
 * A map of scene graph element types to interfaces for the serialized
 * representation of those types.
 */
export declare interface SerializedElementMap {
  'model': SerializedModel;
  'material': SerializedMaterial;
  'pbr-metallic-roughness': SerializedPBRMetallicRoughness;
}

/**
 * The serialized form of a ThreeDOMElement
 * @see api.ts
 */
export declare interface SerializedThreeDOMElement {
  id: number;
  name?: string;
}

/**
 * The serialized form of a PBRMetallicRoughness
 * @see api.ts
 */
export declare interface SerializedPBRMetallicRoughness extends
    SerializedThreeDOMElement {
  baseColorFactor: RGBA;
}

/**
 * The serialized form of a Material
 * @see api.ts
 */
export declare interface SerializedMaterial extends SerializedThreeDOMElement {
  pbrMetallicRoughness: SerializedPBRMetallicRoughness;
}

/**
 * The serialized form of a Model
 * @see api.ts
 */
export declare interface SerializedModel extends SerializedThreeDOMElement {
  modelUri: string;
  materials: Array<SerializedMaterial>;
}
