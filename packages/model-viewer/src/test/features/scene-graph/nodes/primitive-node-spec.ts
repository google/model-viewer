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
import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial.js';

import {$primitivesList, $variantData, Model} from '../../../../features/scene-graph/model.js';
import {ModelViewerElement} from '../../../../model-viewer.js';
import {CorrelatedSceneGraph} from '../../../../three-components/gltf-instance/correlated-scene-graph.js';
import {waitForEvent} from '../../../../utilities.js';
import {assetPath, loadThreeGLTF} from '../../../helpers.js';

const BRAIN_STEM_GLB_PATH = assetPath(
    'models/glTF-Sample-Assets/Models/BrainStem/glTF-Binary/BrainStem.glb');
const CUBES_GLTF_PATH = assetPath('models/cubes.gltf');
const CUBE_GLTF_PATH = assetPath('models/cube.gltf');
const MESH_PRIMITIVES_GLB_PATH = assetPath('models/MeshPrimitivesVariants.glb');
const KHRONOS_TRIANGLE_GLB_PATH =
    assetPath('models/glTF-Sample-Assets/Models/Triangle/glTF/Triangle.gltf');

const findPrimitivesWithVariant = (model: Model, variantName: string) => {
  const result = new Array<any>();
  for (const primitive of model![$primitivesList]) {
    if (primitive.variantInfo != null && model.hasVariant(variantName) &&
        primitive.variantInfo.has(
            model[$variantData].get(variantName)!.index)) {
      result.push(primitive);
    }
  }
  return result.length > 0 ? result : null;
};

suite('scene-graph/model/mesh-primitives', () => {
  suite('Primitive with default material', () => {
    let element: ModelViewerElement;

    setup(async () => {
      element = new ModelViewerElement();
      element.src = KHRONOS_TRIANGLE_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('has a default material', async () => {
      const model = element.model!;
      expect(model[$primitivesList].length).to.equal(1);
      expect(model.materials.length).to.equal(1);
      expect(model[$primitivesList][0].initialMaterialIdx).to.equal(0);
      expect(model.materials[0].name).to.equal('Default');
    });
  });

  suite('Static Primitive Without Variant', () => {
    let model: Model;
    setup(async () => {
      const threeGLTF = await loadThreeGLTF(CUBE_GLTF_PATH);
      model = new Model(CorrelatedSceneGraph.from(threeGLTF));
    });

    test('Should not have any primitives with variant info', async () => {
      let hasVariantInfoCount = 0;
      for (const primitive of model![$primitivesList]) {
        if (primitive.variantInfo.size > 0) {
          hasVariantInfoCount++;
        }
      }
      expect(hasVariantInfoCount).equals(0);
    });
  });

  suite('Static Primitive With Variant', () => {
    let model: Model;
    setup(async () => {
      const threeGLTF = await loadThreeGLTF(CUBES_GLTF_PATH);
      model = new Model(CorrelatedSceneGraph.from(threeGLTF));
    });

    test('Primitive count matches glTF file', async () => {
      expect(model![$primitivesList].length).to.equal(2);
    });

    test('Primitives should have expected variant names', async () => {
      expect(findPrimitivesWithVariant(model, 'Purple Yellow')).to.not.be.null;
      expect(findPrimitivesWithVariant(model, 'Yellow Yellow')).to.not.be.null;
      expect(findPrimitivesWithVariant(model, 'Yellow Red')).to.not.be.null;
    });

    test('Should not have any primitives without variant info', async () => {
      let hasNoVariantInfoCount = 0;
      for (const primitive of model![$primitivesList]) {
        if (primitive.variantInfo == null) {
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
            await primitive.enableVariant('Yellow Yellow') as
            MeshStandardMaterial);
      }
      expect(materials).to.not.be.empty;
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'yellow';
      })).to.not.be.null;
    });

    test('Switching to variant and then switch back', async () => {
      const primitives = findPrimitivesWithVariant(model, 'Purple Yellow')!;
      let materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            await primitive.enableVariant('Yellow Yellow') as
            MeshStandardMaterial);
      }
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'yellow';
      })).to.not.be.null;

      materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            await primitive.enableVariant('Purple Yellow') as
            MeshStandardMaterial);
      }
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === 'purple';
      })).to.not.be.null;
    });

    test('Primitive switches to initial material', async () => {
      const primitive = findPrimitivesWithVariant(model, 'Purple Yellow')![0];

      // Gets current material.
      const initialMaterial = await primitive.enableVariant('Purple Yellow');
      // Switches to variant.
      const variantMaterial = await primitive.enableVariant('Yellow Red');
      expect(initialMaterial).to.not.equal(variantMaterial)
      // Switches to initial material.
      const resetMaterial = await primitive.enableVariant(null);
      expect(resetMaterial).to.equal(initialMaterial);
    });
  });

  suite('Mesh with multiple primitives each with variants', () => {
    let model: Model;
    setup(async () => {
      const threeGLTF = await loadThreeGLTF(MESH_PRIMITIVES_GLB_PATH);
      model = new Model(CorrelatedSceneGraph.from(threeGLTF));
    });

    test('Primitive count matches glTF file', async () => {
      expect(model![$primitivesList].length).to.equal(3);
    });

    test('Primitives should have expected variant names', async () => {
      expect(findPrimitivesWithVariant(model, 'Normal')).to.not.be.null;
      expect(findPrimitivesWithVariant(model, 'Inverse')).to.not.be.null;
    });

    test('Switching to incorrect variant name', async () => {
      const primitive = findPrimitivesWithVariant(model, 'Normal')![0];
      const material = await primitive.enableVariant('Does not exist');
      expect(material).to.be.null;
    });

    test('Switching to variant and then switch back', async () => {
      const MATERIAL_NAME = 'STEEL BLACK';
      const primitives = findPrimitivesWithVariant(model, 'Normal')!;
      let materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            await primitive.enableVariant('Inverse') as MeshStandardMaterial);
      }

      expect(materials).to.not.be.empty;
      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === MATERIAL_NAME;
      })).to.be.undefined;

      materials = new Array<MeshStandardMaterial>();
      for (const primitive of primitives) {
        materials.push(
            await primitive.enableVariant('Normal') as MeshStandardMaterial);
      }

      expect(materials.find((material: MeshStandardMaterial) => {
        return material.name === MATERIAL_NAME;
      })).to.be.ok;
    });

    test('Primitive switches to initial material', async () => {
      const primitive = findPrimitivesWithVariant(model, 'Normal')![0];

      // Gets current material.
      const initialMaterial = await primitive.enableVariant('Normal');
      // Switches to variant.
      const variantMaterial = await primitive.enableVariant('Inverse');
      expect(initialMaterial).to.not.equal(variantMaterial)
      // Switches to initial material.
      const resetMaterial = await primitive.enableVariant(null);
      expect(resetMaterial).to.equal(initialMaterial);
    });
  });

  suite('Skinned Primitive Without Variant', () => {
    test('Primitive count matches glTF file', async () => {
      const threeGLTF = await loadThreeGLTF(BRAIN_STEM_GLB_PATH);
      const model = new Model(CorrelatedSceneGraph.from(threeGLTF));
      expect(model![$primitivesList].length).to.equal(59);
    });
  });
});
