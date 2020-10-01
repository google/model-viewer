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


import {ModelGraft as ModelGraftInterface} from '../api.js';

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';
import {Model} from './model.js';
import {ThreeDOMElement} from './three-dom-element.js';

const $model = Symbol('model');
const $correlatedSceneGraph = Symbol('correlatedSceneGraph');
const $elementsByInternalId = Symbol('elementsByInternalId');
const $eventDelegate = Symbol('eventDelegate');

/**
 * ModelGraft
 *
 * This is a coordination primitive between a scene graph as represented by the
 * output for Three.js' GLTFLoader and a counterpart 3DOM facade. Since this is
 * the Three.js-specific implementation of the facade, the input is a GLTF-like
 * object whose keys refer to Three.js-specific constructs (e.g., gltf.scene is
 * a THREE.Scene).
 *
 * When created, the ModelGraft produces a Model that can be traversed and
 * manipulated to mutate the Three.js scene graph synchronously (but
 * indirectly). The benefit of this is that mutations to the Three.js scene can
 * be performed in a Three.js-agnostic fashion that is potentially portable to
 * alternative rendering backends.
 *
 * The scene graph representation produced by the ModelGraft is designed to
 * match the structures described in the glTF 2.0 spec as closely as possible.
 * Where there are deviations, it is usually for the purpose of making
 * synchronization easier, or else for ergonomics. For example, in glTF 2.0, the
 * graph is a series of flat arrays where nodes cross-reference each other by
 * index to represent hierarchy, but in a Model nodes have array members
 * containing refrences to their hierarchical children.
 *
 * An important goal of ModelGraft is to enable a scene in one JavaScript
 * context to be manipulated by script in a remote context, such as a distant
 * worker thread or even a different process. So, every node in the graph
 * is able to be serialized, and the serialized form includes an ID that is
 * locally unique to the ModelGraft instance that the node came from so that
 * the remote context can refer back to it. A ModelGraft can be thought of as
 * the host execution context counterpart to the ModelKernel in the scene graph
 * execution context.
 */

export class ModelGraft implements EventTarget, ModelGraftInterface {
  // NOTE(cdata): This eventDelegate hack is a quick trick to let us get the
  // EventTarget interface without implementing or requiring a full polyfill. We
  // should remove this once EventTarget is inheritable everywhere.
  protected[$eventDelegate]: DocumentFragment =
      document.createDocumentFragment();

  // NOTE(cdata): We declare each of these methods independently here so that we
  // can inherit the correct types from EventTarget's interface. Maybe there is
  // a better way to do this dynamically so that we don't repeat ourselves?
  addEventListener: typeof EventTarget.prototype.addEventListener = (...args) =>
      this[$eventDelegate].addEventListener(...args);
  removeEventListener: typeof EventTarget.prototype.removeEventListener =
      (...args) => this[$eventDelegate].removeEventListener(...args);
  dispatchEvent: typeof EventTarget.prototype.dispatchEvent = (...args) =>
      this[$eventDelegate].dispatchEvent(...args);

  private[$model]: Model;
  private[$correlatedSceneGraph]: CorrelatedSceneGraph;

  private[$elementsByInternalId] = new Map<number, ThreeDOMElement>();

  constructor(modelUri: string, correlatedSceneGraph: CorrelatedSceneGraph) {
    this[$correlatedSceneGraph] = correlatedSceneGraph;
    this[$model] = new Model(this, modelUri, correlatedSceneGraph);
  }

  get correlatedSceneGraph(): CorrelatedSceneGraph {
    return this[$correlatedSceneGraph];
  }

  get model(): Model {
    return this[$model];
  }

  getElementByInternalId(id: number): ThreeDOMElement|null {
    const element = this[$elementsByInternalId].get(id);

    if (element == null) {
      return null;
    }

    return element;
  }

  adopt(element: ThreeDOMElement): void {
    this[$elementsByInternalId].set(element.internalID, element);
  }

  async mutate(id: number, property: string, value: unknown): Promise<void> {
    const element = this.getElementByInternalId(id);

    await element!.mutate(property, value);

    this.dispatchEvent(
        new CustomEvent('mutation', {detail: {element: element}}));
  }
}
