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

import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader';

import {SerializedModelGraph} from '../protocol.js';

import {GraftScene} from './model-graft/graft-scene.js';
import {SerializableThreeDOMElement} from './model-graft/serializable-three-dom-element.js';

const $scene = Symbol('scene');
const $gltf = Symbol('gltf');
const $modelUri = Symbol('modelUri');
const $nodesByInternalId = Symbol('nodesByInternalId');

/**
 * ModelGraft
 *
 * This is a facade for a model as represented by the output for Three.js'
 * GLTFLoader. The input model is a GLTF-like object whose keys refer to
 * Three.js-specific constructs (e.g., gltf.scene is a THREE.Scene). When
 * created, the ModelGraft can be traversed and manipulated to mutate the
 * Three.js scene graph indirectly. The benefit of this is that mutations to the
 * Three.js scene can be performed in a Three.js-agnostic fashion that is
 * potentially portable to alternative rendering backends.
 *
 * The scene graph representation produced by the ModelGraft is designed to
 * match the structures described in the glTF 2.0 spec as closely as possible.
 * Where there are deviations, it is usually for the purpose of making
 * synchronization easier, or else for ergonomics. For example, in glTF 2.0, the
 * graph is a series of flat arrays where nodes cross-reference each other by
 * index to represent hierarchy, but in a ModelGraft nodes have array members
 * containing refrences to their hierarchical children.
 *
 * An important goal of a ModelGraft is to enable a scene in one JavaScript
 * context to be manipulated by script in a remote context, such as a distant
 * worker thread or even a different process. So, every node in the graph
 * is able to be serialized, and the serialized form includes an ID that is
 * locally unique to the ModelGraft instance that the node came from.
 */
export class ModelGraft extends SerializableThreeDOMElement {
  protected[$modelUri]: string;
  protected[$scene]: GraftScene;
  protected[$gltf]: GLTF;

  readonly[$nodesByInternalId] = new Map<number, SerializableThreeDOMElement>();

  constructor(modelUri: string, gltf: GLTF) {
    super(null, gltf);

    this[$modelUri] = modelUri;
    this[$scene] = new GraftScene(this, gltf.scene);
    this[$gltf] = gltf;
  }

  get modelUri() {
    return this[$modelUri];
  }

  get scene() {
    return this[$scene];
  }

  getNodeByInternalId(id: number): SerializableThreeDOMElement|null {
    if (!this[$nodesByInternalId].has(id)) {
      return null;
    }

    return this[$nodesByInternalId].get(id)!;
  }

  adopt(node: SerializableThreeDOMElement) {
    if (node.ownerModel !== this) {
      return;
    }

    this[$nodesByInternalId].set(node.internalID, node);
  }

  toJSON(): SerializedModelGraph {
    const serialized: Partial<SerializedModelGraph> = super.toJSON();

    serialized.modelUri = this[$modelUri];
    serialized.scene = this.scene.toJSON();

    return serialized as SerializedModelGraph;
  }
}
