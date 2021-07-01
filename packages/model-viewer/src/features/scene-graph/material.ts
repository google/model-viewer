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

import {LinearEncoding, MeshStandardMaterial, PixelFormat, RedFormat, RGBFormat, sRGBEncoding, Texture as ThreeTexture, TextureEncoding} from 'three';

import {GLTF, Material as GLTFMaterial} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Material as MaterialInterface, RGB} from './api.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');
const $backingThreeMaterial = Symbol('backingThreeMaterial');
export const $provideApplicator = Symbol('TextureApplicator');
export const $material = Symbol('material');
export const $texture = Symbol('texture');
export const $usage = Symbol('usage');
export const $encoding = Symbol('encoding');
export const $format = Symbol('format');

// Defines what a texture will be used for.
export enum TextureUsage {
  Base,
  Metallic,
  Normal,
  Occlusion,
  Emissive,
}
export class TextureContext {
  [$material]: MeshStandardMaterial;
  [$texture]: ThreeTexture|null = null;
  [$usage]: TextureUsage;
  [$encoding]: TextureEncoding;
  [$format]: PixelFormat;
  onUpdate: () => void;
  constructor(
      onUpdate: () => void, material: MeshStandardMaterial,
      texture: ThreeTexture|null, textureUsage: TextureUsage,
      encoding: TextureEncoding, format: PixelFormat) {
    this.onUpdate = onUpdate;
    this[$material] = material;
    this[$texture] = texture;
    this[$usage] = textureUsage;
    this[$encoding] = encoding;
    this[$format] = format;
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
  get[$backingThreeMaterial](): MeshStandardMaterial {
    return (this[$correlatedObjects] as Set<MeshStandardMaterial>)
        .values()
        .next()
        .value;
  }
  constructor(
      onUpdate: () => void, gltf: GLTF, gltfMaterial: GLTFMaterial,
      correlatedMaterials: Set<MeshStandardMaterial>|undefined) {
    super(onUpdate, gltfMaterial, correlatedMaterials);

    if (correlatedMaterials == null) {
      return;
    }
    if (correlatedMaterials.size > 1) {
      console.exception('Material correlation must be 1:1');
    }

    if (gltfMaterial.pbrMetallicRoughness == null) {
      gltfMaterial.pbrMetallicRoughness = {};
    }
    this[$pbrMetallicRoughness] = new PBRMetallicRoughness(
        onUpdate, gltf, gltfMaterial.pbrMetallicRoughness, correlatedMaterials);

    let {normalTexture: normalTextureDef, occlusionTexture, emissiveTexture} =
        gltfMaterial;

    const normalTextures = new Set<ThreeTexture>();
    const occlusionTextures = new Set<ThreeTexture>();
    const emissiveTextures = new Set<ThreeTexture>();

    for (const gltfMaterial of correlatedMaterials) {
      const {normalMap, aoMap, emissiveMap} = gltfMaterial;

      if (normalTextureDef != null && normalMap != null) {
        normalTextures.add(normalMap);
      } else {
        normalTextureDef = {index: -1};
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

    const firstValue = (set: Set<ThreeTexture>): ThreeTexture => {
      return set.values().next().value;
    };

    this[$normalTexture] = new TextureInfo(
        onUpdate,
        gltf,
        normalTextureDef!,
        normalTextures,
        new TextureContext(
            onUpdate,
            this[$backingThreeMaterial],
            firstValue(normalTextures),
            TextureUsage.Normal,
            LinearEncoding,
            RGBFormat));

    this[$occlusionTexture] = new TextureInfo(
        onUpdate,
        gltf,
        occlusionTexture!,
        occlusionTextures,
        new TextureContext(
            onUpdate,
            this[$backingThreeMaterial],
            firstValue(occlusionTextures),
            TextureUsage.Occlusion,
            LinearEncoding,
            RedFormat));

    this[$emissiveTexture] = new TextureInfo(
        onUpdate,
        gltf,
        emissiveTexture!,
        emissiveTextures,
        new TextureContext(
            onUpdate,
            this[$backingThreeMaterial],
            firstValue(emissiveTextures),
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
