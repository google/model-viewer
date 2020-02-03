/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {Constructor, PBRMetallicRoughness as PBRMetallicRoughnessInterface, RGBA, ThreeDOMElement} from '../api.js';
import {SerializedPBRMetallicRoughness} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export function definePBRMetallicRoughness(
    ThreeDOMElement: Constructor<ThreeDOMElement>):
    Constructor<PBRMetallicRoughnessInterface> {
  const $kernel = Symbol('kernel');
  const $baseColorFactor = Symbol('baseColorFactor');

  class PBRMetallicRoughness extends ThreeDOMElement implements
      PBRMetallicRoughnessInterface {
    protected[$kernel]: ModelKernel;
    protected[$baseColorFactor]: Readonly<RGBA>;

    constructor(
        kernel: ModelKernel, serialized: SerializedPBRMetallicRoughness) {
      super(kernel, serialized);

      this[$kernel] = kernel;
      this[$baseColorFactor] =
          Object.freeze(serialized.baseColorFactor) as RGBA;
    }

    get baseColorFactor() {
      return this[$baseColorFactor];
    }

    async setBaseColorFactor(color: RGBA) {
      try {
        await this[$kernel].mutate(this, 'baseColorFactor', color);
        this[$baseColorFactor] = Object.freeze(color) as RGBA;
      } catch (error) {
        // Ignored...
      }
    }
  }

  return PBRMetallicRoughness;
}