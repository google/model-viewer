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

import {Material, MeshStandardMaterial} from 'three';

import {RGBA} from '../../api.js';
import {SerializedPBRMetallicRoughness} from '../../protocol.js';
import {ModelGraft} from '../model-graft.js';

import {$relatedObject, SerializableThreeDOMElement} from './serializable-three-dom-element.js';

const $threeMaterial = Symbol('threeMaterial');

/**
 * GraftPBRMetallicRoughness
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#pbrmetallicroughness
 */
export class GraftPBRMetallicRoughness extends SerializableThreeDOMElement {
  protected get[$threeMaterial](): MeshStandardMaterial {
    return this[$relatedObject] as MeshStandardMaterial;
  }

  constructor(ownerModel: ModelGraft, material: Material) {
    super(ownerModel, material);
  }

  get baseColorFactor(): RGBA {
    const material = this[$threeMaterial];
    if (material.color) {
      return [...material.color.toArray(), material.opacity] as RGBA;
    } else {
      return [1, 1, 1, 1];
    }
  }

  set baseColorFactor(value: RGBA) {
    this[$threeMaterial].color.fromArray(value);
    this[$threeMaterial].opacity = value[3];
  }

  toJSON(): SerializedPBRMetallicRoughness {
    const serialized: Partial<SerializedPBRMetallicRoughness> = super.toJSON();
    serialized.baseColorFactor = this.baseColorFactor;
    return serialized as SerializedPBRMetallicRoughness;
  }
}