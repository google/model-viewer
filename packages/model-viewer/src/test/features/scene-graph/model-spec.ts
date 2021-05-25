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

import {Model} from '../../../features/scene-graph/model.js';
import {$correlatedObjects} from '../../../features/scene-graph/three-dom-element.js';
import {CorrelatedSceneGraph} from '../../../three-components/gltf-instance/correlated-scene-graph.js';
import {assetPath, loadThreeGLTF} from '../../helpers.js';

const expect = chai.expect;

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');
const KHRONOS_TRIANGLE_GLB_PATH =
    assetPath('models/glTF-Sample-Models/2.0/Triangle/glTF/Triangle.gltf');

suite('scene-graph/model', () => {
  suite('Model', () => {
    test('creates a "default" material, when none is specified', async () => {
      const threeGLTF = await loadThreeGLTF(KHRONOS_TRIANGLE_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));

      expect(model.materials.length).to.be.eq(1);
      expect(model.materials[0].name).to.be.eq('Default');
    });

    test.skip('exposes a list of materials in the scene', async () => {
      // TODO: This test is skipped because [$correlatedObjects] can contain
      // unused materials, because it can contain a base material and the
      // derived material (from assignFinalMaterial(), if for instance
      // vertexTangents are used) even if only the derived material is assigned
      // to a mesh. These extras make the test fail. We may want to remove these
      // unused materials from [$correlatedObjects] at which point this test
      // will pass, but it's not hurting anything.
      const threeGLTF = await loadThreeGLTF(ASTRONAUT_GLB_PATH);
      const materials: Set<MeshStandardMaterial> = new Set();

      threeGLTF.scene.traverse((object) => {
        if ((object as Mesh).isMesh) {
          const material = (object as Mesh).material;
          if (Array.isArray(material)) {
            material.forEach(
                (material) => materials.add(material as MeshStandardMaterial));
          } else {
            materials.add(material as MeshStandardMaterial);
          }
        }
      });

      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));

      const collectedMaterials = new Set<MeshStandardMaterial>();

      model.materials.forEach((material) => {
        for (const threeMaterial of material[$correlatedObjects] as
             Set<MeshStandardMaterial>) {
          collectedMaterials.add(threeMaterial);
          expect(materials.has(threeMaterial)).to.be.true;
        }
      });

      expect(collectedMaterials.size).to.be.equal(materials.size);
    });
  });
});
