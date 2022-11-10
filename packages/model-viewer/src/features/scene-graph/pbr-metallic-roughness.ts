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

import {Color, MeshStandardMaterial} from 'three';

import {GLTF, PBRMetallicRoughness as GLTFPBRMetallicRoughness} from '../../three-components/gltf-instance/gltf-2.0.js';
import {PBRMetallicRoughness as DefaultedPBRMetallicRoughness} from '../../three-components/gltf-instance/gltf-defaulted.js';

import {PBRMetallicRoughness as PBRMetallicRoughnessInterface, RGBA} from './api.js';
import {TextureInfo, TextureUsage} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $threeMaterials = Symbol('threeMaterials');
const $baseColorTexture = Symbol('baseColorTexture');
const $metallicRoughnessTexture = Symbol('metallicRoughnessTexture');

/**
 * PBR material properties facade implementation for Three.js materials
 */
export class PBRMetallicRoughness extends ThreeDOMElement implements
    PBRMetallicRoughnessInterface {
  private[$baseColorTexture]: TextureInfo;
  private[$metallicRoughnessTexture]: TextureInfo;

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
      pbrMetallicRoughness.roughnessFactor = 1;
    }
    if (pbrMetallicRoughness.metallicFactor == null) {
      pbrMetallicRoughness.metallicFactor = 1;
    }

    const {
      baseColorTexture: gltfBaseColorTexture,
      metallicRoughnessTexture: gltfMetallicRoughnessTexture
    } = pbrMetallicRoughness;

    const {map, metalnessMap} = correlatedMaterials.values().next().value;

    this[$baseColorTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Base,
        map,
        correlatedMaterials,
        gltf,
        gltfBaseColorTexture ? gltfBaseColorTexture : null);

    this[$metallicRoughnessTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.MetallicRoughness,
        metalnessMap,
        correlatedMaterials,
        gltf,
        gltfMetallicRoughnessTexture ? gltfMetallicRoughnessTexture : null);
  }


  get baseColorFactor(): RGBA {
    return (this[$sourceObject] as DefaultedPBRMetallicRoughness)
        .baseColorFactor;
  }

  get metallicFactor(): number {
    return (this[$sourceObject] as DefaultedPBRMetallicRoughness)
        .metallicFactor;
  }

  get roughnessFactor(): number {
    return (this[$sourceObject] as DefaultedPBRMetallicRoughness)
        .roughnessFactor;
  }

  get baseColorTexture(): TextureInfo {
    return this[$baseColorTexture];
  }

  get metallicRoughnessTexture(): TextureInfo {
    return this[$metallicRoughnessTexture];
  }

  setBaseColorFactor(rgba: RGBA|string) {
    const color = new Color();
    if (rgba instanceof Array) {
      color.fromArray(rgba);
    } else {
      color.set(rgba).convertSRGBToLinear();
    }
    for (const material of this[$threeMaterials]) {
      material.color.set(color);
      if (rgba instanceof Array) {
        material.opacity = (rgba)[3];
      } else {
        rgba = [0, 0, 0, material.opacity];
        color.toArray(rgba);
      }
    }
    const pbrMetallicRoughness =
        this[$sourceObject] as DefaultedPBRMetallicRoughness;
    pbrMetallicRoughness.baseColorFactor = rgba as RGBA;
    this[$onUpdate]();
  }

  setMetallicFactor(value: number) {
    for (const material of this[$threeMaterials]) {
      material.metalness = value;
    }
    const pbrMetallicRoughness =
        this[$sourceObject] as DefaultedPBRMetallicRoughness;
    pbrMetallicRoughness.metallicFactor = value;
    this[$onUpdate]();
  }

  setRoughnessFactor(value: number) {
    for (const material of this[$threeMaterials]) {
      material.roughness = value;
    }
    const pbrMetallicRoughness =
        this[$sourceObject] as DefaultedPBRMetallicRoughness;
    pbrMetallicRoughness.roughnessFactor = value;
    this[$onUpdate]();
  }
}
