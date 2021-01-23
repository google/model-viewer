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

import {CorrelatedSceneGraph} from '../../three-components/gltf-instance/correlated-scene-graph.js';

import {Model as ModelInterface} from './api.js';
import {Material} from './material.js';

const $materials = Symbol('materials');

/**
 * A Model facades the top-level GLTF object returned by Three.js' GLTFLoader.
 * Currently, the model only bothers itself with the materials in the Three.js
 * scene graph.
 */
export class Model implements ModelInterface {
  private[$materials]: Array<Material> = [];

  constructor(
      correlatedSceneGraph: CorrelatedSceneGraph,
      onUpdate: () => void = () => {}) {
    const {gltf, gltfElementMap} = correlatedSceneGraph;

    gltf.materials!.forEach(material => {
      this[$materials].push(new Material(
          onUpdate,
          gltf,
          material,
          gltfElementMap.get(material) as Set<MeshStandardMaterial>));
    });
  }

  /**
   * Materials are listed in the order of the GLTF materials array, plus a
   * default material at the end if one is used.
   *
   * TODO(#1003): How do we handle non-active scenes?
   */
  get materials(): Array<Material> {
    return this[$materials];
  }
}
