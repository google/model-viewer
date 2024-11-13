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

import {Color, ColorRepresentation, MeshPhysicalMaterial} from 'three';

import {PBRMetallicRoughness as PBRMetallicRoughnessInterface, RGBA} from './api.js';
import {TextureInfo, TextureUsage} from './texture-info.js';
import {$correlatedObjects, $onUpdate, ThreeDOMElement} from './three-dom-element.js';


const $threeMaterial = Symbol('threeMaterial');
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

  private get[$threeMaterials](): Set<MeshPhysicalMaterial> {
    return this[$correlatedObjects] as Set<MeshPhysicalMaterial>;
  }

  private get[$threeMaterial]() {
    return this[$correlatedObjects]?.values().next().value as
        MeshPhysicalMaterial;
  }

  constructor(
      onUpdate: () => void, correlatedMaterials: Set<MeshPhysicalMaterial>) {
    super(onUpdate, correlatedMaterials);

    const {map, metalnessMap} = correlatedMaterials.values().next().value!;

    this[$baseColorTexture] =
        new TextureInfo(onUpdate, TextureUsage.Base, map, correlatedMaterials);

    this[$metallicRoughnessTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.MetallicRoughness,
        metalnessMap,
        correlatedMaterials);
  }


  get baseColorFactor(): RGBA {
    const rgba = [0, 0, 0, this[$threeMaterial].opacity];
    this[$threeMaterial].color.toArray(rgba);
    return rgba as RGBA;
  }

  get metallicFactor(): number {
    return this[$threeMaterial].metalness;
  }

  get roughnessFactor(): number {
    return this[$threeMaterial].roughness;
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
      color.set(rgba as ColorRepresentation);
    }
    for (const material of this[$threeMaterials]) {
      material.color.set(color);
      if (rgba instanceof Array && rgba.length > 3) {
        material.opacity = rgba[3];
      } else {
        rgba = [0, 0, 0, material.opacity];
        color.toArray(rgba);
      }
    }
    this[$onUpdate]();
  }

  setMetallicFactor(value: number) {
    for (const material of this[$threeMaterials]) {
      material.metalness = value;
    }
    this[$onUpdate]();
  }

  setRoughnessFactor(value: number) {
    for (const material of this[$threeMaterials]) {
      material.roughness = value;
    }
    this[$onUpdate]();
  }
}
