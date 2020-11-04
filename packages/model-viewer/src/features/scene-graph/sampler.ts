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

import {MagFilter, MinFilter, Sampler as GLTFSampler, WrapMode} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Sampler as SamplerInterface} from './api.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';

const isMinFilter = (() => {
  const minFilterValues: Array<MinFilter> =
      [9728, 9729, 9984, 9985, 9986, 9987];
  return (value: unknown): value is MinFilter =>
             minFilterValues.indexOf(value as MinFilter) > -1;
})();

const isMagFilter = (() => {
  const magFilterValues: Array<MagFilter> = [9728, 9729];
  return (value: unknown): value is MagFilter =>
             magFilterValues.indexOf(value as MagFilter) > -1;
})();

const isWrapMode = (() => {
  const wrapModes: Array<WrapMode> = [33071, 33648, 10497];
  return (value: unknown): value is WrapMode =>
             wrapModes.indexOf(value as WrapMode) > -1;
})();

const isValidSamplerValue = <P extends 'minFilter'|'magFilter'|'wrapS'|'wrapT'>(
    property: P, value: unknown): value is GLTFSampler[P] => {
  switch (property) {
    case 'minFilter':
      return isMinFilter(value);
    case 'magFilter':
      return isMagFilter(value);
    case 'wrapS':
    case 'wrapT':
      return isWrapMode(value);
    default:
      throw new Error(`Cannot configure property "${property}" on Sampler`);
  }
};

const $threeTextures = Symbol('threeTextures');
const $setProperty = Symbol('setProperty');

/**
 * Sampler facade implementation for Three.js textures
 */
export class Sampler extends ThreeDOMElement implements SamplerInterface {
  private get[$threeTextures]() {
    return this[$correlatedObjects] as Set<ThreeTexture>;
  }

  constructor(
      onUpdate: () => void, sampler: GLTFSampler,
      correlatedTextures: Set<ThreeTexture>) {
    // These defaults represent a convergence of glTF defaults for wrap mode and
    // Three.js defaults for filters. Per glTF 2.0 spec, a renderer may choose
    // its own defaults for filters.
    // @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-sampler
    // @see https://threejs.org/docs/#api/en/textures/Texture
    if (sampler.minFilter == null) {
      sampler.minFilter = 9987;
    }
    if (sampler.magFilter == null) {
      sampler.magFilter = 9729;
    }
    if (sampler.wrapS == null) {
      sampler.wrapS = 10497;
    }
    if (sampler.wrapT == null) {
      sampler.wrapT = 10497;
    }

    super(onUpdate, sampler, correlatedTextures);
  }

  get name(): string {
    return (this[$sourceObject] as any).name || '';
  }

  get minFilter(): MinFilter {
    return (this[$sourceObject] as GLTFSampler).minFilter!;
  }

  get magFilter(): MagFilter {
    return (this[$sourceObject] as GLTFSampler).magFilter!;
  }

  get wrapS(): WrapMode {
    return (this[$sourceObject] as GLTFSampler).wrapS!;
  }

  get wrapT(): WrapMode {
    return (this[$sourceObject] as GLTFSampler).wrapT!;
  }

  setMinFilter(filter: MinFilter) {
    this[$setProperty]('minFilter', filter);
  }

  setMagFilter(filter: MagFilter) {
    this[$setProperty]('magFilter', filter);
  }

  setWrapS(mode: WrapMode) {
    this[$setProperty]('wrapS', mode);
  }

  setWrapT(mode: WrapMode) {
    this[$setProperty]('wrapT', mode);
  }

  private[$setProperty]<P extends 'minFilter'|'magFilter'|'wrapS'|'wrapT'>(
      property: P, value: MinFilter|MagFilter|WrapMode) {
    const sampler = this[$sourceObject] as GLTFSampler;

    if (isValidSamplerValue(property, value)) {
      sampler[property] = value;

      for (const texture of this[$threeTextures]) {
        texture[property] = value;
        texture.needsUpdate = true;
      }
    }
    this[$onUpdate]();
  }
}
