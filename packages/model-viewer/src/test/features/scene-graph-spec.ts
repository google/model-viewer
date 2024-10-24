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
import {Mesh, MeshStandardMaterial} from 'three';

import {$currentGLTF} from '../../features/scene-graph.js';
import {$primitivesList} from '../../features/scene-graph/model.js';
import {PrimitiveNode} from '../../features/scene-graph/nodes/primitive-node.js';
import {$scene} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {ModelViewerGLTFInstance} from '../../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {waitForEvent} from '../../utilities.js';
import {assetPath, rafPasses} from '../helpers.js';

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');
const HORSE_GLB_PATH = assetPath('models/Horse.glb');
const CUBES_GLB_PATH = assetPath('models/cubes.gltf');  // has variants
const MESH_PRIMITIVES_GLB_PATH =
    assetPath('models/MeshPrimitivesVariants.glb');   // has variants
const CUBE_GLB_PATH = assetPath('models/cube.gltf');  // has UV coords
const RIGGEDFIGURE_GLB_PATH = assetPath(
    'models/glTF-Sample-Assets/Models/RiggedFigure/glTF-Binary/RiggedFigure.glb');

function getGLTFRoot(scene: ModelScene, hasBeenExportedOnce = false) {
  // TODO: export is putting in an extra node layer, because the loader
  // gives us a Group, but if the exporter doesn't get a Scene, then it
  // wraps everything in an "AuxScene" node. Feels like a three.js bug.
  return hasBeenExportedOnce ? scene.model!.children[0] : scene.model!;
}

