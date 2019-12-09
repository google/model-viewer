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

import {Scene} from 'three';

import {SerializedNode, SerializedScene} from '../../protocol.js';
import {ModelGraft} from '../model-graft.js';

import {GraftNode} from './graft-node.js';
import {SerializableThreeDOMElement} from './serializable-three-dom-element.js';

const $nodes = Symbol('nodes');

/**
 * GraftScene
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scene
 */
export class GraftScene extends SerializableThreeDOMElement {
  protected[$nodes]: Readonly<Array<GraftNode>>;

  constructor(ownerModel: ModelGraft, scene: Scene) {
    super(ownerModel, scene);

    const nodes: Array<GraftNode> = [];

    for (const child of scene.children) {
      nodes.push(new GraftNode(ownerModel, child));
    }

    this[$nodes] = Object.freeze(nodes);
  }

  get nodes() {
    return this[$nodes];
  }

  toJSON(): SerializedScene {
    const serialized: SerializedScene = super.toJSON();

    if (this.nodes.length) {
      serialized.nodes =
          this.nodes.map(node => node.toJSON()) as Array<SerializedNode>;
    }

    return serialized;
  }
}
