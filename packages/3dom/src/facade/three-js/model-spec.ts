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

import {BufferGeometry} from 'three/src/core/BufferGeometry.js';
import {Object3D} from 'three/src/core/Object3D.js';
import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial.js';
import {Mesh} from 'three/src/objects/Mesh.js';

import {createFakeGLTF} from '../../test-helpers.js';

import {ModelGraft} from './model-graft.js';

suite('facade/three-js/model', () => {
  suite('Model', () => {
    test('exposes a list of materials in the scene', () => {
      const materials =
          [new MeshStandardMaterial(), new MeshStandardMaterial()];
      const gltf = createFakeGLTF();
      const root = new Object3D();
      const childOne = new Object3D();
      const childTwo = new Mesh(new BufferGeometry(), materials[1]);
      const grandChild = new Mesh(new BufferGeometry(), materials[0]);

      gltf.scene.add(root);
      root.add(childOne, childTwo);
      childOne.add(grandChild);

      const graft = new ModelGraft('', gltf);
      const model = graft.model;

      const collectedMaterials = model.materials.map((material) => {
        return material.relatedObject;
      });

      expect(collectedMaterials).to.be.deep.equal(materials);
    });
  });
});