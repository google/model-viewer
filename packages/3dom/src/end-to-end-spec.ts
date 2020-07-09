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

import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader';
import {Object3D} from 'three/src/core/Object3D.js';
import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial.js';
import {Mesh} from 'three/src/objects/Mesh.js';

import {ModelKernel} from './api/model-kernel.js';
import {CorrelatedSceneGraph} from './facade/three-js/correlated-scene-graph.js';
import {ModelGraft} from './facade/three-js/model-graft.js';
import {ModelGraftManipulator} from './model-graft-manipulator.js';
import {assetPath, loadThreeGLTF} from './test-helpers.js';

const prepareConstructsFor = async (url: string) => {
  const glTF = await loadThreeGLTF(url);
  const graft = new ModelGraft(url, CorrelatedSceneGraph.from(glTF));

  const {port1, port2} = new MessageChannel();
  const graftManipulator = new ModelGraftManipulator(graft, port1);
  const modelKernel = new ModelKernel(port2, graft.model.toJSON());

  return {graftManipulator, modelKernel, glTF};
};

const imageURL = (() => {
  const canvas = document.createElement('canvas');

  return (width: number, height: number): string => {
    canvas.width = width;
    canvas.height = height;

    return canvas.toDataURL();
  };
})();

suite('end-to-end', () => {
  suite('with Astronaut.glb', () => {
    let manipulator: ModelGraftManipulator;
    let kernel: ModelKernel;
    let gltf: GLTF;
    let material: MeshStandardMaterial;

    setup(async () => {
      const {graftManipulator, modelKernel, glTF} =
          await prepareConstructsFor(assetPath('models/Astronaut.glb'));
      manipulator = graftManipulator;
      kernel = modelKernel;
      gltf = glTF;
      // Note that this lookup is specific to the Astronaut model and will need
      // to be adapted in case the model changes:
      material =
          ((gltf.scene.children[0] as Object3D).children[0] as Mesh).material as
          MeshStandardMaterial;
    });

    teardown(() => {
      manipulator.dispose();
      kernel.deactivate();
    });

    test(
        'can operate on a scene graph and the artifact of a Three.js GLTFLoader',
        async () => {
          await kernel.model.materials[0]
              .pbrMetallicRoughness.setBaseColorFactor([0, 0, 1, 1]);

          expect(material.color.r).to.be.equal(0);
          expect(material.color.b).to.be.equal(1);

          const color =
              kernel.model.materials[0].pbrMetallicRoughness.baseColorFactor;

          expect(color[0]).to.be.equal(0);
          expect(color[2]).to.be.equal(1);
        });

    test('expresses the name of a material', async () => {
      const name = kernel.model.materials[0].name;

      expect(name).to.be.ok;
      expect(name).to.not.be.equal('');
      expect(name).to.be.equal(material.name);
    });

    suite('configuring textures', () => {
      test('can change the base color texture image', async () => {
        const textureURL = imageURL(64, 64);

        const texture = kernel.model.materials[0]
                            .pbrMetallicRoughness.baseColorTexture!.texture!;

        await texture.source!.setURI(textureURL);

        expect(texture.source!.uri).to.be.equal(textureURL);
        expect(material.map!.image.src).to.be.equal(textureURL);
      });
    });
  });

  suite('with order-test.glb', () => {
    let manipulator: ModelGraftManipulator;
    let kernel: ModelKernel;

    setup(async () => {
      const {graftManipulator, modelKernel} = await prepareConstructsFor(
          assetPath('models/order-test/order-test.glb'));
      manipulator = graftManipulator;
      kernel = modelKernel;
    });

    teardown(() => {
      manipulator.dispose();
      kernel.deactivate();
    });

    suite('scene graph order', () => {
      test('orders materials deterministically', async () => {
        const materialNames = kernel.model.materials.map(function(material) {
          return material.name;
        });

        expect(materialNames).to.be.deep.equal([
          'Material0',
          'Material1',
          'Material2',
        ]);
      });
    });
  });
});
