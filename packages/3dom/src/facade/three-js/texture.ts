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

import {Texture as GLTFTexture} from '../../gltf-2.0.js';
import {SerializedTexture} from '../../protocol.js';
import {Texture as TextureInterface} from '../api.js';

import {Image} from './image.js';
import {ModelGraft} from './model-graft.js';
import {Sampler} from './sampler.js';
import {ThreeDOMElement} from './three-dom-element.js';


const $source = Symbol('source');
const $sampler = Symbol('sampler');

/**
 * Material facade implementation for Three.js materials
 */
export class Texture extends ThreeDOMElement implements TextureInterface {
  private[$source]: Image|null = null;
  private[$sampler]: Sampler|null = null;

  constructor(
      graft: ModelGraft, texture: GLTFTexture,
      correlatedTextures: Set<ThreeTexture>) {
    super(graft, texture, correlatedTextures);

    const glTF = graft.correlatedSceneGraph.gltf;
    const {sampler: samplerIndex, source: imageIndex} = texture;

    if (samplerIndex != null) {
      const sampler = glTF.samplers && glTF.samplers[samplerIndex];

      if (sampler != null) {
        this[$sampler] = new Sampler(graft, sampler, correlatedTextures);
      }
    }

    if (imageIndex != null) {
      const image = glTF.images && glTF.images[imageIndex];

      if (image != null) {
        this[$source] = new Image(graft, image, correlatedTextures);
      }
    }
  }

  get sampler() {
    return this[$sampler];
  }

  get source() {
    return this[$source];
  }

  toJSON(): SerializedTexture {
    const serialized: Partial<SerializedTexture> = super.toJSON();

    const {sampler, source} = this;

    if (sampler != null) {
      serialized.sampler = sampler.toJSON();
    }

    if (source != null) {
      serialized.source = source.toJSON();
    }

    return serialized as SerializedTexture;
  }
}
