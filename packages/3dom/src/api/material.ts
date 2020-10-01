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

import {Material as MaterialInterface, PBRMetallicRoughness, TextureInfo} from '../api.js';
import {SerializedMaterial} from '../protocol.js';

import {ModelKernelInterface} from './model-kernel.js';
import {ThreeDOMElement} from './three-dom-element.js';

const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');

const $kernel = Symbol('kernel');
const $name = Symbol('name');

/**
 * A Material represents a live material in the backing scene graph. Its
 * primary purpose is to give the user write access to discrete properties
 * (for example, the base color factor) of the backing material.
 */
export class Material extends ThreeDOMElement implements MaterialInterface {
  protected[$pbrMetallicRoughness]: PBRMetallicRoughness;
  protected[$normalTexture]: TextureInfo|null = null;
  protected[$occlusionTexture]: TextureInfo|null = null;
  protected[$emissiveTexture]: TextureInfo|null = null;

  protected[$kernel]: ModelKernelInterface;
  protected[$name]: string;

  constructor(kernel: ModelKernelInterface, serialized: SerializedMaterial) {
    super(kernel);

    this[$kernel] = kernel;

    if (serialized.name != null) {
      this[$name] = serialized.name;
    }

    const {
      pbrMetallicRoughness,
      normalTexture,
      occlusionTexture,
      emissiveTexture
    } = serialized;

    this[$pbrMetallicRoughness] =
        kernel.deserialize('pbr-metallic-roughness', pbrMetallicRoughness);

    if (normalTexture != null) {
      this[$normalTexture] = kernel.deserialize('texture-info', normalTexture);
    }

    if (occlusionTexture != null) {
      this[$occlusionTexture] =
          kernel.deserialize('texture-info', occlusionTexture);
    }

    if (emissiveTexture != null) {
      this[$emissiveTexture] =
          kernel.deserialize('texture-info', emissiveTexture);
    }
  }

  /**
   * The PBR properties that are assigned to this material, if any.
   */
  get pbrMetallicRoughness(): PBRMetallicRoughness {
    return this[$pbrMetallicRoughness];
  }

  get normalTexture(): TextureInfo|null {
    return this[$normalTexture];
  }

  get occlusionTexture(): TextureInfo|null {
    return this[$occlusionTexture];
  }
  get emissiveTexture(): TextureInfo|null {
    return this[$emissiveTexture];
  }

  /**
   * The name of the material. Note that names are optional and not
   * guaranteed to be unique.
   */
  get name(): string {
    return this[$name];
  }
}
