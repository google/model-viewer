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

import {ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, MagnificationTextureFilter, MinificationTextureFilter, MirroredRepeatWrapping, NearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, RepeatWrapping, Texture as ThreeTexture, Vector2, Wrapping} from 'three';

import {toVector2D, Vector2D} from '../../model-viewer-base.js';
import {Filter, MagFilter, MinFilter, Wrap, WrapMode} from '../../three-components/gltf-instance/gltf-2.0.js';
import {Sampler as DefaultedSampler} from '../../three-components/gltf-instance/gltf-defaulted.js';

import {Sampler as SamplerInterface, Vector2DInterface} from './api.js';
import {$correlatedObjects, $onUpdate, ThreeDOMElement} from './three-dom-element.js';

// Convertion between gltf standards and threejs standards.
const wrapModeToWrapping = new Map<WrapMode, Wrapping>([
  [Wrap.Repeat, RepeatWrapping],
  [Wrap.ClampToEdge, ClampToEdgeWrapping],
  [Wrap.MirroredRepeat, MirroredRepeatWrapping]
]);
const wrappingToWrapMode = new Map<Wrapping, WrapMode>([
  [RepeatWrapping, Wrap.Repeat],
  [ClampToEdgeWrapping, Wrap.ClampToEdge],
  [MirroredRepeatWrapping, Wrap.MirroredRepeat]
]);
const minFilterToMinification = new Map<MinFilter, MinificationTextureFilter>([
  [Filter.Nearest, NearestFilter],
  [Filter.Linear, LinearFilter],
  [Filter.NearestMipmapNearest, NearestMipmapNearestFilter],
  [Filter.LinearMipmapNearest, LinearMipmapNearestFilter],
  [Filter.NearestMipmapLinear, NearestMipmapLinearFilter],
  [Filter.LinearMipmapLinear, LinearMipmapLinearFilter]
]);
const minificationToMinFilter = new Map<MinificationTextureFilter, MinFilter>([
  [NearestFilter, Filter.Nearest],
  [LinearFilter, Filter.Linear],
  [NearestMipmapNearestFilter, Filter.NearestMipmapNearest],
  [LinearMipmapNearestFilter, Filter.LinearMipmapNearest],
  [NearestMipmapLinearFilter, Filter.NearestMipmapLinear],
  [LinearMipmapLinearFilter, Filter.LinearMipmapLinear]
]);
const magFilterToMagnification = new Map<MagFilter, MagnificationTextureFilter>(
    [[Filter.Nearest, NearestFilter], [Filter.Linear, LinearFilter]]);
const magnificationToMagFilter = new Map<MagnificationTextureFilter, MagFilter>(
    [[NearestFilter, Filter.Nearest], [LinearFilter, Filter.Linear]]);

// Checks for threejs standards.
const isMinFilter = (() => {
  return (value: unknown): value is MinificationTextureFilter =>
             minificationToMinFilter.has(value as MinificationTextureFilter);
})();

const isMagFilter = (() => {
  return (value: unknown): value is MagnificationTextureFilter =>
             magnificationToMagFilter.has(value as MagnificationTextureFilter);
})();

const isWrapping = (() => {
  return (value: unknown): value is Wrapping =>
             wrappingToWrapMode.has(value as Wrapping);
})();

const isValidSamplerValue =
    <P extends 'minFilter'|'magFilter'|'wrapS'|'wrapT'|'rotation'|'repeat'|
     'offset'>(property: P, value: unknown): value is DefaultedSampler[P] => {
      switch (property) {
        case 'minFilter':
          return isMinFilter(value);
        case 'magFilter':
          return isMagFilter(value);
        case 'wrapS':
        case 'wrapT':
          return isWrapping(value);
        case 'rotation':
        case 'repeat':
        case 'offset':
          return true;
        default:
          throw new Error(`Cannot configure property "${property}" on Sampler`);
      }
    };

const $threeTexture = Symbol('threeTexture');
const $threeTextures = Symbol('threeTextures');
const $setProperty = Symbol('setProperty');

/**
 * Sampler facade implementation for Three.js textures
 */
export class Sampler extends ThreeDOMElement implements SamplerInterface {
  private get[$threeTexture]() {
    return this[$correlatedObjects]?.values().next().value as ThreeTexture;
  }

  private get[$threeTextures]() {
    return this[$correlatedObjects] as Set<ThreeTexture>;
  }

  constructor(onUpdate: () => void, texture: ThreeTexture) {
    super(onUpdate, new Set<ThreeTexture>(texture ? [texture] : []));
  }

  get name(): string {
    return this[$threeTexture].name || '';
  }

  get minFilter(): MinFilter {
    return minificationToMinFilter.get(this[$threeTexture].minFilter)!;
  }

  get magFilter(): MagFilter {
    return magnificationToMagFilter.get(this[$threeTexture].magFilter)!;
  }

  get wrapS(): WrapMode {
    return wrappingToWrapMode.get(this[$threeTexture].wrapS)!;
  }

  get wrapT(): WrapMode {
    return wrappingToWrapMode.get(this[$threeTexture].wrapT)!;
  }

  get rotation(): number {
    return this[$threeTexture].rotation;
  }

  get scale(): Vector2D {
    return toVector2D(this[$threeTexture].repeat);
  }

  get offset(): Vector2D|null {
    return toVector2D(this[$threeTexture].offset);
  }

  setMinFilter(filter: MinFilter) {
    this[$setProperty]('minFilter', minFilterToMinification.get(filter)!);
  }

  setMagFilter(filter: MagFilter) {
    this[$setProperty]('magFilter', magFilterToMagnification.get(filter)!);
  }

  setWrapS(mode: WrapMode) {
    this[$setProperty]('wrapS', wrapModeToWrapping.get(mode)!);
  }

  setWrapT(mode: WrapMode) {
    this[$setProperty]('wrapT', wrapModeToWrapping.get(mode)!);
  }

  setRotation(rotation: number|null): void {
    if (rotation == null) {
      // Reset rotation.
      rotation = 0;
    }
    this[$setProperty]('rotation', rotation);
  }

  setScale(scale: Vector2DInterface|null): void {
    if (scale == null) {
      // Reset scale.
      scale = {u: 1, v: 1};
    }
    this[$setProperty]('repeat', new Vector2(scale.u, scale.v));
  }

  setOffset(offset: Vector2DInterface|null): void {
    if (offset == null) {
      // Reset offset.
      offset = {u: 0, v: 0};
    }
    this[$setProperty]('offset', new Vector2(offset.u, offset.v));
  }

  private[$setProperty]<P extends 'minFilter'|'magFilter'|'wrapS'|'wrapT'|
                        'rotation'|'repeat'|'offset'>(
      property: P, value: MinFilter|MagFilter|Wrapping|number|Vector2) {
    if (isValidSamplerValue(property, value)) {
      for (const texture of this[$threeTextures]) {
        (texture[property] as MinFilter | MagFilter | Wrapping | number |
         Vector2) = value;
        texture.needsUpdate = true;
      }
    }
    this[$onUpdate]();
  }
}
