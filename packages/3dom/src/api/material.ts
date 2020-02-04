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

import {ConstructedWithArguments, Constructor, Material as MaterialInterface, PBRMetallicRoughness, ThreeDOMElement} from '../api.js';
import {SerializedMaterial} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export type MaterialConstructor = Constructor<MaterialInterface>&
    ConstructedWithArguments<[ModelKernel, SerializedMaterial]>;
/**
 * A constructor factory for a Material class. The Material is defined based on
 * a provided implementation for all specified 3DOM scene graph element types.
 *
 * The sole reason for using this factory pattern is to enable sound type
 * checking while also providing for the ability to stringify the factory so
 * that it can be part of a runtime-generated Worker script.
 *
 * @see ../api.ts
 */
export function defineMaterial(ThreeDOMElement: Constructor<ThreeDOMElement>):
    MaterialConstructor {
  const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
  const $kernel = Symbol('kernel');
  const $name = Symbol('name');

  /**
   * A Material represents a live material in the backing scene graph. Its
   * primary purpose is to give the user write access to discrete properties
   * (for example, the base color factor) of the backing material.
   */
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

    /**
     * The PBR properties that are assigned to this material, if any.
     */
    get pbrMetallicRoughness() {
      return this[$pbrMetallicRoughness];
    }
  }

  return Material;
}