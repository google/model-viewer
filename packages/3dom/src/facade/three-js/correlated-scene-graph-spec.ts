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

import {Mesh, MeshStandardMaterial} from 'three';
import {GLTFReference} from 'three/examples/jsm/loaders/GLTFLoader';

import {Material} from '../../gltf-2.0.js';
import {assetPath, loadThreeGLTF} from '../../test-helpers.js';

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';

const HORSE_GLB_PATH = assetPath('models/Horse.glb');

suite('facade/three-js/correlated-scene-graph', () => {
  suite('CorrelatedSceneGraph', () => {
    test('maps Three.js materials to glTF elements', async () => {
      const threeGLTF = await loadThreeGLTF(HORSE_GLB_PATH);
      const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);

      const threeMaterial =
          ((threeGLTF.scene.children[0] as Mesh).material as
           MeshStandardMaterial);
      const gltfMaterial = threeGLTF.parser.json.materials[0]! as Material;
      const gltfReference =
          correlatedSceneGraph.threeObjectMap.get(threeMaterial);

      expect(gltfReference).to.be.ok;

      const {type, index} = gltfReference as GLTFReference;

      const referencedGltfMaterial = threeGLTF.parser.json[type][index];

      expect(referencedGltfMaterial).to.be.equal(gltfMaterial);
    });

    // test('maps Three.js textures to glTF elements')
  });
});
