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

import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial';

import {$primitives, Model} from '../../../../features/scene-graph/model.js';
import {CorrelatedSceneGraph} from '../../../../three-components/gltf-instance/correlated-scene-graph.js';
import {assetPath, loadThreeGLTF} from '../../../helpers.js';



const expect = chai.expect;

const BRAIN_STEM_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/BrainStem/glTF-Binary/BrainStem.glb');
const CUBES_GLTF_PATH = assetPath('models/cubes.gltf');
const CUBE_GLTF_PATH = assetPath('models/cube.gltf');


const findPrimitivesWithVariant = (model: Model, variantName: string) => {
  const result = new Array<any>();
  for (const primitive of model![$primitives]) {
    if (primitive.variantInfo != null &&
        primitive.variantInfo.has(variantName)) {
      result.push(primitive);
    }
  }
  return result.length > 0 ? result : null;
};

suite('scene-graph/model/mesh-primitives', () => {
  suite('Static Primitive Without Variant', () => {
    let model: Model;
    setup(async () => {
      const threeGLTF = await loadThreeGLTF(CUBE_GLTF_PATH);
      model = new Model(CorrelatedSceneGraph.from(threeGLTF));
    });

    test('Should not have 1 primitive with variant info', async () => {
      let hasNoVariantInfoCount = 0;
      for (const primitive of model![$primitives]) {
        if (primitive.variantInfo === undefined) {
          hasNoVariantInfoCount++;
        }
      }
      expect(hasNoVariantInfoCount).equals(1);
    });
  });

  suite('Static Primitive With Variant', () => {
    let model: Model;
    setup(async () => {
      const threeGLTF = await loadThreeGLTF(CUBES_GLTF_PATH);
      model = new Model(CorrelatedSceneGraph.from(threeGLTF));
    });

    test('Primitive count matches glTF file', async () => {
      expect(model![$primitives].length).to.equal(2);
    });

    test(
        'Primitives should have variant info that with expected mappings',
        async () => {
          expect(findPrimitivesWithVariant(model, 'Purple Yellow'))
              .to.not.be.null;
          expect(findPrimitivesWithVariant(model, 'Yellow Yellow'))
              .to.not.be.null;
          expect(findPrimitivesWithVariant(model, 'Yellow Red')).to.not.be.null;
        });

    test('Should not have any primitives without variant info', async () => {
      let hasNoVariantInfoCount = 0;
      for (const primitive of model![$primitives]) {
        if (primitive.variantInfo === undefined) {
          hasNoVariantInfoCount++;
        }
      }
      expect(hasNoVariantInfoCount).equals(0);
    });

    test('Switching to incorrect variant name', async () => {
      const primitive = findPrimitivesWithVariant(model, 'Purple Yellow')![0];
      const material = await primitive.enableVariant('Does not exist');
      expect(material).to.be.null;
    });

    test('Switching to current variant', async () => {
      const primitives = findPrimitivesWithVariant(model, 'Purple Yellow')!;
      const materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            primitive.enableVariant('Yellow Yellow') as MeshStandardMaterial);
      }
      expect(materials).to.not.be.empty;
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'yellow';
      })).to.not.be.null;
    });

    test('Switching to variant and then switch back', async () => {
      const primitives = findPrimitivesWithVariant(model, 'Purple Yellow')!;
      for (const primitive of primitives) {
        primitive.enableVariant('Yellow Yellow');
      }

      const materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            primitive.enableVariant('Purple Yellow') as MeshStandardMaterial);
      }
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'purple';
      })).to.not.be.null;
    });
  });

  suite('Skinned Primitive Without Variant', () => {
    test('Primitive count matches glTF file', async () => {
      const threeGLTF = await loadThreeGLTF(BRAIN_STEM_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      expect(model![$primitives].length).to.equal(59);
    });
  });
});
