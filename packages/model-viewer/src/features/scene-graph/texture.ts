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

import {Texture as TextureInterface} from './api.js';
import {Image} from './image.js';
import {Sampler} from './sampler.js';
import {$correlatedObjects, ThreeDOMElement} from './three-dom-element.js';



const $image = Symbol('image');
const $sampler = Symbol('sampler');
const $threeTexture = Symbol('threeTexture');

/**
 * Material facade implementation for Three.js materials
 */
export class Texture extends ThreeDOMElement implements TextureInterface {
  private[$image]: Image;
  private[$sampler]: Sampler;

  private get[$threeTexture]() {
    return this[$correlatedObjects]?.values().next().value as ThreeTexture;
  }

  constructor(onUpdate: () => void, threeTexture: ThreeTexture) {
    super(onUpdate, new Set<ThreeTexture>(threeTexture ? [threeTexture] : []));

    this[$sampler] = new Sampler(onUpdate, threeTexture);
    this[$image] = new Image(onUpdate, threeTexture);
  }

  get name(): string {
    return this[$threeTexture].name || '';
  }

  set name(name: string) {
    for (const texture of this[$correlatedObjects] as Set<ThreeTexture>) {
      texture.name = name;
    }
  }

  get sampler(): Sampler {
    return this[$sampler];
  }

  get source(): Image {
    return this[$image];
  }
}
