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
import {Color} from 'three/src/math/Color.js';

import {createFakeThreeGLTF} from '../../test-helpers.js';

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';
import {ModelGraft} from './model-graft.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';

suite('facade/three-js/pbr-metallic-roughness', () => {
  suite('PBRMetallicRoughness', () => {
    test('expresses Three.js material color as base color factor', async () => {
      const graft = new ModelGraft(
          '', await CorrelatedSceneGraph.from(createFakeThreeGLTF()));
      const threeMaterial = new MeshStandardMaterial();

      threeMaterial.color = new Color('rgb(255, 127, 0)');

      const pbrMetallicRoughness = new PBRMetallicRoughness(
          graft, {baseColorFactor: [1, 0.5, 0, 1]}, [threeMaterial]);

      expect(pbrMetallicRoughness.baseColorFactor)
          .to.be.deep.equal([1, 127 / 255, 0, 1]);
    });
  });
});
