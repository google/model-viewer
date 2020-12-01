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

import {GLTF, PBRMetallicRoughness as GLTFPBRMetallicRoughness} from '../../three-components/gltf-instance/gltf-2.0.js';

import {RGBA} from './api.js';
import {PBRMetallicRoughness as PBRMetallicRoughnessInterface} from './api.js';
import {TextureInfo} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';

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
      onUpdate: () => void, gltf: GLTF,
      pbrMetallicRoughness: GLTFPBRMetallicRoughness,
      correlatedMaterials: Set<MeshStandardMaterial>) {
    super(onUpdate, pbrMetallicRoughness, correlatedMaterials);

    // Assign glTF default values
    if (pbrMetallicRoughness.baseColorFactor == null) {
      pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
    }
    if (pbrMetallicRoughness.roughnessFactor == null) {
      pbrMetallicRoughness.roughnessFactor = 0;
    }
    if (pbrMetallicRoughness.metallicFactor == null) {
      pbrMetallicRoughness.metallicFactor = 0;
    }

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
          new TextureInfo(onUpdate, gltf, baseColorTexture!, baseColorTextures);
    }

    if (metallicRoughnessTextures.size > 0) {
      this[$metallicRoughnessTexture] = new TextureInfo(
          onUpdate, gltf, metallicRoughnessTexture!, metallicRoughnessTextures);
    }
  }


  get baseColorFactor(): RGBA {
    return (this[$sourceObject] as GLTFPBRMetallicRoughness).baseColorFactor!;
  }

  get metallicFactor(): number {
    return (this[$sourceObject] as GLTFPBRMetallicRoughness).metallicFactor!;
  }

  get roughnessFactor(): number {
    return (this[$sourceObject] as GLTFPBRMetallicRoughness).roughnessFactor!;
  }

  get baseColorTexture(): TextureInfo|null {
    return this[$baseColorTexture];
  }

  get metallicRoughnessTexture(): TextureInfo|null {
    return this[$metallicRoughnessTexture];
  }

  setBaseColorFactor(rgba: RGBA) {
    for (const material of this[$threeMaterials]) {
      material.color.fromArray(rgba);
      material.opacity = (rgba)[3];
    }
    const pbrMetallicRoughness =
        this[$sourceObject] as GLTFPBRMetallicRoughness;
    pbrMetallicRoughness.baseColorFactor = rgba;
    this[$onUpdate]();
  }

  setMetallicFactor(value: number) {
    for (const material of this[$threeMaterials]) {
      material.metalness = value;
    }
    const pbrMetallicRoughness =
        this[$sourceObject] as GLTFPBRMetallicRoughness;
    pbrMetallicRoughness.metallicFactor = value;
    this[$onUpdate]();
  }

  setRoughnessFactor(value: number) {
    for (const material of this[$threeMaterials]) {
      material.roughness = value;
    }
    const pbrMetallicRoughness =
        this[$sourceObject] as GLTFPBRMetallicRoughness;
    pbrMetallicRoughness.roughnessFactor = value;
    this[$onUpdate]();
  }
}
