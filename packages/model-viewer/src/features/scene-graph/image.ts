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

import {EmbeddedImage as GLTFEmbeddedImage} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Image as ImageInterface} from './api.js';
import {$gltfImage, $threeTexture, TextureInfo} from './texture-info.js';
import {$onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const loader = new ImageLoader();

export const $underlyingTexture = Symbol('threeTextures');
const $uri = Symbol('uri');
const $bufferViewImages = Symbol('bufferViewImages');
const $textureInfo = Symbol('textureInfo');
export const $applyTexture = Symbol('applyTexture');

/**
 * Image facade implementation for Three.js textures
 */
export class Image extends ThreeDOMElement implements ImageInterface {
  get[$underlyingTexture]() {
    return this[$textureInfo][$threeTexture];
  }

  private[$uri]: string|undefined = undefined;
  private[$bufferViewImages]: WeakMap<ThreeTexture, unknown> = new WeakMap();

  private[$textureInfo]: TextureInfo;
  constructor(textureInfo: TextureInfo) {
    super(
        textureInfo.onUpdate,
        textureInfo[$gltfImage],
        new Set<ThreeTexture>([textureInfo[$threeTexture]!]));
    this[$textureInfo] = textureInfo;
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

    const texture = this[$textureInfo][$threeTexture];
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
}
