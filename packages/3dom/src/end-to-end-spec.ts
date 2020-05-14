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

import {Object3D} from 'three/src/core/Object3D.js';
import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial.js';
import {Mesh} from 'three/src/objects/Mesh.js';

import {ThreeDOMCapability} from './api.js';
import {ThreeDOMExecutionContext} from './context.js';
import {CorrelatedSceneGraph} from './facade/three-js/correlated-scene-graph.js';
import {ModelGraft} from './facade/three-js/model-graft.js';
import {assetPath, loadThreeGLTF, waitForEvent} from './test-helpers.js';

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');
const ORDER_TEST_GLB_PATH = assetPath('models/order-test/order-test.glb');

const prepareConstructsFor =
    async (url: string, capabilities: ThreeDOMCapability[] = []) => {
  const gltf = await loadThreeGLTF(url);
  const executionContext = new ThreeDOMExecutionContext(capabilities);
  const graft = new ModelGraft(url, CorrelatedSceneGraph.from(gltf));

  return {executionContext, graft, gltf};
};

suite('end-to-end', () => {
  test('can operate on a scene graph via a custom script in a worker', async () => {
    const {executionContext, graft, gltf} =
        await prepareConstructsFor(ASTRONAUT_GLB_PATH, ['material-properties']);

    // Note that this lookup is specific to the Astronaut model and will need
    // to be adapted in case the model changes:
    const material =
        ((gltf.scene.children[0] as Object3D).children[0] as Mesh).material as
        MeshStandardMaterial;

    executionContext.changeModel(graft);

    executionContext.eval(
        'model.materials[0].pbrMetallicRoughness.setBaseColorFactor([0, 0, 1])');

    await waitForEvent(graft, 'mutation');

    expect(material.color.r).to.be.equal(0);
    expect(material.color.b).to.be.equal(1);
  });

  test('can operate on the artifact of a Three.js GLTFLoader', async () => {
    const {executionContext, graft, gltf} =
        await prepareConstructsFor(ASTRONAUT_GLB_PATH, ['material-properties']);

    const material = (gltf.scene.children[0]!.children[0] as Mesh).material as
        MeshStandardMaterial;

    executionContext.changeModel(graft);

    executionContext.eval(
        'model.materials[0].pbrMetallicRoughness.setBaseColorFactor([0, 0, 1])');

    await waitForEvent(graft, 'mutation');

    expect(material.color.r).to.be.equal(0);
    expect(material.color.b).to.be.equal(1);
  });

  test('expresses the name of a material in the worklet context', async () => {
    const {executionContext, graft, gltf} = await prepareConstructsFor(
        ASTRONAUT_GLB_PATH, ['messaging', 'material-properties']);

    const material = (gltf.scene.children[0]!.children[0] as Mesh).material as
        MeshStandardMaterial;

    executionContext.changeModel(graft);

    const messageEventArrives =
        waitForEvent<MessageEvent>(executionContext.worker, 'message');
    executionContext.eval('self.postMessage(model.materials[0].name)');

    const messageEvent = await messageEventArrives;

    expect(messageEvent.data).to.be.ok;
    expect(messageEvent.data).to.not.be.equal('');
    expect(messageEvent.data).to.be.equal(material.name);
  });

  suite('scene graph order', () => {
    test('orders materials deterministically', async () => {
      const {executionContext, graft} = await prepareConstructsFor(
          ORDER_TEST_GLB_PATH, ['messaging', 'material-properties']);

      executionContext.changeModel(graft);

      const messageEventArrives =
          waitForEvent<MessageEvent>(executionContext.worker, 'message');

      executionContext.eval(`
var materialNames = model.materials.map(function (material) {
  return material.name;
});

self.postMessage(JSON.stringify(materialNames));
      `);

      const messageEvent = await messageEventArrives;
      const materialNames = JSON.parse(messageEvent.data);

      expect(materialNames).to.be.deep.equal([
        'Material0',
        'Material1',
        'Material2',
      ]);
    });
  });
});
