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

import {ImageLoader, Texture as ThreeTexture} from 'three';

import {EmbeddedImage as GLTFEmbeddedImage, Image as GLTFImage} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Image as ImageInterface} from './api.js';
import {$gltf, $gltfImage, $gltfTexture, $threeTexture, TextureContext} from './material.js';
import {$onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const loader = new ImageLoader();

// const $threeTextures = Symbol('threeTextures');
export const $underlyingTexture = Symbol('threeTextures');
const $uri = Symbol('uri');
const $bufferViewImages = Symbol('bufferViewImages');
const $context = Symbol('context');
export const $applyTexture = Symbol('applyTexture');

/**
 * Image facade implementation for Three.js textures
 */
export class Image extends ThreeDOMElement implements ImageInterface {
  get[$underlyingTexture]() {
    return this[$context][$threeTexture];
  }

  private[$uri]: string|undefined = undefined;
  private[$bufferViewImages]: WeakMap<ThreeTexture, unknown> = new WeakMap();

  private[$context]: TextureContext;
  constructor(context: TextureContext) {
    super(
        context.onUpdate, Image.getGLTFImage(context), new Set<ThreeTexture>());
    this[$context] = context;
  }

  private static getGLTFImage(context: TextureContext): GLTFImage {
    const gltf = context[$gltf];
    const {source: imageIndex} = context[$gltfTexture]!;
    if (imageIndex === -1) {
      context[$gltfImage] = {name: 'adhoc_image', uri: 'adhoc_image'};
    } else if (gltf.images && imageIndex != null) {
      const image = gltf.images[imageIndex];
      context[$gltfImage] = image;
    } else {
      context[$gltfImage] = {name: 'null_image', uri: 'null_image'};
    }
    return context[$gltfImage]!;
  }

  get name(): string {
    return (this[$sourceObject] as any).name || '';
  }

  get uri(): string|undefined {
    return this[$uri];
  }

  get type(): 'embedded'|'external' {
    return this.uri != null ? 'external' : 'embedded';
  }

  async setURI(uri: string): Promise<void> {
    this[$uri] = uri;

    const image = await new Promise((resolve, reject) => {
      loader.load(uri, resolve, undefined, reject);
    });

    const texture = this[$context][$threeTexture];
    if (texture) {
      // If the URI is set to null but the Image had an associated buffer view
      // (this would happen if it started out as embedded), then fall back to
      // the cached object URL created by GLTFLoader:
      if (image == null &&
          (this[$sourceObject] as GLTFEmbeddedImage).bufferView != null) {
        texture.image = this[$bufferViewImages].get(texture);
      } else {
        texture.image = image;
      }
      texture.needsUpdate = true;
      this[$onUpdate]();
    }
  }

  // [$applyTexture](applicator: ((texture: ThreeTexture) => void)|undefined) {
  //   if (applicator) {
  //     const texture = this[$context][$threeTexture];
  //     if (texture) {
  //       applicator(texture);
  //     }
  //   }
  // }
}
