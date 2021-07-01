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

import {GLTF, TextureInfo as GLTFTextureInfo} from '../../three-components/gltf-instance/gltf-2.0.js';

import {TextureInfo as TextureInfoInterface} from './api.js';
import {$threeTexture} from './image.js';
import {$material, $usage, TextureContext, TextureUsage} from './material.js';
import {Texture} from './texture.js';
import {ThreeDOMElement} from './three-dom-element.js';



const $texture = Symbol('texture');
const $textureContext = Symbol('textureContext');

/**
 * TextureInfo facade implementation for Three.js materials
 */
export class TextureInfo extends ThreeDOMElement implements
    TextureInfoInterface {
  private[$texture]: Texture|null;
  private[$textureContext]: TextureContext;

  constructor(
      onUpdate: () => void, gltf: GLTF, textureInfo: GLTFTextureInfo,
      correlatedTextures: Set<ThreeTexture>, textureContext: TextureContext) {
    super(onUpdate, textureInfo, correlatedTextures);
    this[$textureContext] = textureContext;
    const {index: textureIndex} = textureInfo;
    const texture = gltf.textures ? gltf.textures[textureIndex] : null;

    if (texture != null) {
      this[$texture] = new Texture(onUpdate, gltf, texture, correlatedTextures);
    }
  }

  get texture(): Texture|null {
    return this[$texture];
  }

  setTexture(texture: Texture|null): void {
    let threeTexture: ThreeTexture|null = null;
    let encoding: TextureEncoding = sRGBEncoding;

    // Assigns the passed in textures threeTexture to the material. Otherwise
    // the texture is cleared by removing setting the material texture and
    // the model-viewer texture to null.
    if (texture) {
      threeTexture = texture.source[$threeTexture];
    } else {
      // Removes texture from the texture-info.
      this[$texture] = null;
    }
    switch (this[$textureContext][$usage]) {
      case TextureUsage.Base:
        this[$textureContext][$material].map = threeTexture;
        break;
      case TextureUsage.Metallic:
        encoding = LinearEncoding;
        this[$textureContext][$material].metalnessMap = threeTexture;
        break;
      case TextureUsage.Normal:
        encoding = LinearEncoding;
        this[$textureContext][$material].normalMap = threeTexture;
        break;
      case TextureUsage.Occlusion:
        encoding = LinearEncoding;
        this[$textureContext][$material].aoMap = threeTexture;
        break;
      case TextureUsage.Emissive:
        this[$textureContext][$material].emissiveMap = threeTexture;
        break;
      default:
    }
    if (threeTexture) {
      // Updates the encoding for the texture, affects all references.
      threeTexture.encoding = encoding;
    }
    this[$textureContext][$material].needsUpdate = true;
    this[$textureContext].onUpdate();
  }
}
