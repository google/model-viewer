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
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {$prepared, GLTFInstance, PreparedGLTF} from '../../three-components/GLTFInstance.js';
import {createFakeThreeGLTF} from '../helpers.js';

suite('GLTFInstance', () => {
  let rawGLTF: GLTF;
  let preparedGLTF: PreparedGLTF;

  setup(async () => {
    rawGLTF = createFakeThreeGLTF();
    preparedGLTF = await GLTFInstance.prepare(rawGLTF);
  });

  suite('with a prepared GLTF', () => {
    test('exposes the same scene as the GLTF', () => {
      const gltfInstance = new GLTFInstance(preparedGLTF);
      expect(gltfInstance.scene).to.be.equal(preparedGLTF.scene);
    });

    suite('when cloned', () => {
      test('creates a unique scene', async () => {
        const gltfInstance = new GLTFInstance(preparedGLTF);
        const cloneInstance = await gltfInstance.clone();

        expect(cloneInstance.scene).to.be.ok;
        expect(cloneInstance.scene).to.not.be.equal(gltfInstance.scene);
      });
    });
  });

  suite('preparing the GLTF', () => {
    test('creates a prepared GLTF', () => {
      expect(preparedGLTF).to.not.be.equal(rawGLTF);
      expect(preparedGLTF[$prepared]).to.be.equal(true);
    });
  });
});
