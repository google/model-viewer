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

import {Constructor, Material as MaterialInterface, PBRMetallicRoughness, ThreeDOMElement} from '../api.js';
import {SerializedMaterial} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export function defineMaterial(ThreeDOMElement: Constructor<ThreeDOMElement>):
    Constructor<MaterialInterface> {
  const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
  const $kernel = Symbol('kernel');
  const $name = Symbol('name');

  class Material extends ThreeDOMElement implements MaterialInterface {
    protected[$pbrMetallicRoughness]: PBRMetallicRoughness;
    protected[$kernel]: ModelKernel;
    protected[$name]: string;

    constructor(kernel: ModelKernel, serialized: SerializedMaterial) {
      super(kernel, serialized);

      this[$kernel] = kernel;

      if (serialized.name != null) {
        this[$name] = serialized.name;
      }

      this[$pbrMetallicRoughness] = kernel.deserialize(
          'pbr-metallic-roughness', serialized.pbrMetallicRoughness);
    }

    get pbrMetallicRoughness() {
      return this[$pbrMetallicRoughness];
    }
  }

  return Material;
}
