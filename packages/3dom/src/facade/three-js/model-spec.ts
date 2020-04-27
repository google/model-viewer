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

import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial.js';
import {Mesh} from 'three/src/objects/Mesh.js';

import {assetPath, loadThreeGLTF} from '../../test-helpers.js';

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';
import {ModelGraft} from './model-graft.js';

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');

suite('facade/three-js/model', () => {
  suite('Model', () => {
    test('exposes a list of materials in the scene', async () => {
      const threeGLTF = await loadThreeGLTF(ASTRONAUT_GLB_PATH);
      const materials: MeshStandardMaterial[] = [];

      threeGLTF.scene.traverse((object) => {
        if ((object as Mesh).isMesh) {
          const material = (object as Mesh).material;
          if (Array.isArray(material)) {
            materials.push(...(material as MeshStandardMaterial[]));
          } else {
            materials.push(material as MeshStandardMaterial);
          }
        }
      });

      const graft = new ModelGraft(
          ASTRONAUT_GLB_PATH, await CorrelatedSceneGraph.from(threeGLTF));

      const model = graft.model;

      const collectedMaterials = model.materials.reduce<MeshStandardMaterial[]>(
          (materials, material) => {
            materials.push(
                ...(material.correlatedObject as MeshStandardMaterial[]));
            return materials;
          },
          []);

      expect(collectedMaterials).to.be.deep.equal(materials);
    });
  });
});
