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

import {RGBA} from '../api.js';
import {GLTF, GLTFElement} from '../gltf-2.0.js';
import {SerializedMaterial, SerializedModel, SerializedPBRMetallicRoughness, SerializedThreeDOMElement} from '../protocol.js';

export interface ThreeDOMElement {
  readonly ownerModel: Model;
  readonly internalID: number;
  readonly name: string|null;
  readonly sourceObject: GLTF|GLTFElement;
  toJSON(): SerializedThreeDOMElement;
}

/**
 * A facade that wraps an underlying renderer's notion of PBR material
 * properties
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#pbrmetallicroughness
 */
export interface PBRMetallicRoughness extends ThreeDOMElement {
  baseColorFactor: RGBA;
  toJSON(): SerializedPBRMetallicRoughness;
}

/**
 * A facade that wraps an underlying renderer's notion of a material
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#material
 */
export interface Material extends ThreeDOMElement {
  readonly pbrMetallicRoughness: PBRMetallicRoughness;
  toJSON(): SerializedMaterial;
}

/**
 * A facade that wraps an underlying renderer's notion of a glTF model
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#gltf
 */
export interface Model extends ThreeDOMElement {
  readonly materials: Array<Material>;
  toJSON(): SerializedModel;
}

/**
 * The API that must be implemented in order for an underlying rendere to be
 * manipulated by a ThreeDOMExecutionContext
 *
 * @see ../context.ts
 */
export interface ModelGraft extends EventTarget {
  /**
   * A flat list of all unique materials found in this scene graph.
   *
   * TODO(#1003): How do we handle non-active scenes?
   * TODO(#1002): Desctibe and enforce traversal order
   */
  readonly model: Model;

  /**
   * Mutates a ThreeDOMElement. An element is mutated by:
   *
   *  1. Looking up the element by the given ID
   *  2. Assigning value to the given property key
   */
  mutate(id: number, property: string, value: unknown): Promise<void>;
}
