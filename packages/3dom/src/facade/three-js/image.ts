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

import {EmbeddedImage as GLTFEmbeddedImage, ExternalImage as GLTFExternalImage, Image as GLTFImage} from '../../gltf-2.0.js';
import {SerializedImage} from '../../protocol.js';
import {Image as ImageInterface} from '../api.js';

import {ModelGraft} from './model-graft.js';
import {$correlatedObjects, ThreeDOMElement} from './three-dom-element.js';

const loader = new ImageLoader();

const $threeTextures = Symbol('threeTextures');
const $bufferViewImages = Symbol('bufferViewImages');

/**
 * Image facade implementation for Three.js textures
 */
export class Image extends ThreeDOMElement implements ImageInterface {
  private get[$threeTextures]() {
    return this[$correlatedObjects] as Set<ThreeTexture>;
  }

  private[$bufferViewImages]: WeakMap<ThreeTexture, unknown> = new WeakMap();

  constructor(
      graft: ModelGraft, image: GLTFImage,
      correlatedTextures: Set<ThreeTexture>) {
    super(graft, image, correlatedTextures);

    if ((image as GLTFEmbeddedImage).bufferView != null) {
      for (const texture of correlatedTextures) {
        this[$bufferViewImages].set(texture, texture.image);
      }
    }
  }

  async mutate(property: 'uri', value: string|null): Promise<void> {
    let image: HTMLImageElement|null = null;

    if (property !== 'uri') {
      throw new Error(`Cannot configure property "${property}" on Image`);
    }

    if (value != null) {
      image = await new Promise((resolve, reject) => {
        loader.load(value, resolve, undefined, reject);
      });
    }

    for (const texture of this[$threeTextures]) {
      // If the URI is set to null but the Image had an associated buffer view
      // (this would happen if it started out as embedded), then fall back to
      // the cached object URL created by GLTFLoader:
      if (image == null &&
          (this.sourceObject as GLTFEmbeddedImage).bufferView != null) {
        texture.image = this[$bufferViewImages].get(texture);
      } else {
        texture.image = image;
      }

      texture.needsUpdate = true;
    }
  }

  toJSON(): SerializedImage {
    const serialized: Partial<SerializedImage> = super.toJSON();
    const {uri} = this.sourceObject as GLTFExternalImage;

    if (uri != null) {
      serialized.uri = uri;
    }

    return serialized as SerializedImage;
  }
}
