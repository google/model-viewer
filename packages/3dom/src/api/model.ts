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

import {Constructor, Material, Model as ModelInterface, Node, Scene, ThreeDOMElement} from '../api.js';
import {SerializedModelGraph} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export function defineModel(ThreeDOMElement: Constructor<ThreeDOMElement>):
    Constructor<ModelInterface> {
  const $scene = Symbol('scene');
  const $materials = Symbol('material');
  const $nodes = Symbol('nodes');
  const $kernel = Symbol('kernel');

  class Model extends ThreeDOMElement implements ModelInterface {
    protected[$kernel]: ModelKernel;
    protected[$scene]: Scene;
    protected[$materials]: Readonly<Array<Material>> = Object.freeze([]);
    protected[$nodes]: Readonly<Array<Node>> = Object.freeze([]);

    constructor(kernel: ModelKernel, serialized: SerializedModelGraph) {
      super(kernel);
      this[$kernel] = kernel;
      this[$scene] = kernel.deserialize('scene', serialized.scene);
    }

    get scene() {
      return this[$scene];
    }

    get materials() {
      return this[$kernel].getElementsByType('material');
    }

    get nodes() {
      return this[$kernel].getElementsByType('node');
    }
  }

  return Model;
}
