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

import {Constructor, Mesh as MeshInterface, Primitive, ThreeDOMElement} from '../api.js';
import {SerializedMesh} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export function defineMesh(ThreeDOMElement: Constructor<ThreeDOMElement>):
    Constructor<MeshInterface> {
  const $kernel = Symbol('kernel');
  const $primitives = Symbol('primitives');
  const $name = Symbol('name');

  class Mesh extends ThreeDOMElement implements MeshInterface {
    protected[$primitives]: Readonly<Array<Primitive>>;
    protected[$kernel]: ModelKernel;
    protected[$name]: string;

    constructor(kernel: ModelKernel, serialized: SerializedMesh) {
      super(kernel, serialized);

      this[$kernel] = kernel;

      const primitives = [];

      if (serialized.primitives) {
        for (let i = 0; i < serialized.primitives.length; ++i) {
          primitives.push(
              this[$kernel].deserialize('primitive', serialized.primitives[i]));
        }
      }

      if (serialized.name != null) {
        this[$name] = serialized.name;
      }

      this[$primitives] = Object.freeze(primitives);
    }

    get name() {
      return this[$name];
    }

    get primitives() {
      return this[$primitives];
    }
  }

  return Mesh;
}
