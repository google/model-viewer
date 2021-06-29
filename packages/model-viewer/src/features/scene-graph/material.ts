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

import {ExtensionDictionary, GLTF, Material as GLTFMaterial, NormalTextureInfo, OcclusionTextureInfo, TextureInfo as GLTFTextureInfo} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Material as MaterialInterface, RGB} from './api.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');

class EmptyNormalTexture implements NormalTextureInfo {
  scale?: number|undefined;
  index: number = -1;
  texCoord?: number|undefined;
  extensions?: ExtensionDictionary|undefined;
  extras?: unknown;
}

class EmptyOcclusionTexture implements OcclusionTextureInfo {
  strength: number|undefined = 1;
  index: number = -1;
  texCoord?: number|undefined;
  extensions?: ExtensionDictionary|undefined;
  extras?: unknown;
}

class EmptyTexture implements GLTFTextureInfo {
  index: number = -1;
  texCoord?: number|undefined;
  extensions?: ExtensionDictionary|undefined;
  extras?: unknown;
}

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

    let {normalTexture, occlusionTexture, emissiveTexture} = material;

    const normalTextures = new Set<ThreeTexture>();
    const occlusionTextures = new Set<ThreeTexture>();
    const emissiveTextures = new Set<ThreeTexture>();

    for (const material of correlatedMaterials) {
      const {normalMap, aoMap, emissiveMap} = material;

      if (normalTexture != null && normalMap != null) {
        normalTextures.add(normalMap);
      } else {
        normalTexture = new EmptyNormalTexture();
      }

      if (occlusionTexture != null && aoMap != null) {
        occlusionTextures.add(aoMap);
      } else {
        occlusionTexture = new EmptyOcclusionTexture();
      }

      if (emissiveTexture != null && emissiveMap != null) {
        emissiveTextures.add(emissiveMap);
      } else {
        emissiveTexture = new EmptyTexture();
      }
    }

    this[$normalTexture] = new TextureInfo(
        onUpdate,
        gltf,
        normalTexture!,
        normalTextures,
        // Applicator applies texture to material.
        (texture: ThreeTexture) => {
          for (const material of correlatedMaterials) {
            material.normalMap = texture;
            material.needsUpdate = true;
          }
        });

    this[$occlusionTexture] = new TextureInfo(
        onUpdate,
        gltf,
        occlusionTexture!,
        occlusionTextures,
        // Applicator applies texture to material.
        (texture: ThreeTexture) => {
          for (const material of correlatedMaterials) {
            material.aoMap = texture;
            material.needsUpdate = true;
          }
        });

    this[$emissiveTexture] = new TextureInfo(
        onUpdate,
        gltf,
        emissiveTexture!,
        emissiveTextures,
        // Applicator applies texture to material.
        (texture: ThreeTexture) => {
          for (const material of correlatedMaterials) {
            material.emissiveMap = texture;
            material.needsUpdate = true;
          }
        });
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

  setEmissiveFactor(rgb: RGB) {
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      material.emissive.fromArray(rgb);
    }
    (this[$sourceObject] as GLTFMaterial).emissiveFactor = rgb;
    this[$onUpdate]();
  }
}
