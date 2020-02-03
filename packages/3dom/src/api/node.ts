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

import {Constructor, Mesh, Node as NodeInterface, ThreeDOMElement} from '../api.js';
import {SerializedNode} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export function defineNode(ThreeDOMElement: Constructor<ThreeDOMElement>):
    Constructor<NodeInterface> {
  const $mesh = Symbol('mesh');
  const $children = Symbol('children');
  const $name = Symbol('name');
  const $kernel = Symbol('kernel');

  class Node extends ThreeDOMElement implements NodeInterface {
    protected[$mesh]?: Mesh;
    protected[$children]: Readonly<Array<NodeInterface>>;
    protected[$name]?: string;
    protected[$kernel]: ModelKernel;

    constructor(kernel: ModelKernel, serialized: SerializedNode) {
      super(kernel, serialized);

      this[$kernel] = kernel;

      if (serialized.mesh != null) {
        this[$mesh] = this[$kernel].deserialize('mesh', serialized.mesh);
      }

      if (serialized.name != null) {
        this[$name] = serialized.name;
      }

      const children: Array<NodeInterface> = [];

      if (serialized.children) {
        for (const serializedNode of serialized.children) {
          children.push(kernel.deserialize('node', serializedNode));
        }
      }

      this[$children] = Object.freeze(children);
    }

    get mesh() {
      return this[$mesh];
    }

    get children() {
      return this[$children];
    }

    get name() {
      return this[$name];
    }
  }

  return Node;
}
