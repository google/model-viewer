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

import {expect} from 'chai';
import {BufferGeometry, DoubleSide, Mesh, MeshStandardMaterial} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {ModelViewerGLTFInstance} from '../../../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {PreparedGLTF} from '../../../three-components/GLTFInstance.js';
import {createFakeThreeGLTF} from '../../helpers.js';

suite('ModelViewerGLTFInstance', () => {
  let rawGLTF: GLTF;
  let preparedGLTF: PreparedGLTF;

  setup(async () => {
    rawGLTF = createFakeThreeGLTF();

    const materialOne = new MeshStandardMaterial();
    const materialTwo = new MeshStandardMaterial();

    materialTwo.transparent = true;
    materialTwo.side = DoubleSide;

    const meshOne = new Mesh(new BufferGeometry(), materialOne);
    const meshTwo = new Mesh(new BufferGeometry(), materialOne);
    const meshThree = new Mesh(new BufferGeometry(), materialTwo);

    rawGLTF.scene.add(meshOne, meshTwo, meshThree);

    preparedGLTF = await ModelViewerGLTFInstance.prepare(rawGLTF);
  });

  suite('with a prepared GLTF', () => {
    suite('when cloned', () => {
      let cloneInstance: ModelViewerGLTFInstance;
      let gltfInstance: ModelViewerGLTFInstance;

      setup(async () => {
        gltfInstance = new ModelViewerGLTFInstance(preparedGLTF);
        cloneInstance = await gltfInstance.clone<ModelViewerGLTFInstance>();
      });

      teardown(() => {
        gltfInstance.dispose();
        cloneInstance.dispose();
      });

      test('clones materials in a mesh', () => {
        const [originalMeshOne, originalMeshTwo, originalMeshThree] =
            gltfInstance.scene.children as [Mesh, Mesh, Mesh];
        const [meshOne, meshTwo, meshThree] =
            cloneInstance.scene.children as [Mesh, Mesh, Mesh];

        expect(originalMeshOne.material).to.not.be.equal(meshOne.material);
        expect(originalMeshTwo.material).to.not.be.equal(meshTwo.material);
        expect(originalMeshThree.material).to.not.be.equal(meshThree.material);
      });

      test('only clones a discrete material once', () => {
        const [meshOne, meshTwo, meshThree] =
            cloneInstance.scene.children as [Mesh, Mesh, Mesh];

        expect(meshOne.material).to.be.equal(meshTwo.material);
        expect(meshOne.material).to.not.be.equal(meshThree.material);
      });
    });
  });

  suite('preparing the GLTF', () => {
    test('sets meshes to cast shadows', () => {
      (preparedGLTF.scene.children as [Mesh, Mesh, Mesh])
          .forEach(mesh => expect(mesh.castShadow).to.be.true);
    });

    test('disables frustum culling on meshes', () => {
      (preparedGLTF.scene.children as [Mesh, Mesh, Mesh])
          .forEach(mesh => expect(mesh.frustumCulled).to.be.false);
    });
  });
});
