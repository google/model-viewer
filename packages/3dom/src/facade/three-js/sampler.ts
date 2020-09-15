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

import {MagFilter, MinFilter, Sampler as GLTFSampler, WrapMode} from '../../gltf-2.0.js';
import {SerializedSampler} from '../../protocol.js';
import {Sampler as SamplerInterface} from '../api.js';

import {ModelGraft} from './model-graft.js';
import {$correlatedObjects, ThreeDOMElement} from './three-dom-element.js';

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

// These defaults represent a convergence of glTF defaults for wrap mode and
// Three.js defaults for filters. Per glTF 2.0 spec, a renderer may choose its
// own defaults for filters.
// @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-sampler
// @see https://threejs.org/docs/#api/en/textures/Texture
const defaultValues:
    {[k in 'minFilter' | 'magFilter' | 'wrapS' | 'wrapT']: number} = {
      minFilter: 9987,
      magFilter: 9729,
      wrapS: 10497,
      wrapT: 10497,
    };

const $threeTextures = Symbol('threeTextures');

/**
 * Sampler facade implementation for Three.js textures
 */
export class Sampler extends ThreeDOMElement implements SamplerInterface {
  private get[$threeTextures]() {
    return this[$correlatedObjects] as Set<ThreeTexture>;
  }

  constructor(
      graft: ModelGraft, sampler: GLTFSampler,
      correlatedTextures: Set<ThreeTexture>) {
    super(graft, sampler, correlatedTextures);
  }

  async mutate<P extends 'minFilter'|'magFilter'|'wrapS'|'wrapT'>(
      property: P, value: MinFilter|MagFilter|WrapMode|null): Promise<void> {
    const sampler = this.sourceObject as GLTFSampler;

    if (value != null) {
      if (isValidSamplerValue(property, value)) {
        sampler[property] = value;

        for (const texture of this[$threeTextures]) {
          texture[property] = value;
          texture.needsUpdate = true;
        }
      }
    } else if (property in sampler) {
      delete sampler[property];

      for (const texture of this[$threeTextures]) {
        texture[property] = defaultValues[property];
        texture.needsUpdate = true;
      }
    }
  }

  toJSON(): SerializedSampler {
    const serialized: Partial<SerializedSampler> = super.toJSON();
    const {minFilter, magFilter, wrapS, wrapT} =
        this.sourceObject as GLTFSampler;

    if (minFilter != null) {
      serialized.minFilter = minFilter;
    }

    if (magFilter != null) {
      serialized.magFilter = magFilter;
    }

    if (wrapS !== 10497) {
      serialized.wrapS = wrapS;
    }

    if (wrapT !== 10497) {
      serialized.wrapT = wrapT;
    }

    return serialized as SerializedSampler;
  }
}
