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

import {Constructor, Node, Scene as SceneInterface, ThreeDOMElement} from '../api.js';
import {SerializedScene} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export function defineScene(ThreeDOMElement: Constructor<ThreeDOMElement>):
    Constructor<SceneInterface> {
  const $nodes = Symbol('nodes');
  const $kernel = Symbol('kernel');

  class Scene extends ThreeDOMElement implements SceneInterface {
    protected[$nodes]: Readonly<Array<Node>>;
    protected[$kernel]: ModelKernel;

    constructor(kernel: ModelKernel, serialized: SerializedScene) {
      super(kernel);
      this[$kernel] = kernel;

      const serializedNodes = serialized.nodes;
      const nodes = [];

      if (serializedNodes != null) {
        for (let i = 0; i < serializedNodes.length; ++i) {
          nodes.push(this[$kernel].deserialize('node', serializedNodes[i]))
        }
      }

      this[$nodes] = Object.freeze(nodes);
    }

    get nodes() {
      return this[$nodes];
    }
  }

  return Scene;
}
