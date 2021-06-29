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

import {LinearEncoding, MeshStandardMaterial, PixelFormat, RedFormat, RepeatWrapping, RGBFormat, sRGBEncoding, Texture as ThreeTexture, TextureEncoding} from 'three';

import {GLTF, Material as GLTFMaterial} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Material as MaterialInterface, RGB} from './api.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');
export const $provideApplicator = Symbol('TextureApplicator');

// Defines what a texture will be used for.
export enum TextureUsage {
  Base,
  Metallic,
  Normal,
  Occlusion,
  Emissive,
}

// Helper class for applying a texture to materials.
export class TextureApplicator {
  // Returns a lambda for applying a texture, with the specified state, to a
  // material.
  static[$provideApplicator](
      onUpdate: () => void,
      correlatedMaterials: Set<MeshStandardMaterial>|undefined,
      usage: TextureUsage, encodding: TextureEncoding, format: PixelFormat) {
    return (texture: ThreeTexture) => {
      if (correlatedMaterials) {
        for (const material of correlatedMaterials) {
          texture.encoding = encodding;
          texture.format = format;
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.flipY = false;
          material.needsUpdate = true;
          switch (usage) {
            case TextureUsage.Base:
              material.map = texture;
              break;
            case TextureUsage.Metallic:
              material.metalnessMap = texture;
              break;
            case TextureUsage.Normal:
              material.normalMap = texture;
              break;
            case TextureUsage.Occlusion:
              material.aoMap = texture;
              break;
            case TextureUsage.Emissive:
              material.emissiveMap = texture;
              break;
            default:
          }
        }
        onUpdate();
      }
    };
  }
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
        normalTexture = {index: -1};
      }

      if (occlusionTexture != null && aoMap != null) {
        occlusionTextures.add(aoMap);
      } else {
        occlusionTexture = {index: -1};
      }

      if (emissiveTexture != null && emissiveMap != null) {
        emissiveTextures.add(emissiveMap);
      } else {
        emissiveTexture = {index: -1};
      }
    }

    this[$normalTexture] = new TextureInfo(
        onUpdate,
        gltf,
        normalTexture!,
        normalTextures,
        // Applicator provides method for applying a texture to a material.
        TextureApplicator[$provideApplicator](
            onUpdate,
            correlatedMaterials,
            TextureUsage.Normal,
            LinearEncoding,
            RGBFormat));

    this[$occlusionTexture] = new TextureInfo(
        onUpdate,
        gltf,
        occlusionTexture!,
        occlusionTextures,
        // Applicator provides method for applying a texture to a material.
        TextureApplicator[$provideApplicator](
            onUpdate,
            correlatedMaterials,
            TextureUsage.Occlusion,
            LinearEncoding,
            RedFormat));

    this[$emissiveTexture] = new TextureInfo(
        onUpdate,
        gltf,
        emissiveTexture!,
        emissiveTextures,
        // Applicator provides method for applying a texture to a material.
        TextureApplicator[$provideApplicator](
            onUpdate,
            correlatedMaterials,
            TextureUsage.Emissive,
            sRGBEncoding,
            RGBFormat));
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
