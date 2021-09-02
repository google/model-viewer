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

import {$primitives, Model} from '../../../features/scene-graph/model.js';
import {CorrelatedSceneGraph} from '../../../three-components/gltf-instance/correlated-scene-graph.js';
import {assetPath, loadThreeGLTF} from '../../helpers.js';



const expect = chai.expect;

const BRAIN_STEM_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/BrainStem/glTF-Binary/BrainStem.glb');
const SHEEN_CHAIR_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/SheenChair/glTF-Binary/SheenChair.glb');


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
  suite('Static Primitive', () => {
    test('Primitive count matches glTF file', async () => {
      const threeGLTF = await loadThreeGLTF(SHEEN_CHAIR_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      expect(model![$primitives].length).to.equal(4);
    });

    test('Should have variant info', async () => {
      const threeGLTF = await loadThreeGLTF(SHEEN_CHAIR_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      expect(findPrimitivesWithVariant(model, 'Mango Velvet')).to.not.be.null;
      expect(findPrimitivesWithVariant(model, 'Peacock Velvet')).to.not.be.null;
    });

    test('Should not have variant info', async () => {
      const threeGLTF = await loadThreeGLTF(SHEEN_CHAIR_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));

      let hasNoVariantInfoCount = 0;
      for (const primitive of model![$primitives]) {
        if (primitive.variantInfo === undefined) {
          hasNoVariantInfoCount++;
        }
      }
      expect(hasNoVariantInfoCount).equals(2);
    });

    test('Switching to incorrect variant name', async () => {
      const threeGLTF = await loadThreeGLTF(SHEEN_CHAIR_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      const primitive = findPrimitivesWithVariant(model, 'Mango Velvet')![0];
      const material = await primitive.enableVariant('Does not exist');
      expect(material).to.be.null;
    });

    test('Switching to current variant', async () => {
      const threeGLTF = await loadThreeGLTF(SHEEN_CHAIR_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      const primitives = findPrimitivesWithVariant(model, 'Mango Velvet')!;
      const materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            primitive.enableVariant('Mango Velvet') as MeshStandardMaterial);
      }
      expect(materials).to.not.be.empty;
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'fabric Mystere Mango Velvet';
      })).to.not.be.null;
    });

    test('Switching to other variant name', async () => {
      const threeGLTF = await loadThreeGLTF(SHEEN_CHAIR_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      const primitives = findPrimitivesWithVariant(model, 'Mango Velvet')!;
      const materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            primitive.enableVariant('Peacock Velvet') as MeshStandardMaterial);
      }
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'fabric Mystere Peacock Velvet';
      })).to.not.be.null;
    });

    test('Switching back variant name', async () => {
      const threeGLTF = await loadThreeGLTF(SHEEN_CHAIR_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      const primitives = findPrimitivesWithVariant(model, 'Mango Velvet')!;
      for (const primitive of primitives) {
        primitive.enableVariant('Peacock Velvet');
      }

      const materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            primitive.enableVariant('Mango Velvet') as MeshStandardMaterial);
      }
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'fabric Mystere Mango Velvet';
      })).to.not.be.null;
    });
  });

  suite('Skinned Primitive', () => {
    test('Primitive count matches glTF file', async () => {
      const threeGLTF = await loadThreeGLTF(BRAIN_STEM_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      expect(model![$primitives].length).to.equal(59);
    });
  });
});
