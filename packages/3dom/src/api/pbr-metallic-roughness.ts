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

import {PBRMetallicRoughness as PBRMetallicRoughnessInterface, RGBA, TextureInfo} from '../api.js';
import {SerializedPBRMetallicRoughness} from '../protocol.js';

import {ModelKernelInterface} from './model-kernel.js';
import {ThreeDOMElement} from './three-dom-element.js';

const $kernel = Symbol('kernel');
const $baseColorFactor = Symbol('baseColorFactor');
const $baseColorTexture = Symbol('baseColorTexture');
const $metallicRoughnessTexture = Symbol('metallicRoughnessTexture');
const $metallicFactor = Symbol('metallicFactor');
const $roughnessFactor = Symbol('roughnessFactor');

/**
 * PBRMetallicRoughness exposes the PBR properties for a given Material.
 */
export class PBRMetallicRoughness extends ThreeDOMElement implements
    PBRMetallicRoughnessInterface {
  protected[$kernel]: ModelKernelInterface;
  protected[$baseColorFactor]: Readonly<RGBA>;
  protected[$baseColorTexture]: TextureInfo|null = null;
  protected[$metallicFactor]: Readonly<number>;
  protected[$roughnessFactor]: Readonly<number>;
  protected[$metallicRoughnessTexture]: TextureInfo|null = null;

  constructor(
      kernel: ModelKernelInterface,
      serialized: SerializedPBRMetallicRoughness) {
    super(kernel);

    this[$kernel] = kernel;
    this[$baseColorFactor] = Object.freeze(serialized.baseColorFactor) as RGBA;
    this[$metallicFactor] = Object.freeze(serialized.metallicFactor) as number;
    this[$roughnessFactor] =
        Object.freeze(serialized.roughnessFactor) as number;

    const {baseColorTexture, metallicRoughnessTexture} = serialized;

    if (baseColorTexture != null) {
      this[$baseColorTexture] =
          kernel.deserialize('texture-info', baseColorTexture);
    }

    if (metallicRoughnessTexture != null) {
      this[$metallicRoughnessTexture] =
          kernel.deserialize('texture-info', metallicRoughnessTexture);
    }
  }

  /**
   * The base color factor of the material in RGBA format.
   */
  get baseColorFactor() {
    return this[$baseColorFactor];
  }

  /**
   * The metalness factor of the material in range [0,1].
   */
  get metallicFactor() {
    return this[$metallicFactor];
  }

  /**
   * The roughness factor of the material in range [0,1].
   */
  get roughnessFactor() {
    return this[$roughnessFactor];
  }

  get baseColorTexture() {
    return this[$baseColorTexture];
  }

  get metallicRoughnessTexture() {
    return this[$metallicRoughnessTexture];
  }

  /**
   * Set the base color factor of the material.
   * Requires the material-properties capability.
   *
   * @see ../api.ts
   */
  async setBaseColorFactor(color: RGBA) {
    await this[$kernel].mutate(this, 'baseColorFactor', color);
    this[$baseColorFactor] = Object.freeze(color) as RGBA;
  }

  /**
   * Set the metallic factor of the material.
   * Requires the material-properties capability.
   *
   * @see ../api.ts
   */
  async setMetallicFactor(color: number) {
    await this[$kernel].mutate(this, 'metallicFactor', color);
    this[$metallicFactor] = Object.freeze(color) as number;
  }

  /**
   * Set the roughness factor of the material.
   * Requires the material-properties capability.
   *
   * @see ../api.ts
   */
  async setRoughnessFactor(color: number) {
    await this[$kernel].mutate(this, 'roughnessFactor', color);
    this[$roughnessFactor] = Object.freeze(color) as number;
  }
}
