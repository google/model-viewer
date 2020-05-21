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

import {MeshStandardMaterial} from 'three';

import {RGBA} from '../../api.js';
import {PBRMetallicRoughness as GLTFPBRMetallicRoughness} from '../../gltf-2.0.js';
import {SerializedPBRMetallicRoughness} from '../../protocol.js';
import {PBRMetallicRoughness as PBRMetallicRoughnessInterface} from '../api.js';

import {ModelGraft} from './model-graft.js';
import {$correlatedObjects, $sourceObject, ThreeDOMElement} from './three-dom-element.js';

const $threeMaterials = Symbol('threeMaterials');

/**
 * PBR material properties facade implementation for Three.js materials
 */
export class PBRMetallicRoughness extends ThreeDOMElement implements
    PBRMetallicRoughnessInterface {
  private get[$threeMaterials](): Set<MeshStandardMaterial> {
    return this[$correlatedObjects] as Set<MeshStandardMaterial>;
  }

  constructor(
      graft: ModelGraft, pbrMetallicRoughness: GLTFPBRMetallicRoughness,
      correlatedMaterials: Set<MeshStandardMaterial>) {
    super(graft, pbrMetallicRoughness, correlatedMaterials);
  }

  get baseColorFactor(): RGBA {
    return (this.sourceObject as PBRMetallicRoughness).baseColorFactor ||
        [1, 1, 1, 1];
  }

  set baseColorFactor(value: RGBA) {
    for (const material of this[$threeMaterials]) {
      material.color.fromArray(value);
      material.opacity = value[3];

      const pbrMetallicRoughness =
          this[$sourceObject] as GLTFPBRMetallicRoughness;

      if (value[0] === 1 && value[1] === 1 && value[2] === 1 &&
          value[3] === 1) {
        delete pbrMetallicRoughness.baseColorFactor;
      } else {
        pbrMetallicRoughness.baseColorFactor = value;
      }
    }
  }

  toJSON(): SerializedPBRMetallicRoughness {
    const serialized: Partial<SerializedPBRMetallicRoughness> = super.toJSON();
    serialized.baseColorFactor = this.baseColorFactor;
    return serialized as SerializedPBRMetallicRoughness;
  }
}
