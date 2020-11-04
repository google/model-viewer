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

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';
import {Model} from './model.js';

const $model = Symbol('model');
const $correlatedSceneGraph = Symbol('correlatedSceneGraph');

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
 */

export class ModelGraft {
  private[$model]: Model;
  private[$correlatedSceneGraph]: CorrelatedSceneGraph;

  constructor(correlatedSceneGraph: CorrelatedSceneGraph) {
    this[$correlatedSceneGraph] = correlatedSceneGraph;
    this[$model] = new Model(this, correlatedSceneGraph);
  }

  get correlatedSceneGraph(): CorrelatedSceneGraph {
    return this[$correlatedSceneGraph];
  }

  get model(): Model {
    return this[$model];
  }
}
