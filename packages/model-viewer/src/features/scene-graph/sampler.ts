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

import {Filter, MagFilter, MinFilter, Sampler as GLTFSampler, Wrap, WrapMode} from '../../three-components/gltf-instance/gltf-2.0.js';
import {Sampler as DefaultedSampler} from '../../three-components/gltf-instance/gltf-defaulted.js';

import {Sampler as SamplerInterface} from './api.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const isMinFilter = (() => {
  const minFilterValues: Array<MinFilter> = [
    Filter.Nearest,
    Filter.Linear,
    Filter.NearestMipmapNearest,
    Filter.LinearMipmapLinear,
    Filter.NearestMipmapLinear,
    Filter.LinearMipmapLinear
  ];
  return (value: unknown): value is MinFilter =>
             minFilterValues.indexOf(value as MinFilter) > -1;
})();

const isMagFilter = (() => {
  const magFilterValues: Array<MagFilter> = [Filter.Nearest, Filter.Linear];
  return (value: unknown): value is MagFilter =>
             magFilterValues.indexOf(value as MagFilter) > -1;
})();

const isWrapMode = (() => {
  const wrapModes: Array<WrapMode> =
      [Wrap.ClampToEdge, Wrap.MirroredRepeat, Wrap.Repeat];
  return (value: unknown): value is WrapMode =>
             wrapModes.indexOf(value as WrapMode) > -1;
})();

const isValidSamplerValue = <P extends 'minFilter'|'magFilter'|'wrapS'|'wrapT'>(
    property: P, value: unknown): value is DefaultedSampler[P] => {
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
const $sourceSampler = Symbol('sourceSampler');

/**
 * Sampler facade implementation for Three.js textures
 */
export class Sampler extends ThreeDOMElement implements SamplerInterface {
  private get[$threeTextures]() {
    console.assert(
        this[$correlatedObjects] != null && this[$correlatedObjects]!.size > 0,
        'Sampler correlated object is undefined');
    return this[$correlatedObjects] as Set<ThreeTexture>;
  }

  private get[$sourceSampler]() {
    console.assert(this[$sourceObject] != null, 'Sampler source is undefined');
    return (this[$sourceObject] as DefaultedSampler);
  }

  constructor(
      onUpdate: () => void, texture: ThreeTexture|null,
      gltfSampler: GLTFSampler|null) {
    gltfSampler = gltfSampler ?? {} as GLTFSampler;
    // These defaults represent a convergence of glTF defaults for wrap mode and
    // Three.js defaults for filters. Per glTF 2.0 spec, a renderer may choose
    // its own defaults for filters.
    // @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-sampler
    // @see https://threejs.org/docs/#api/en/textures/Texture
    if (gltfSampler.minFilter == null) {
      gltfSampler.minFilter =
          texture ? texture.minFilter as MinFilter : Filter.LinearMipmapLinear;
    }
    if (gltfSampler.magFilter == null) {
      gltfSampler.magFilter =
          texture ? texture.magFilter as MagFilter : Filter.Linear;
    }
    if (gltfSampler.wrapS == null) {
      gltfSampler.wrapS = texture ? texture.wrapS as WrapMode : Wrap.Repeat;
    }
    if (gltfSampler.wrapT == null) {
      gltfSampler.wrapT = texture ? texture.wrapT as WrapMode : Wrap.Repeat;
    }

    super(
        onUpdate, gltfSampler, new Set<ThreeTexture>(texture ? [texture] : []));
  }

  get name(): string {
    return (this[$sourceObject] as Sampler).name || '';
  }

  get minFilter(): MinFilter {
    return this[$sourceSampler].minFilter;
  }

  get magFilter(): MagFilter {
    return this[$sourceSampler].magFilter;
  }

  get wrapS(): WrapMode {
    return this[$sourceSampler].wrapS;
  }

  get wrapT(): WrapMode {
    return this[$sourceSampler].wrapT;
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
    const sampler = this[$sourceSampler];
    if (sampler != null) {
      if (isValidSamplerValue(property, value)) {
        sampler[property] = value;

        for (const texture of this[$threeTextures]) {
          (texture[property] as MinFilter | MagFilter | WrapMode) = value;
          texture.needsUpdate = true;
        }
      }
      this[$onUpdate]();
    }
  }
}
