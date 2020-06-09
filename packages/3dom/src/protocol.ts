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
import {MagFilter, MinFilter, WrapMode} from './gltf-2.0.js';

/**
 * The protocol between 3DOM execution contexts is strictly defined.
 * Only specific types of messages are allowed, and their types are
 * all included in the ThreeDOMMessageType map.
 */
export const ThreeDOMMessageType = {

  // === Host -> Scene Graph ===

  // Used when the host execution context and scene graph execution context
  // are negotiating a connection
  HANDSHAKE: 1,

  // A message that indicates that a custom script is meant to be imported
  // into the scene graph execution context
  IMPORT_SCRIPT: 2,

  // A notification from the host execution context that the main Model has
  // changed, including the sparse, serialized scene graph of the new Model
  MODEL_CHANGE: 3,

  // A notification that confirms or denies a request from the scene graph
  // context to mutate the scene graph
  MUTATION_RESULT: 4,

  // === Scene Graph => Host ===

  // Notification sent to the host execution context to indicate that the
  // scene graph execution context has finished initializing
  CONTEXT_INITIALIZED: 5,

  // A request from the scene graph execution context to mutate some detail
  // of the backing host scene graph
  MUTATE: 6
};

export type ThreeDOMMessageTypeMap = typeof ThreeDOMMessageType;

/**
 * Messages exchanged between a scene graph context and the host context.
 * They are distinguished by their type property.
 */
export declare interface ThreeDOMMessage {
  type: number;
}

/**
 * A message requesting that the scene graph context import a script by
 * URL.
 */
export declare interface ImportScriptMessage extends ThreeDOMMessage {
  url: string;
}

/**
 * A message informing the scene graph context that the current global model
 * has changed.
 */
export declare interface ModelChangedMessage extends ThreeDOMMessage {
  model: SerializedModel;
}

/**
 * A request from the scene graph context to mutate the scene graph. The
 * mutation ID distinguishes this request so that a corresponding response
 * can be handled in the future.
 */
export declare interface MutateMessage extends ThreeDOMMessage {
  id: number;
  property: string;
  value: unknown;
  mutationId: number;
}

export declare interface MutationResultMessage extends ThreeDOMMessage {
  mutationId: number;
  applied: boolean;
}

/**
 * A map of scene graph element types to interfaces for the serialized
 * representation of those types.
 */
export declare interface SerializedElementMap {
  'model': SerializedModel;
  'material': SerializedMaterial;
  'pbr-metallic-roughness': SerializedPBRMetallicRoughness;
  'sampler': SerializedSampler;
  'image': SerializedImage;
  'texture': SerializedTexture;
  'texture-info': SerializedTextureInfo;
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
  baseColorTexture?: SerializedTextureInfo;
  metallicRoughnessTexture?: SerializedTextureInfo;
}

/**
 * The serialized form of a Material
 * @see api.ts
 */
export declare interface SerializedMaterial extends SerializedThreeDOMElement {
  pbrMetallicRoughness: SerializedPBRMetallicRoughness;
  normalTexture?: SerializedTextureInfo;
  occlusionTexture?: SerializedTextureInfo;
  emissiveTexture?: SerializedTextureInfo;
}

export declare interface SerializedSampler extends SerializedThreeDOMElement {
  magFilter?: MagFilter;
  minFilter?: MinFilter;
  wrapS?: WrapMode;
  wrapT?: WrapMode;
}

export declare interface SerializedImage extends SerializedThreeDOMElement {
  uri?: string;
}

export declare interface SerializedTexture extends SerializedThreeDOMElement {
  sampler?: SerializedSampler;
  source?: SerializedImage;
}

export declare interface SerializedTextureInfo extends
    SerializedThreeDOMElement {
  texture?: SerializedTexture;
}

/**
 * The serialized form of a Model
 * @see api.ts
 */
export declare interface SerializedModel extends SerializedThreeDOMElement {
  modelUri: string;
  materials: Array<SerializedMaterial>;
}
