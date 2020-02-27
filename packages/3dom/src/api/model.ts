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

import {ConstructedWithArguments, Constructor, Material, Model as ModelInterface, ThreeDOMElement} from '../api.js';
import {SerializedModel} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export type ModelConstructor = Constructor<ModelInterface>&
    ConstructedWithArguments<[ModelKernel, SerializedModel]>;

/**
 * A constructor factory for a Model class. The Model is defined based on a
 * provided implementation for all specified 3DOM scene graph element types.
 *
 * The sole reason for using this factory pattern is to enable sound type
 * checking while also providing for the ability to stringify the factory so
 * that it can be part of a runtime-generated Worker script.
 *
 * @see ../api.ts
 */
export function defineModel(ThreeDOMElement: Constructor<ThreeDOMElement>):
    ModelConstructor {
  const $materials = Symbol('material');
  const $kernel = Symbol('kernel');

  /**
   * A Model is the root element of a 3DOM scene graph. It is considered the
   * element of provenance for all other elements that participate in the same
   * graph. All other elements in the graph can be accessed in from the Model
   * in some fashion.
   */
  class Model extends ThreeDOMElement implements ModelInterface {
    protected[$kernel]: ModelKernel;
    protected[$materials]: Readonly<Array<Material>> = Object.freeze([]);

    constructor(kernel: ModelKernel, serialized: SerializedModel) {
      super(kernel);
      this[$kernel] = kernel;

      for (const material of serialized.materials) {
        this[$kernel].deserialize('material', material);
      }
    }

    /**
     * The set of Material elements in the graph, in sparse traversal order.
     * Note that this set will include any Materials that are not part of the
     * currently activate scene.
     *
     * TODO(#1002): This value needs to be sensitive to scene graph order
     */
    get materials() {
      return this[$kernel].getElementsByType('material');
    }

    /**
     * A Model has no owner model; it owns itself.
     */
    get ownerModel() {
      return undefined;
    }
  }

  return Model;
}
