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

import {MeshStandardMaterial, PixelFormat, Texture as ThreeTexture, TextureEncoding} from 'three';

import {Asset, GLTF, Image as GLTFImage, Material as GLTFMaterial, Sampler as GLTFSampler, Texture as GLTFTexture, TextureInfo as GLTFTextureInfo} from '../../three-components/gltf-instance/gltf-2.0.js';

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
export const $threeTexture = Symbol('threeTexture');
export const $usage = Symbol('usage');
export const $encoding = Symbol('encoding');
export const $format = Symbol('format');
export const $gltf = Symbol('gltf');
export const $gltfTextureInfo = Symbol('gltfTextureInfo');
export const $gltfTexture = Symbol('gltfTexture');
export const $gltfSampler = Symbol('gltfSampler');
export const $gltfImage = Symbol('gltfImage');

// Defines what a texture will be used for.
export enum TextureUsage {
  Base,
  Metallic,
  Normal,
  Occlusion,
  Emissive,
}

/**
 * TextureContext holds the glTF and Three data needed for creating and updating
 * a texture in one place.
 */
export class TextureContext {
  [$gltf]: GLTF;
  [$material]: MeshStandardMaterial|null;
  [$threeTexture]: ThreeTexture|null = null;
  [$gltfTextureInfo]: GLTFTextureInfo;
  [$gltfTexture]: GLTFTexture;
  [$gltfSampler]: GLTFSampler;
  [$gltfImage]: GLTFImage;
  [$usage]: TextureUsage;
  [$encoding]: TextureEncoding;
  [$format]: PixelFormat;
  onUpdate: () => void;

  // Creates context from Texture
  static createFromTexture(texture: ThreeTexture): TextureContext {
    const gltf = {
      asset: {} as Asset,
      textures: [{source: -1}],
      samplers: [{}],
      images: [{name: 'null_image', uri: 'null_image'}],
    };
    return new TextureContext(
        () => {},
        gltf,
        null,
        texture,
        TextureUsage.Base,
        {index: -1} as GLTFTextureInfo,
    );
  }

  constructor(
      onUpdate: () => void, gltf: GLTF, material: MeshStandardMaterial|null,
      texture: ThreeTexture|null, textureUsage: TextureUsage,
      gltfTextureInfo: GLTFTextureInfo) {
    this.onUpdate = onUpdate;
    this[$gltf] = gltf;
    this[$material] = material;
    this[$threeTexture] = texture;
    this[$usage] = textureUsage;

    // Gathers glTF texture info data.
    this[$gltfTextureInfo] =
        gltfTextureInfo ? gltfTextureInfo : {index: -1} as GLTFTextureInfo;

    // Gathers glTF texture data.
    if (gltf.textures && this[$gltfTextureInfo]!.index !== -1) {
      this[$gltfTexture] = gltf.textures[gltfTextureInfo.index];
    } else {
      this[$gltfTexture] = {source: -1} as GLTFTexture;
    }
    // Gathers glTF sampler data.
    const {sampler: samplerIndex} = this[$gltfTexture]!;
    this[$gltfSampler] = (gltf.samplers != null && samplerIndex != null) ?
        gltf.samplers[samplerIndex] :
        {};

    // Gathers glTF image data.
    const {source: imageIndex} = this[$gltfTexture];
    if (imageIndex === -1) {
      this[$gltfImage] = {name: 'adhoc_image', uri: 'adhoc_image'};
    } else if (gltf.images && imageIndex != null) {
      const image = gltf.images[imageIndex];
      this[$gltfImage] = image;
    } else {
      this[$gltfImage] = {name: 'null_image', uri: 'null_image'};
    }
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

    this[$normalTexture] = new TextureInfo(new TextureContext(
        onUpdate,
        gltf,
        this[$backingThreeMaterial],
        firstValue(normalTextures),
        TextureUsage.Normal,
        normalTextureDef!));

    this[$occlusionTexture] = new TextureInfo(new TextureContext(
        onUpdate,
        gltf,
        this[$backingThreeMaterial],
        firstValue(occlusionTextures),
        TextureUsage.Occlusion,
        occlusionTexture!));

    this[$emissiveTexture] = new TextureInfo(new TextureContext(
        onUpdate,
        gltf,
        this[$backingThreeMaterial],
        firstValue(emissiveTextures),
        TextureUsage.Emissive,
        emissiveTexture!,
        ));
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
