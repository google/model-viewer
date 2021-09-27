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

import {Mesh, MeshStandardMaterial} from 'three';

import {$currentGLTF, SceneGraphInterface, SceneGraphMixin} from '../../features/scene-graph.js';
import {$primitives} from '../../features/scene-graph/model.js';
import {$initialMaterialIdx, PrimitiveNode} from '../../features/scene-graph/nodes/primitive-node.js';
import ModelViewerElementBase, {$scene} from '../../model-viewer-base.js';
import {ModelViewerGLTFInstance} from '../../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {waitForEvent} from '../../utilities.js';
import {assetPath, rafPasses} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';



const expect = chai.expect;

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');
const HORSE_GLB_PATH = assetPath('models/Horse.glb');
const CUBES_GLB_PATH = assetPath('models/cubes.gltf');  // has variants
const CUBE_GLB_PATH = assetPath('models/cube.gltf');    // has UV coords
const SUNRISE_IMG_PATH = assetPath('environments/spruit_sunrise_1k_LDR.jpg');
const RIGGEDFIGURE_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/RiggedFigure/glTF-Binary/RiggedFigure.glb');


suite('ModelViewerElementBase with SceneGraphMixin', () => {
  let nextId = 0;
  let tagName: string;
  let ModelViewerElement:
      Constructor<ModelViewerElementBase&SceneGraphInterface>;
  let element: InstanceType<typeof ModelViewerElement>;

  setup(() => {
    tagName = `model-viewer-scene-graph-${nextId++}`;
    ModelViewerElement = class extends SceneGraphMixin
    (ModelViewerElementBase) {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);

    element = new ModelViewerElement();
    document.body.insertBefore(element, document.body.firstChild);
  });

  teardown(() => {
    document.body.removeChild(element);
  });

  BasicSpecTemplate(() => ModelViewerElement, () => tagName);

  suite('scene export', () => {
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
        const glTFroot = element[$scene].modelContainer.children[0];
        expect(glTFroot.children[0].userData.variantMaterials.size).to.be.eq(3);
        expect(glTFroot.children[1].userData.variantMaterials.size).to.be.eq(3);
      });

      test(
          `Setting varianName to null results in primitive
           reverting to default/initial material`,
          async () => {
            let primitiveNode: PrimitiveNode|null = null
            // Finds the first primitive with material 0 assigned.
            for (const primitive of element.model![$primitives]) {
              if (primitive.variantInfo != null &&
                  primitive[$initialMaterialIdx] == 0) {
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

      test('exports and reimports the model with variants', async () => {
        const exported = await element.exportScene({binary: true});
        const url = URL.createObjectURL(exported);
        element.src = url;
        await waitForEvent(element, 'load');
        await rafPasses();

        expect(element[$scene].currentGLTF!.userData.variants.length)
            .to.be.eq(3);
        // TODO: export is putting in an extra node layer, because the loader
        // gives us a Group, but if the exporter doesn't get a Scene, then it
        // wraps everything in an "AuxScene" node. Feels like a three.js bug.
        const glTFroot = element[$scene].modelContainer.children[0].children[0];
        expect(glTFroot.children[0].userData.variantMaterials.size).to.be.eq(3);
        expect(glTFroot.children[1].userData.variantMaterials.size).to.be.eq(3);
      });
    });

    test(
        'When loading a new JPEG texture from an ObjectURL, the GLB does not export PNG',
        async () => {
          element.src = CUBE_GLB_PATH;
          await waitForEvent(element, 'load');
          await rafPasses();

          const url = assetPath(
              'models/glTF-Sample-Models/2.0/DamagedHelmet/glTF/Default_albedo.jpg');
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

      await waitForEvent(element, 'scene-graph-ready');

      material =
          (element[$scene].modelContainer.children[0].children[0].children[0] as
           Mesh)
              .material as MeshStandardMaterial;
    });

    test('allows the scene graph to be manipulated', async () => {
      await element.model!.materials[0].pbrMetallicRoughness.setBaseColorFactor(
          [1, 0, 0, 1]);

      expect(material.color).to.include({r: 1, g: 0, b: 0});

      const color =
          element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

      expect(color).to.be.eql([1, 0, 0, 1]);
    });

    test('image.setURI sets the appropriate texture', async () => {
      await element.model!.materials[0]
          .pbrMetallicRoughness.baseColorTexture!.texture!.source!.setURI(
              SUNRISE_IMG_PATH);

      const uri =
          element.model!.materials[0]
              .pbrMetallicRoughness.baseColorTexture!.texture!.source!.uri;

      expect(uri).to.be.eql(SUNRISE_IMG_PATH);
    });

    suite('when the model changes', () => {
      test('updates when the model changes', async () => {
        const color =
            element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

        expect(color).to.be.eql([0.5, 0.5, 0.5, 1]);

        element.src = HORSE_GLB_PATH;

        await waitForEvent(element, 'scene-graph-ready');

        const nextColor =
            element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

        expect(nextColor).to.be.eql([1, 1, 1, 1]);
      });

      test('allows the scene graph to be manipulated', async () => {
        element.src = HORSE_GLB_PATH;

        await waitForEvent(element, 'scene-graph-ready');

        await element.model!.materials[0]
            .pbrMetallicRoughness.setBaseColorFactor([1, 0, 0, 1]);

        const color =
            element.model!.materials[0].pbrMetallicRoughness.baseColorFactor;

        expect(color).to.be.eql([1, 0, 0, 1]);

        const newMaterial =
            (element[$scene].modelContainer.children[0].children[0] as Mesh)
                .material as MeshStandardMaterial;

        expect(newMaterial.color).to.include({r: 1, g: 0, b: 0});
      });
    });

    suite('Scene-graph gltf-to-three mappings', () => {
      test('has a mapping for each primitive mesh', async () => {
        element.src = RIGGEDFIGURE_GLB_PATH;

        await waitForEvent(element, 'scene-graph-ready');

        const gltf = (element as any)[$currentGLTF] as ModelViewerGLTFInstance;

        for (const primitive of element.model![$primitives]) {
          expect(gltf.correlatedSceneGraph.threeObjectMap.get(primitive.mesh))
              .to.be.ok;
        }
      });
    });
  });
});
