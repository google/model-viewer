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

import {Texture as ThreeTexture} from 'three';

import {GLTF, TextureInfo as GLTFTextureInfo} from '../../three-components/gltf-instance/gltf-2.0.js';

import {TextureInfo as TextureInfoInterface} from './api.js';
import {Texture} from './texture.js';
import {ThreeDOMElement} from './three-dom-element.js';


const $texture = Symbol('texture');

/**
 * TextureInfo facade implementation for Three.js materials
 */
export class TextureInfo extends ThreeDOMElement implements
    TextureInfoInterface {
  private[$texture]: Texture;

  constructor(
      onUpdate: () => void, gltf: GLTF, textureInfo: GLTFTextureInfo,
      correlatedTextures: Set<ThreeTexture>) {
    super(onUpdate, textureInfo, correlatedTextures);

    const {index: textureIndex} = textureInfo;
    const texture = gltf.textures![textureIndex];

    if (texture != null) {
      this[$texture] = new Texture(onUpdate, gltf, texture, correlatedTextures);
    }
  }

  get texture(): Texture {
    return this[$texture];
  }
}
