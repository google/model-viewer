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

import {MeshStandardMaterial} from 'three';

import {Model as ModelInterface} from './api.js';
import {CorrelatedSceneGraph} from './correlated-scene-graph.js';
import {Material} from './material.js';
import {ModelGraft} from './model-graft.js';
import {ThreeDOMElement} from './three-dom-element.js';
import {GLTFTreeVisitor} from './utilities.js';


const $modelUri = Symbol('modelUri');
const $materials = Symbol('materials');

/**
 * A Model facades the top-level GLTF object returned by Three.js' GLTFLoader.
 * Currently, the model only bothers itself with the materials in the Three.js
 * scene graph.
 */
export class Model extends ThreeDOMElement implements ModelInterface {
  private[$modelUri] = '';
  private[$materials]: Array<Material> = [];

  constructor(
      graft: ModelGraft, modelUri: string,
      correlatedSceneGraph: CorrelatedSceneGraph) {
    super(graft, correlatedSceneGraph.gltf);

    this[$modelUri] = modelUri;

    const visitor = new GLTFTreeVisitor({
      material: (material) => {
        this[$materials].push(new Material(
            graft,
            material,
            correlatedSceneGraph.gltfElementMap.get(material) as
                Set<MeshStandardMaterial>));
      }
    });

    visitor.visit(correlatedSceneGraph.gltf, {sparse: true});
  }

  /**
   * A flat list of all unique materials found in this scene graph. Materials
   * are listed in the order they appear during pre-order, depth-first traveral
   * of the scene graph.
   *
   * TODO(#1003): How do we handle non-active scenes?
   * TODO(#1002): Desctibe and enforce traversal order
   */
  get materials(): Array<Material> {
    return this[$materials];
  }
}
