
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
import {Box3, Material, Scene, Vector3} from 'three';
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {loadWithLoader} from '../../three-components/CachingGLTFLoader.js';
import {cloneGltf, reduceVertices} from '../../three-components/ModelUtils.js';
import {assetPath} from '../helpers.js';

const expect = chai.expect;

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');



const collectMaterials = (scene: Scene): Array<Material> => {
  const materials: Array<Material> = [];

  scene.traverse((node: any) => {
    if (Array.isArray(node.material)) {
      materials.push(...node.material);
    } else if (node.material != null) {
      materials.push(node.material);
    }
  });

  return materials;
};

suite('ModelUtils', () => {
  suite('cloneGltf', () => {
    let loader: any;
    let gltf: GLTF;

    setup(async () => {
      loader = new GLTFLoader();
      gltf = await loadWithLoader(ASTRONAUT_GLB_PATH, loader);
    });

    test('makes unique copies of all materials', () => {
      const clonedGltf = cloneGltf(gltf);

      const sourceMaterials = collectMaterials(gltf.scene!);
      const clonedMaterials = collectMaterials(clonedGltf.scene!);

      expect(sourceMaterials.length).to.be.greaterThan(0);
      expect(sourceMaterials.length).to.be.equal(clonedMaterials.length);

      sourceMaterials.forEach((material, index) => {
        expect(clonedMaterials[index]).to.not.be.eql(material);
      });
    });

    test('reduceVertices matches boundingBox', () => {
      const maxX = (value: number, vertex: Vector3): number => {
        return Math.max(value, vertex.x);
      };
      const rightSide = reduceVertices(gltf.scene!, maxX);

      const boundingBox = new Box3();
      boundingBox.setFromObject(gltf.scene!);
      expect(rightSide).to.be.equal(boundingBox.max.x);
    });
  });
});