suite('SceneGraph', () => {
  let element: ModelViewerElement;

  setup(() => {
    element = new ModelViewerElement();
    document.body.insertBefore(element, document.body.firstChild);
  });

  teardown(() => {
    document.body.removeChild(element);
  });

  suite('scene export', () => {
    suite('transformations', () => {
      test(
          'setting scale before model loads has expected dimensions',
          async () => {
            element.scale = '1 2 3';
            element.src = CUBE_GLB_PATH;
            await waitForEvent(element, 'load');

            const dim = element.getDimensions();
            expect(dim.x).to.be.eq(1, 'x');
            expect(dim.y).to.be.eq(2, 'y');
            expect(dim.z).to.be.eq(3, 'z');
          });

      test('orientation is applied after scale', async () => {
        element.orientation = '90deg 90deg 90deg';
        element.scale = '1 2 3';
        element.src = CUBE_GLB_PATH;
        await waitForEvent(element, 'load');

        const dim = element.getDimensions();
        expect(dim.x).to.be.closeTo(1, 0.001, 'x');
        expect(dim.y).to.be.closeTo(3, 0.001, 'y');
        expect(dim.z).to.be.closeTo(2, 0.001, 'z');
      });

      test('exports and re-imports the rescaled model', async () => {
        element.scale = '1 2 3';
        element.src = CUBE_GLB_PATH;
        await waitForEvent(element, 'load');
        const exported = await element.exportScene({binary: true});
        const url = URL.createObjectURL(exported);
        element.scale = '1 1 1';
        element.src = url;
        await waitForEvent(element, 'load');
        await rafPasses();

        const dim = element.getDimensions();
        expect(dim.x).to.be.eq(1, 'x');
        expect(dim.y).to.be.eq(2, 'y');
        expect(dim.z).to.be.eq(3, 'z');
      });

      test('exports and re-imports the transformed model', async () => {
        element.orientation = '90deg 90deg 90deg';
        element.scale = '1 2 3';
        element.src = CUBE_GLB_PATH;
        await waitForEvent(element, 'load');
        const exported = await element.exportScene({binary: true});
        const url = URL.createObjectURL(exported);

        element.orientation = '0deg 0deg 0deg';
        element.scale = '1 1 1';
        element.src = url;
        await waitForEvent(element, 'load');
        await rafPasses();

        const dim = element.getDimensions();
        expect(dim.x).to.be.closeTo(1, 0.001, 'x');
        expect(dim.y).to.be.closeTo(3, 0.001, 'y');
        expect(dim.z).to.be.closeTo(2, 0.001, 'z');
      });
    });

    suite('with a loaded model', () => {
      setup(async () => {
        element.src = CUBES_GLB_PATH;

        await waitForEvent(element, 'load');
        await rafPasses();
      });

      test('exports the loaded model to GLTF', async () => {
        const exported = await element.exportScene({binary: false});
        expect(exported).to.be.not.undefined;
        expect(exported.size).to.be.greaterThan(500);
      });

      test('exports the loaded model to GLB', async () => {
        const exported = await element.exportScene({binary: true});
        expect(exported).to.be.not.undefined;
        expect(exported.size).to.be.greaterThan(500);
      });

      test('has variants', () => {
        expect(element[$scene].currentGLTF!.userData.variants.length)
            .to.be.eq(3);
        const gltfRoot = getGLTFRoot(element[$scene]);
        expect(gltfRoot.children[0].userData.variantMaterials.size).to.be.eq(3);
        expect(gltfRoot.children[1].userData.variantMaterials.size).to.be.eq(3);
      });

      test('allows the scene graph to be manipulated', async () => {
        element.variantName = 'Yellow Red';
        await waitForEvent(element, 'variant-applied');

        const material =
            (element[$scene].model!.children[1] as Mesh).material as
            MeshStandardMaterial;

        const mat = element.model!.getMaterialByName('red')!;

        expect(mat.isActive).to.be.true;

        mat.pbrMetallicRoughness.setBaseColorFactor([0.5, 0.5, 0.5, 1]);

        const color = mat.pbrMetallicRoughness.baseColorFactor;

        expect(color).to.be.eql([0.5, 0.5, 0.5, 1]);

        console.log(material.name, ': actual material ', material.uuid);

        expect(material.color).to.include({r: 0.5, g: 0.5, b: 0.5});
      });

      test(
          `Setting variantName to null results in primitive
           reverting to default/initial material`,
          async () => {
            let primitiveNode: PrimitiveNode|null = null
            // Finds the first primitive with material 0 assigned.
            for (const primitive of element.model![$primitivesList]) {
              if (primitive.variantInfo != null &&
                  primitive.initialMaterialIdx == 0) {
                primitiveNode = primitive;
                return;
              }
            }

            expect(primitiveNode).to.not.be.null;

            // Switches to a new variant.
            element.variantName = 'Yellow Red';
            await waitForEvent(element, 'variant-applied');
            expect((primitiveNode!.mesh.material as MeshStandardMaterial).name)
                .equal('red');

            // Switches to null variant.
            element.variantName = null;
            await waitForEvent(element, 'variant-applied');
            expect((primitiveNode!.mesh.material as MeshStandardMaterial).name)
                .equal('purple');
          });

      test('exports and re-imports the model with variants', async () => {
        const exported = await element.exportScene({binary: true});
        const url = URL.createObjectURL(exported);
        element.src = url;
        await waitForEvent(element, 'load');
        await rafPasses();

        expect(element[$scene].currentGLTF!.userData.variants.length)
            .to.be.eq(3);
        const gltfRoot = getGLTFRoot(element[$scene], true);
        expect(gltfRoot.children[0].userData.variantMaterials.size).to.be.eq(3);
        expect(gltfRoot.children[1].userData.variantMaterials.size).to.be.eq(3);
      });
    });

    suite(
        'with a loaded model containing a mesh with multiple primitives',
        () => {
          setup(async () => {
            element.src = MESH_PRIMITIVES_GLB_PATH;

            await waitForEvent(element, 'load');
            await rafPasses();
          });

          test('has variants', () => {
            expect(element[$scene].currentGLTF!.userData.variants.length)
                .to.be.eq(2);
            const gltfRoot = getGLTFRoot(element[$scene]);
            expect(
                gltfRoot.children[0].children[0].userData.variantMaterials.size)
                .to.be.eq(2);
            expect(
                gltfRoot.children[0].children[1].userData.variantMaterials.size)
                .to.be.eq(2);
            expect(
                gltfRoot.children[0].children[2].userData.variantMaterials.size)
                .to.be.eq(2);
          });

          test(
              `Setting variantName to null results in primitive
           reverting to default/initial material`,
              async () => {
                let primitiveNode: PrimitiveNode|null = null
                // Finds the first primitive with material 0 assigned.
                for (const primitive of element.model![$primitivesList]) {
                  if (primitive.variantInfo != null &&
                      primitive.initialMaterialIdx == 0) {
                    primitiveNode = primitive;
                    return;
                  }
                }

                expect(primitiveNode).to.not.be.null;

                // Switches to a new variant.
                element.variantName = 'Inverse';
                await waitForEvent(element, 'variant-applied');
                expect(
                    (primitiveNode!.mesh.material as MeshStandardMaterial).name)
                    .equal('STEEL RED X');

                // Switches to null variant.
                element.variantName = null;
                await waitForEvent(element, 'variant-applied');
                expect(
                    (primitiveNode!.mesh.material as MeshStandardMaterial).name)
                    .equal('STEEL METALLIC');
              });

          test('exports and re-imports the model with variants', async () => {
            const exported = await element.exportScene({binary: true});
            const url = URL.createObjectURL(exported);
            element.src = url;
            await waitForEvent(element, 'load');
            await rafPasses();

            expect(element[$scene].currentGLTF!.userData.variants.length)
                .to.be.eq(2);

            const gltfRoot = getGLTFRoot(element[$scene], true);
            expect(
                gltfRoot.children[0].children[0].userData.variantMaterials.size)
                .to.be.eq(2);
            expect(
                gltfRoot.children[0].children[1].userData.variantMaterials.size)
                .to.be.eq(2);
            expect(
                gltfRoot.children[0].children[2].userData.variantMaterials.size)
                .to.be.eq(2);
          });
        });

    test.skip(
        'When loading a new JPEG texture from an ObjectURL, the GLB does not export PNG',
        async () => {
          element.src = CUBE_GLB_PATH;
          await waitForEvent(element, 'load');
          await rafPasses();

          const url = assetPath(
              'models/glTF-Sample-Assets/Models/DamagedHelmet/glTF/Default_albedo.jpg');
          const blob = await fetch(url).then(r => r.blob());
          const objectUrl = URL.createObjectURL(blob);
          const texture = await element.createTexture(objectUrl, 'image/jpeg');

          element.model!.materials[0]
              .pbrMetallicRoughness.baseColorTexture.setTexture(texture);

          const exported = await element.exportScene({binary: true});
          expect(exported).to.be.not.undefined;
          // The JPEG is ~1 Mb and the equivalent PNG is about ~6 Mb, so this
          // just checks we saved an image and it wasn't too big.
          expect(exported.size).to.be.greaterThan(0.5e6);
          expect(exported.size).to.be.lessThan(1.5e6);
        });
  });

  suite('with a loaded scene graph', () => {
    let material: MeshStandardMaterial;

    setup(async () => {
      element.src = ASTRONAUT_GLB_PATH;

      await waitForEvent(element, 'load');

      material =
          (element[$scene].model!.children[0].children[0] as Mesh).material as
          MeshStandardMaterial;
    });

    test('allows the scene graph to be manipulated', async () => {
      await element.model!.materials[0].pbrMetallicRoughness.setBaseColorFactor(
          [1, 0, 0, 1]);

      expect(material.color).to.include({r: 1, g: 0, b: 0});

      const color =
          element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

      expect(color).to.be.eql([1, 0, 0, 1]);
    });

    suite('when the model changes', () => {
      test('updates when the model changes', async () => {
        const color =
            element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

        expect(color).to.be.eql([0.5, 0.5, 0.5, 1]);

        element.src = HORSE_GLB_PATH;

        await waitForEvent(element, 'load');

        const nextColor =
            element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

        expect(nextColor).to.be.eql([1, 1, 1, 1]);
      });

      test('allows the scene graph to be manipulated', async () => {
        element.src = HORSE_GLB_PATH;

        await waitForEvent(element, 'load');

        await element.model!.materials[0]
            .pbrMetallicRoughness.setBaseColorFactor([1, 0, 0, 1]);

        const color =
            element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

        expect(color).to.be.eql([1, 0, 0, 1]);

        const newMaterial =
            (element[$scene].model!.children[0] as Mesh).material as
            MeshStandardMaterial;

        expect(newMaterial.color).to.include({r: 1, g: 0, b: 0});
      });
    });

    suite('Scene-graph gltf-to-three mappings', () => {
      test('has a mapping for each primitive mesh', async () => {
        element.src = RIGGEDFIGURE_GLB_PATH;

        await waitForEvent(element, 'load');

        const gltf = (element as any)[$currentGLTF] as ModelViewerGLTFInstance;

        for (const primitive of element.model![$primitivesList]) {
          expect(gltf.correlatedSceneGraph.threeObjectMap.get(primitive.mesh))
              .to.be.ok;
        }
      });
    });
  });
});
