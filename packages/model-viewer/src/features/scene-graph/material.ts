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

import {DoubleSide, FrontSide, MeshStandardMaterial, Texture as ThreeTexture} from 'three';

import {AlphaMode, GLTF, Material as GLTFMaterial} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Material as MaterialInterface, RGB} from './api.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';


const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');

/**
 * Material facade implementation for Three.js materials
 */
export class Material extends ThreeDOMElement implements MaterialInterface {
  private[$pbrMetallicRoughness]: PBRMetallicRoughness;

  private[$normalTexture]: TextureInfo|null = null;
  private[$occlusionTexture]: TextureInfo|null = null;
  private[$emissiveTexture]: TextureInfo|null = null;

  constructor(
      onUpdate: () => void, gltf: GLTF, material: GLTFMaterial,
      correlatedMaterials: Set<MeshStandardMaterial>|undefined) {
    super(onUpdate, material, correlatedMaterials);

    if (correlatedMaterials == null) {
      return;
    }

    if (material.pbrMetallicRoughness == null) {
      material.pbrMetallicRoughness = {};
    }
    this[$pbrMetallicRoughness] = new PBRMetallicRoughness(
        onUpdate, gltf, material.pbrMetallicRoughness, correlatedMaterials);

    const {normalTexture, occlusionTexture, emissiveTexture} = material;

    const normalTextures = new Set<ThreeTexture>();
    const occlusionTextures = new Set<ThreeTexture>();
    const emissiveTextures = new Set<ThreeTexture>();

    for (const material of correlatedMaterials) {
      const {normalMap, aoMap, emissiveMap} = material;

      if (normalTexture != null && normalMap != null) {
        normalTextures.add(normalMap);
      }

      if (occlusionTexture != null && aoMap != null) {
        occlusionTextures.add(aoMap);
      }

      if (emissiveTexture != null && emissiveMap != null) {
        emissiveTextures.add(emissiveMap);
      }
    }

    if (normalTextures.size > 0) {
      this[$normalTexture] =
          new TextureInfo(onUpdate, gltf, normalTexture!, normalTextures);
    }

    if (occlusionTextures.size > 0) {
      this[$occlusionTexture] =
          new TextureInfo(onUpdate, gltf, occlusionTexture!, occlusionTextures);
    }

    if (emissiveTextures.size > 0) {
      this[$emissiveTexture] =
          new TextureInfo(onUpdate, gltf, emissiveTexture!, emissiveTextures);
    }
  }

  get name(): string {
    return (this[$sourceObject] as any).name || '';
  }

  get pbrMetallicRoughness(): PBRMetallicRoughness {
    return this[$pbrMetallicRoughness];
  }

  get normalTexture(): TextureInfo|null {
    return this[$normalTexture];
  }

  get occlusionTexture(): TextureInfo|null {
    return this[$occlusionTexture];
  }

  get emissiveTexture(): TextureInfo|null {
    return this[$emissiveTexture];
  }

  get emissiveFactor(): RGB {
    return (this[$sourceObject] as GLTFMaterial).emissiveFactor!;
  }

  get alphaCutoff(): number {
    return (this[$sourceObject] as GLTFMaterial).alphaCutoff!;
  }

  get alphaMode(): AlphaMode {
    return (this[$sourceObject] as GLTFMaterial).alphaMode!;
  }

  get doubleSided(): boolean {
    return (this[$sourceObject] as GLTFMaterial).doubleSided!;
  }

  setEmissiveFactor(rgb: RGB) {
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      material.emissive.fromArray(rgb);
    }
    (this[$sourceObject] as GLTFMaterial).emissiveFactor = rgb;
    this[$onUpdate]();
  }

  setAlphaCutoff(value: number) {
    (this[$sourceObject] as GLTFMaterial)
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      // This little hack ignores alpha for opaque materials, in order to comply
      // with the glTF spec.
      if (!material.alphaTest && !material.transparent) {
        material.alphaTest = -0.5;
      } else if (this.alphaMode === 'MASK') {
        material.alphaTest = value;
      }
    }
    (this[$sourceObject] as GLTFMaterial).alphaCutoff = value;
    this[$onUpdate]();
  }

  setAlphaMode(alphaMode: AlphaMode) {
    (this[$sourceObject] as GLTFMaterial).alphaMode = alphaMode;
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      if (alphaMode === 'BLEND') {
        material.transparent = true;
        material.depthWrite = false;
        this[$onUpdate]();
      }
      if (alphaMode === 'OPAQUE') {
        material.transparent = false;
        material.depthWrite = true;  // default
        this[$onUpdate]();
      }
      if (alphaMode === 'MASK') {
        material.transparent = false;
        material.depthWrite = true;  // default
        this.setAlphaCutoff(
            this.alphaCutoff !== undefined ? this.alphaCutoff : 0.5)
      }
    }
  }

  setDoubleSided(doubleSided: boolean) {
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      if (doubleSided == true) {
        material.side = DoubleSide;
      } else {
        material.side = FrontSide;  // default
      }
    }
    this[$onUpdate]();
  }
}
