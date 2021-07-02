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

import {LinearEncoding, sRGBEncoding, Texture as ThreeTexture, TextureEncoding} from 'three';

import {TextureInfo as TextureInfoInterface} from './api.js';
import {$underlyingTexture} from './image.js';
import {$gltfTextureInfo, $material, $threeTexture, $usage, TextureContext, TextureUsage} from './material.js';
import {Texture} from './texture.js';
import {$correlatedObjects, ThreeDOMElement} from './three-dom-element.js';



const $texture = Symbol('texture');
const $textureContext = Symbol('textureContext');

/**
 * TextureInfo facade implementation for Three.js materials
 */
export class TextureInfo extends ThreeDOMElement implements
    TextureInfoInterface {
  private[$texture]: Texture|null;
  private[$textureContext]: TextureContext;

  constructor(context: TextureContext) {
    super(
        context.onUpdate,
        context[$gltfTextureInfo]!,
        new Set<ThreeTexture>([context[$threeTexture]!]));
    this[$textureContext] = context;
    this[$texture] = new Texture(context);
  }

  get texture(): Texture|null {
    return this[$texture];
  }

  setTexture(texture: Texture|null): void {
    const threeTexture: ThreeTexture|null =
        texture != null ? texture.source[$underlyingTexture] : null;
    let encoding: TextureEncoding = sRGBEncoding;
    this[$texture] = texture;
    this[$textureContext][$threeTexture] = threeTexture;
    // Ensures correlatedObjects is up to date.
    const correlatedObjects = (this[$correlatedObjects] as Set<ThreeTexture>);
    correlatedObjects.clear();
    if (threeTexture != null) {
      correlatedObjects.add(threeTexture);
    }

    switch (this[$textureContext][$usage]) {
      case TextureUsage.Base:
        this[$textureContext][$material]!.map = threeTexture;
        break;
      case TextureUsage.Metallic:
        encoding = LinearEncoding;
        this[$textureContext][$material]!.metalnessMap = threeTexture;
        break;
      case TextureUsage.Normal:
        encoding = LinearEncoding;
        this[$textureContext][$material]!.normalMap = threeTexture;
        break;
      case TextureUsage.Occlusion:
        encoding = LinearEncoding;
        this[$textureContext][$material]!.aoMap = threeTexture;
        break;
      case TextureUsage.Emissive:
        this[$textureContext][$material]!.emissiveMap = threeTexture;
        break;
      default:
    }
    if (threeTexture) {
      // Updates the encoding for the texture, affects all references.
      threeTexture.encoding = encoding;
    }
    if (this[$texture] != null) {
      // Applies the existing context to the new texture.
      this[$texture]!.applyNewContext(this[$textureContext]);
    }
    this[$textureContext][$material]!.needsUpdate = true;
    this[$textureContext].onUpdate();
  }
}
