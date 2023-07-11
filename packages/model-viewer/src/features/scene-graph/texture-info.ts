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

import {ColorSpace, LinearSRGBColorSpace, MeshPhysicalMaterial, SRGBColorSpace, Texture as ThreeTexture, Vector2, VideoTexture} from 'three';

import {TextureInfo as TextureInfoInterface} from './api.js';
import {$threeTexture} from './image.js';
import {Texture} from './texture.js';

const $texture = Symbol('texture');
const $transform = Symbol('transform');
export const $materials = Symbol('materials');
export const $usage = Symbol('usage');
const $onUpdate = Symbol('onUpdate');
const $activeVideo = Symbol('activeVideo');

// Defines what a texture will be used for.
export enum TextureUsage {
  Base,
  MetallicRoughness,
  Normal,
  Occlusion,
  Emissive,
  Clearcoat,
  ClearcoatRoughness,
  ClearcoatNormal,
  SheenColor,
  SheenRoughness,
  Transmission,
  Thickness,
  Specular,
  SpecularColor,
  Iridescence,
  IridescenceThickness,
  Anisotropy,
}

interface TextureTransform {
  rotation: number;
  scale: Vector2;
  offset: Vector2;
}

/**
 * TextureInfo facade implementation for Three.js materials
 */
export class TextureInfo implements TextureInfoInterface {
  private[$texture]: Texture|null = null;
  private[$transform]: TextureTransform = {
    rotation: 0,
    scale: new Vector2(1, 1),
    offset: new Vector2(0, 0)
  };

  // Holds a reference to the Three data that backs the material object.
  private[$materials]: Set<MeshPhysicalMaterial>|null;

  // Texture usage defines the how the texture is used (ie Normal, Emissive...
  // etc)
  private[$usage]: TextureUsage;
  private[$onUpdate]: () => void;
  private[$activeVideo] = false;

  constructor(
      onUpdate: () => void, usage: TextureUsage,
      threeTexture: ThreeTexture|null, material: Set<MeshPhysicalMaterial>) {
    // Creates image, sampler, and texture if valid texture info is provided.
    if (threeTexture) {
      this[$transform].rotation = threeTexture.rotation;
      this[$transform].scale.copy(threeTexture.repeat);
      this[$transform].offset.copy(threeTexture.offset);

      this[$texture] = new Texture(onUpdate, threeTexture);
    }

    this[$onUpdate] = onUpdate;
    this[$materials] = material;
    this[$usage] = usage;
  }

  get texture(): Texture|null {
    return this[$texture];
  }

  setTexture(texture: Texture|null): void {
    const threeTexture: ThreeTexture|null =
        texture != null ? texture.source[$threeTexture] : null;

    const oldTexture = this[$texture]?.source[$threeTexture] as VideoTexture;
    if (oldTexture != null && oldTexture.isVideoTexture) {
      this[$activeVideo] = false;
    } else if (this[$texture]?.source.animation) {
      this[$texture].source.animation.removeEventListener(
          'enterFrame', this[$onUpdate]);
    }

    this[$texture] = texture;

    if (threeTexture != null && (threeTexture as VideoTexture).isVideoTexture) {
      const element = threeTexture.image;
      this[$activeVideo] = true;
      if (element.requestVideoFrameCallback != null) {
        const update = () => {
          if (!this[$activeVideo]) {
            return;
          }
          this[$onUpdate]();
          element.requestVideoFrameCallback(update);
        };
        element.requestVideoFrameCallback(update);
      } else {
        const update = () => {
          if (!this[$activeVideo]) {
            return;
          }
          this[$onUpdate]();
          requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
      }
    } else if (texture?.source.animation != null) {
      texture.source.animation.addEventListener('enterFrame', this[$onUpdate]);
    }

    let colorSpace: ColorSpace = SRGBColorSpace;
    if (this[$materials]) {
      for (const material of this[$materials]!) {
        switch (this[$usage]) {
          case TextureUsage.Base:
            material.map = threeTexture;
            break;
          case TextureUsage.MetallicRoughness:
            colorSpace = LinearSRGBColorSpace;
            material.metalnessMap = threeTexture;
            material.roughnessMap = threeTexture;
            break;
          case TextureUsage.Normal:
            colorSpace = LinearSRGBColorSpace;
            material.normalMap = threeTexture;
            break;
          case TextureUsage.Occlusion:
            colorSpace = LinearSRGBColorSpace;
            material.aoMap = threeTexture;
            break;
          case TextureUsage.Emissive:
            material.emissiveMap = threeTexture;
            break;
          case TextureUsage.Clearcoat:
            material.clearcoatMap = threeTexture;
            break;
          case TextureUsage.ClearcoatRoughness:
            material.clearcoatRoughnessMap = threeTexture;
            break;
          case TextureUsage.ClearcoatNormal:
            material.clearcoatNormalMap = threeTexture;
            break;
          case TextureUsage.SheenColor:
            material.sheenColorMap = threeTexture;
            break;
          case TextureUsage.SheenRoughness:
            material.sheenRoughnessMap = threeTexture;
            break;
          case TextureUsage.Transmission:
            material.transmissionMap = threeTexture;
            break;
          case TextureUsage.Thickness:
            material.thicknessMap = threeTexture;
            break;
          case TextureUsage.Specular:
            material.specularIntensityMap = threeTexture;
            break;
          case TextureUsage.SpecularColor:
            material.specularColorMap = threeTexture;
            break;
          case TextureUsage.Iridescence:
            material.iridescenceMap = threeTexture;
            break;
          case TextureUsage.IridescenceThickness:
            material.iridescenceThicknessMap = threeTexture;
            break;
          case TextureUsage.Anisotropy:
            (material as any).anisotropyMap = threeTexture;
            break;
          default:
        }
        material.needsUpdate = true;
      }
    }

    if (threeTexture) {
      // Updates the colorSpace for the texture, affects all references.
      threeTexture.colorSpace = colorSpace;
      threeTexture.rotation = this[$transform].rotation;
      threeTexture.repeat = this[$transform].scale;
      threeTexture.offset = this[$transform].offset;
    }
    this[$onUpdate]();
  }
}
