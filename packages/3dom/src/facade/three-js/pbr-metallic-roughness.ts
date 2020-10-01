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

import {MeshStandardMaterial, Texture as ThreeTexture} from 'three';

import {RGBA} from '../../api.js';
import {PBRMetallicRoughness as GLTFPBRMetallicRoughness} from '../../gltf-2.0.js';
import {SerializedPBRMetallicRoughness} from '../../protocol.js';
import {PBRMetallicRoughness as PBRMetallicRoughnessInterface} from '../api.js';

import {ModelGraft} from './model-graft.js';
import {TextureInfo} from './texture-info.js';
import {$correlatedObjects, $sourceObject, ThreeDOMElement} from './three-dom-element.js';

const $threeMaterials = Symbol('threeMaterials');
const $baseColorTexture = Symbol('baseColorTexture');
const $metallicRoughnessTexture = Symbol('metallicRoughnessTexture');

/**
 * PBR material properties facade implementation for Three.js materials
 */
export class PBRMetallicRoughness extends ThreeDOMElement implements
    PBRMetallicRoughnessInterface {
  private[$baseColorTexture]: TextureInfo|null = null;
  private[$metallicRoughnessTexture]: TextureInfo|null = null;

  private get[$threeMaterials](): Set<MeshStandardMaterial> {
    return this[$correlatedObjects] as Set<MeshStandardMaterial>;
  }

  constructor(
      graft: ModelGraft, pbrMetallicRoughness: GLTFPBRMetallicRoughness,
      correlatedMaterials: Set<MeshStandardMaterial>) {
    super(graft, pbrMetallicRoughness, correlatedMaterials);

    const {baseColorTexture, metallicRoughnessTexture} = pbrMetallicRoughness;
    const baseColorTextures = new Set<ThreeTexture>();
    const metallicRoughnessTextures = new Set<ThreeTexture>();

    for (const material of correlatedMaterials) {
      if (baseColorTexture != null && material.map != null) {
        baseColorTextures.add(material.map);
      }

      // NOTE: GLTFLoader users the same texture for metalnessMap and
      // roughnessMap in this case
      // @see https://github.com/mrdoob/three.js/blob/b4473c25816df4a09405c7d887d5c418ef47ee76/examples/js/loaders/GLTFLoader.js#L2173-L2174
      if (metallicRoughnessTexture != null && material.metalnessMap != null) {
        metallicRoughnessTextures.add(material.metalnessMap);
      }
    }

    if (baseColorTextures.size > 0) {
      this[$baseColorTexture] =
          new TextureInfo(graft, baseColorTexture!, baseColorTextures);
    }

    if (metallicRoughnessTextures.size > 0) {
      this[$metallicRoughnessTexture] = new TextureInfo(
          graft, metallicRoughnessTexture!, metallicRoughnessTextures);
    }
  }


  get baseColorFactor(): RGBA {
    return (this.sourceObject as PBRMetallicRoughness).baseColorFactor ||
        [1, 1, 1, 1];
  }

  get metallicFactor(): number {
    return (this.sourceObject as PBRMetallicRoughness).metallicFactor || 0;
  }

  get roughnessFactor(): number {
    return (this.sourceObject as PBRMetallicRoughness).roughnessFactor || 0;
  }

  get baseColorTexture(): TextureInfo|null {
    return this[$baseColorTexture];
  }

  get metallicRoughnessTexture(): TextureInfo|null {
    return this[$metallicRoughnessTexture];
  }

  async mutate(
      property: 'baseColorFactor'|'metallicFactor'|'roughnessFactor',
      value: RGBA|number): Promise<void> {
    if (!['baseColorFactor', 'metallicFactor', 'roughnessFactor'].includes(
            property)) {
      throw new Error(`Cannot mutate ${property} on PBRMetallicRoughness`);
    }
    switch (property) {
      case 'baseColorFactor':
        for (const material of this[$threeMaterials]) {
          material.color.fromArray(value as RGBA);
          material.opacity = (value as RGBA)[3];

          const pbrMetallicRoughness =
              this[$sourceObject] as GLTFPBRMetallicRoughness;

          if (value as RGBA[0] === 1 && value as RGBA[1] === 1 &&
              value as RGBA[2] === 1 && value as RGBA[3] === 1) {
            delete pbrMetallicRoughness.baseColorFactor;
          } else {
            pbrMetallicRoughness.baseColorFactor = value as RGBA;
          }
        }
        break;
      case 'metallicFactor':
        for (const material of this[$threeMaterials]) {
          material.metalness = value as number;
          const pbrMetallicRoughness =
              this[$sourceObject] as GLTFPBRMetallicRoughness;
          pbrMetallicRoughness.metallicFactor = value as number;
        }
        break;
      case 'roughnessFactor':
        for (const material of this[$threeMaterials]) {
          material.roughness = value as number;
          const pbrMetallicRoughness =
              this[$sourceObject] as GLTFPBRMetallicRoughness;
          pbrMetallicRoughness.roughnessFactor = value as number;
        }
        break;
    }
  }

  toJSON(): SerializedPBRMetallicRoughness {
    const serialized: Partial<SerializedPBRMetallicRoughness> = super.toJSON();
    const {
      baseColorTexture,
      metallicRoughnessTexture,
      baseColorFactor,
      roughnessFactor,
      metallicFactor
    } = this;

    if (baseColorTexture != null) {
      serialized.baseColorTexture = baseColorTexture.toJSON();
    }

    if (baseColorFactor != null) {
      serialized.baseColorFactor = baseColorFactor;
    }

    if (metallicFactor != null) {
      serialized.metallicFactor = metallicFactor;
    }

    if (roughnessFactor != null) {
      serialized.roughnessFactor = roughnessFactor;
    }

    if (metallicRoughnessTexture != null) {
      serialized.metallicRoughnessTexture = metallicRoughnessTexture.toJSON();
    }

    return serialized as SerializedPBRMetallicRoughness;
  }
}
