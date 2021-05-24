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

import {Group, Mesh, MeshStandardMaterial, Object3D} from 'three';
import {GLTF, GLTFReference} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {SkeletonUtils} from 'three/examples/jsm/utils/SkeletonUtils.js';

import {CorrelatedSceneGraph} from '../../../three-components/gltf-instance/correlated-scene-graph.js';
import {Material, PBRMetallicRoughness, Texture, TextureInfo} from '../../../three-components/gltf-instance/gltf-2.0.js';
import {assetPath, loadThreeGLTF} from '../../helpers.js';

const expect = chai.expect;

const HORSE_GLB_PATH = assetPath('models/Horse.glb');
const ORDER_TEST_GLB_PATH = assetPath('models/order-test/order-test.glb');
const KHRONOS_TRIANGLE_GLB_PATH =
    assetPath('models/glTF-Sample-Models/2.0/Triangle/glTF/Triangle.gltf');

const getObject3DByName =
    <T extends Object3D>(root: Object3D, name: string): T|null => {
      const objects = [root];
      while (objects.length) {
        const next = objects.shift()!;
        if (next.name === name) {
          return next as T;
        }
        objects.push(...next.children);
      }
      return null;
    };

suite('correlated-scene-graph', () => {
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

    test('maps Three.js textures to glTF elements', async () => {
      const threeGLTF = await loadThreeGLTF(ORDER_TEST_GLB_PATH);
      const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);

      const threeMaterial =
          getObject3DByName<Mesh>(threeGLTF.scene, 'Node0')!.material as
          MeshStandardMaterial;
      const threeTexture = threeMaterial.map!;

      const gltfMaterial = threeGLTF.parser.json.materials[2]! as Material;
      const textureIndex =
          ((gltfMaterial.pbrMetallicRoughness as PBRMetallicRoughness)
               .baseColorTexture as TextureInfo)
              .index;

      const gltfTexture =
          threeGLTF.parser.json.textures[textureIndex] as Texture;
      const gltfReference =
          correlatedSceneGraph.threeObjectMap.get(threeTexture);

      expect(gltfReference).to.be.ok;

      const {type, index} = gltfReference as GLTFReference;

      const referencedGltfTexture = threeGLTF.parser.json[type][index];

      expect(referencedGltfTexture).to.be.equal(gltfTexture);
    });

    suite('when correlating a cloned glTF', () => {
      test('creates a GLTFLoader "default" material', async () => {
        const threeGLTF = await loadThreeGLTF(KHRONOS_TRIANGLE_GLB_PATH);
        const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);

        const scene = SkeletonUtils.clone(threeGLTF.scene) as Group;
        const scenes: Group[] = [scene];

        const cloneThreeGLTF: GLTF = {...threeGLTF, scene, scenes};

        const cloneCorrelatedSceneGraph =
            CorrelatedSceneGraph.from(cloneThreeGLTF, correlatedSceneGraph);

        let name;
        cloneCorrelatedSceneGraph.threeObjectMap.forEach(
            (reference, threeObject) => {
              if ((threeObject as MeshStandardMaterial).isMaterial) {
                name =
                    cloneCorrelatedSceneGraph.gltf.materials![reference.index]
                        .name;
              }
            });
        expect(name).to.be.eq('Default');
      });
    });
  });
});
