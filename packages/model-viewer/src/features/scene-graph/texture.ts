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

import {GLTFElement} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Texture as TextureInterface} from './api.js';
import {Image} from './image.js';
import {$gltfTexture, $threeTexture, TextureContext} from './material.js';
import {Sampler} from './sampler.js';
import {$onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $source = Symbol('source');
const $sampler = Symbol('sampler');

/**
 * Material facade implementation for Three.js materials
 */
export class Texture extends ThreeDOMElement implements TextureInterface {
  private[$source]: Image;
  private[$sampler]: Sampler;

  constructor(context: TextureContext) {
    super(
        context.onUpdate,
        context[$gltfTexture],
        new Set<ThreeTexture>([context[$threeTexture]!]));
    this[$sampler] = new Sampler(context);
    this[$source] = new Image(context);
  }

  applyNewContext(context: TextureContext): void {
    (this[$onUpdate] as () => void) = context.onUpdate;
    (this[$sourceObject] as GLTFElement) = context[$gltfTexture];
    this[$sampler] = new Sampler(context);
    this[$source] = new Image(context);
  }

  get name(): string {
    return (this[$sourceObject] as any).name || '';
  }

  get sampler(): Sampler {
    return this[$sampler];
  }

  get source(): Image {
    return this[$source];
  }
}
