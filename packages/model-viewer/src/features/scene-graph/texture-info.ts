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

import {LinearEncoding, MeshStandardMaterial, sRGBEncoding, Texture as ThreeTexture, TextureEncoding} from 'three';

import {Asset, GLTF, Image as GLTFImage, Sampler as GLTFSampler, Texture as GLTFTexture, TextureInfo as GLTFTextureInfo} from '../../three-components/gltf-instance/gltf-2.0.js';

import {TextureInfo as TextureInfoInterface} from './api.js';
import {$underlyingTexture} from './image.js';
import {Texture} from './texture.js';
import {$correlatedObjects, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $texture = Symbol('texture');
export const $provideApplicator = Symbol('TextureApplicator');
export const $material = Symbol('material');
export const $threeTexture = Symbol('threeTexture');
export const $usage = Symbol('usage');
export const $encoding = Symbol('encoding');
export const $gltf = Symbol('gltf');
export const $gltfTextureInfo = Symbol('gltfTextureInfo');
export const $gltfTexture = Symbol('gltfTexture');
export const $gltfSampler = Symbol('gltfSampler');
export const $gltfImage = Symbol('gltfImage');
export const $createFromTexture = Symbol('createFromTexture');

// Defines what a texture will be used for.
export enum TextureUsage {
  Base,
  Metallic,
  Normal,
  Occlusion,
  Emissive,
}

/**
 * TextureInfo facade implementation for Three.js materials
 */
export class TextureInfo extends ThreeDOMElement implements
    TextureInfoInterface {
  private[$texture]: Texture;

  // Holds a reference to the glTF file data.
  [$gltf]: GLTF;
  // Holds a reference to the Three data that backs the material object.
  [$material]: MeshStandardMaterial|null;
  // Holds a reference to the Three data that backs the texture object.
  [$threeTexture]: ThreeTexture|null = null;

  /**
   * GLTF state representation, this is the backing data behind the
   * model-viewer implementation of texture and it's dependencies (TextureInfo,
   * Sampler, and Image)
   */
  // Data backs the Model-Viewer TextureInfo.
  [$gltfTextureInfo]: GLTFTextureInfo;
  // Data backs the Model-Viewer Texture.
  [$gltfTexture]: GLTFTexture;
  // Data backs the Model-Viewer Sampler.
  [$gltfSampler]: GLTFSampler;
  // Data backs the Model-Viewer Image.
  [$gltfImage]: GLTFImage;

  // Texture usage defines the how the texture is used (ie Normal, Emissive...
  // etc)
  [$usage]: TextureUsage;
  // Defines the encoding of the texture (ie Linear, sRGB, etc...)
  [$encoding]: TextureEncoding;
  onUpdate: () => void;

  constructor(
      onUpdate: () => void, gltf: GLTF, material: MeshStandardMaterial|null,
      texture: ThreeTexture|null, textureUsage: TextureUsage,
      gltfTextureInfo: GLTFTextureInfo) {
    super(
        onUpdate,
        gltfTextureInfo ? gltfTextureInfo : {index: -1},
        new Set<ThreeTexture>([texture!]));

    this.onUpdate = onUpdate;
    this[$gltf] = gltf;
    this[$material] = material;
    this[$threeTexture] = texture;
    this[$usage] = textureUsage;

    // Gathers glTF texture info data.
    this[$gltfTextureInfo] = this[$sourceObject] as GLTFTextureInfo;

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

    this[$texture] = new Texture(this);
  }

  // Creates context from Texture
  static[$createFromTexture](texture: ThreeTexture): TextureInfo {
    // Creates an empty glTF data set, allows for creating a texture that's
    // not bound to a material.
    const gltf = {
      asset: {} as Asset,
      textures: [{source: -1}],
      samplers: [{}],
      images: [{name: 'adhoc_image', uri: 'adhoc_image'}],
    };

    return new TextureInfo(
        () => {},
        gltf,
        null,
        texture,
        TextureUsage.Base,
        {index: -1} as GLTFTextureInfo,
    );
  }

  get texture(): Texture {
    return this[$texture];
  }

  setTexture(texture: Texture|null): void {
    const threeTexture: ThreeTexture|null =
        texture != null ? texture.source[$underlyingTexture] : null;
    let encoding: TextureEncoding = sRGBEncoding;
    this[$texture] = texture ?? new Texture(this);
    this[$threeTexture] = threeTexture;
    // Ensures correlatedObjects is up to date.
    const correlatedObjects = (this[$correlatedObjects] as Set<ThreeTexture>);
    correlatedObjects.clear();
    if (threeTexture != null) {
      correlatedObjects.add(threeTexture);
    }

    switch (this[$usage]) {
      case TextureUsage.Base:
        this[$material]!.map = threeTexture;
        break;
      case TextureUsage.Metallic:
        encoding = LinearEncoding;
        this[$material]!.metalnessMap = threeTexture;
        break;
      case TextureUsage.Normal:
        encoding = LinearEncoding;
        this[$material]!.normalMap = threeTexture;
        break;
      case TextureUsage.Occlusion:
        encoding = LinearEncoding;
        this[$material]!.aoMap = threeTexture;
        break;
      case TextureUsage.Emissive:
        this[$material]!.emissiveMap = threeTexture;
        break;
      default:
    }
    if (threeTexture) {
      // Updates the encoding for the texture, affects all references.
      threeTexture.encoding = encoding;
    }
    if (this[$texture] != null) {
      // Applies the existing context to the new texture.
      this[$texture]!.applyNewTextureInfo(this);
    }
    this[$material]!.needsUpdate = true;
    this.onUpdate();
  }
}
