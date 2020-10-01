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
  protected[$metallicFactor]: number;
  protected[$roughnessFactor]: number;
  protected[$metallicRoughnessTexture]: TextureInfo|null = null;

  constructor(
      kernel: ModelKernelInterface,
      serialized: SerializedPBRMetallicRoughness) {
    super(kernel);

    this[$kernel] = kernel;
    this[$baseColorFactor] = Object.freeze(serialized.baseColorFactor) as RGBA;
    this[$metallicFactor] = serialized.metallicFactor;
    this[$roughnessFactor] = serialized.roughnessFactor;

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
  get baseColorFactor(): Readonly<RGBA> {
    return this[$baseColorFactor];
  }

  /**
   * The metalness factor of the material in range [0,1].
   */
  get metallicFactor(): number {
    return this[$metallicFactor];
  }

  /**
   * The roughness factor of the material in range [0,1].
   */
  get roughnessFactor(): number {
    return this[$roughnessFactor];
  }

  get baseColorTexture(): TextureInfo|null {
    return this[$baseColorTexture];
  }

  get metallicRoughnessTexture(): TextureInfo|null {
    return this[$metallicRoughnessTexture];
  }

  /**
   * Set the base color factor of the material.
   *
   * @see ../api.ts
   */
  async setBaseColorFactor(color: RGBA): Promise<void> {
    await this[$kernel].mutate(this, 'baseColorFactor', color);
    this[$baseColorFactor] = Object.freeze(color) as RGBA;
  }

  /**
   * Set the metallic factor of the material.
   *
   * @see ../api.ts
   */
  async setMetallicFactor(factor: number): Promise<void> {
    await this[$kernel].mutate(this, 'metallicFactor', factor);
    this[$metallicFactor] = factor;
  }

  /**
   * Set the roughness factor of the material.
   *
   * @see ../api.ts
   */
  async setRoughnessFactor(factor: number): Promise<void> {
    await this[$kernel].mutate(this, 'roughnessFactor', factor);
    this[$roughnessFactor] = factor;
  }
}
