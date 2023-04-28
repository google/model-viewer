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

import {expect} from '@esm-bundle/chai';

import {GLTF} from '../../../three-components/gltf-instance/gltf-2.0.js';
import {GLTFTreeVisitor} from '../../../three-components/gltf-instance/utilities.js';
import {assetPath, loadThreeGLTF} from '../../helpers.js';

const ORDER_TEST_GLB_PATH = assetPath('models/order-test/order-test.glb');

suite('utilities', () => {
  suite('GLTFTreeVisitor', () => {
    let gltf: GLTF;

    setup(async () => {
      const threeGLTF = await loadThreeGLTF(ORDER_TEST_GLB_PATH);
      gltf = threeGLTF.parser.json;
    });

    test('visits materials in tree order', () => {
      const materials: string[] = [];
      const visitor = new GLTFTreeVisitor(
          {material: (material) => materials.push(material.name!)});

      visitor.visit(gltf);

      expect(materials).to.be.deep.equal([
        'Material0',
        'Material1',
        'Material2',
        'Material2',
        'Material1',
        'Material0',
        'Material2',
      ]);
    });

    suite('sparse traversal', () => {
      test('visits materials in tree order', () => {
        const materials: string[] = [];
        const visitor = new GLTFTreeVisitor(
            {material: (material) => materials.push(material.name!)});

        visitor.visit(gltf, {sparse: true});

        expect(materials).to.be.deep.equal([
          'Material0',
          'Material1',
          'Material2',
        ]);
      });
    });
  });
});
