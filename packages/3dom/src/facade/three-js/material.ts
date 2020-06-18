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

import {MeshStandardMaterial, Texture as ThreeTexture} from 'three';

import {Material as GLTFMaterial} from '../../gltf-2.0.js';
import {SerializedMaterial} from '../../protocol.js';
import {Material as MaterialInterface} from '../api.js';

import {ModelGraft} from './model-graft.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo} from './texture-info.js';
import {ThreeDOMElement} from './three-dom-element.js';


const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');

/**
 * Material facade implementation for Three.js materials
 */
export class Material extends ThreeDOMElement implements MaterialInterface {
  private[$pbrMetallicRoughness]: PBRMetallicRoughness|null = null;

  private[$normalTexture]: TextureInfo|null = null;
  private[$occlusionTexture]: TextureInfo|null = null;
  private[$emissiveTexture]: TextureInfo|null = null;

  constructor(
      graft: ModelGraft, material: GLTFMaterial,
      correlatedMaterials: Set<MeshStandardMaterial>) {
    super(graft, material, correlatedMaterials);

    const {
      pbrMetallicRoughness,
      normalTexture,
      occlusionTexture,
      emissiveTexture
    } = material;

    if (pbrMetallicRoughness != null) {
      this[$pbrMetallicRoughness] = new PBRMetallicRoughness(
          graft, pbrMetallicRoughness, correlatedMaterials);
    }

    const normalTextures = new Set<ThreeTexture>();
    const occlusionTextures = new Set<ThreeTexture>();
    const emissiveTextures = new Set<ThreeTexture>();

    for (const material of correlatedMaterials) {
      const {normalMap, aoMap, emissiveMap} = material;

      if (normalTexture != null && normalMap != null) {
        normalTextures.add(normalMap);
      }

      if (occlusionTexture != null && aoMap != null) {
        occlusionTextures.add(aoMap);
      }

      if (emissiveTexture != null && emissiveMap != null) {
        emissiveTextures.add(emissiveMap);
      }
    }

    if (normalTextures.size > 0) {
      this[$normalTexture] =
          new TextureInfo(graft, normalTexture!, normalTextures);
    }

    if (occlusionTextures.size > 0) {
      this[$occlusionTexture] =
          new TextureInfo(graft, occlusionTexture!, occlusionTextures);
    }

    if (emissiveTextures.size > 0) {
      this[$emissiveTexture] =
          new TextureInfo(graft, emissiveTexture!, emissiveTextures);
    }
  }

  get pbrMetallicRoughness() {
    return this[$pbrMetallicRoughness];
  }

  get normalTexture() {
    return this[$normalTexture];
  }

  get occlusionTexture() {
    return this[$occlusionTexture];
  }

  get emissiveTexture() {
    return this[$emissiveTexture];
  }

  toJSON(): SerializedMaterial {
    const serialized: Partial<SerializedMaterial> = super.toJSON();
    const {
      pbrMetallicRoughness,
      normalTexture,
      occlusionTexture,
      emissiveTexture
    } = this;
    if (pbrMetallicRoughness != null) {
      serialized.pbrMetallicRoughness = pbrMetallicRoughness.toJSON();
    }

    if (normalTexture != null) {
      serialized.normalTexture = normalTexture.toJSON();
    }

    if (occlusionTexture != null) {
      serialized.occlusionTexture = occlusionTexture.toJSON();
    }

    if (emissiveTexture != null) {
      serialized.emissiveTexture = emissiveTexture.toJSON();
    }

    return serialized as SerializedMaterial;
  }
}
