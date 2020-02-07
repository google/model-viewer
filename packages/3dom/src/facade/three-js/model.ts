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

import {Material as ThreeMaterial} from 'three';
import {Mesh as ThreeMesh} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {SerializedModel} from '../../protocol.js';

import {Material} from './material.js';
import {ModelGraft} from './model-graft.js';
import {ThreeDOMElement} from './three-dom-element.js';


const $modelUri = Symbol('modelUri');
const $gltf = Symbol('gltf');
const $materials = Symbol('materials');

/**
 * A Model facades the top-level GLTF object returned by Three.js' GLTFLoader.
 * Currently, the model only bothers itself with the materials in the Three.js
 * scene graph.
 */
export class Model extends ThreeDOMElement {
  protected[$modelUri] = '';
  protected[$materials]: Array<Material> = [];
  protected[$gltf]: GLTF;

  constructor(graft: ModelGraft, modelUri: string, gltf: GLTF) {
    super(graft, gltf);

    this[$modelUri] = modelUri;
    this[$gltf] = gltf;

    const visitedMaterials = new Set();

    gltf.scene.traverse((object3D) => {
      const maybeMesh = object3D as ThreeMesh;
      let meshMaterials: Array<ThreeMaterial> = [];

      if (maybeMesh.isMesh && maybeMesh.material != null) {
        meshMaterials = Array.isArray(maybeMesh.material) ?
            maybeMesh.material :
            [maybeMesh.material];
      }

      for (const material of meshMaterials) {
        if (visitedMaterials.has(material)) {
          continue;
        }

        this[$materials].push(new Material(graft, material));
        visitedMaterials.add(material);
      }
    });
  }

  /**
   * A flat list of all unique materials found in this scene graph. Materials
   * are listed in the order they appear during pre-order, depth-first traveral
   * of the scene graph.
   *
   * TODO(#1003): How do we handle non-active scenes?
   */
  get materials() {
    return this[$materials];
  }

  toJSON(): SerializedModel {
    const serialized: Partial<SerializedModel> = super.toJSON();

    serialized.modelUri = this[$modelUri];
    serialized.materials =
        this[$materials].map((material) => material.toJSON());

    return serialized as SerializedModel;
  }
}
