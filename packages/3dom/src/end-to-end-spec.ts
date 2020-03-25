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

import {ThreeDOMExecutionContext} from './context.js';
import {correlateSceneGraphs} from './facade/three-js/correlated-scene-graph.js';
import {ModelGraft} from './facade/three-js/model-graft.js';
import {assetPath, loadThreeGLTF, waitForEvent} from './test-helpers.js';

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');

suite('end-to-end', () => {
  test('can operate on a scene graph via a custom script in a worker', async () => {
    const gltf = await loadThreeGLTF(ASTRONAUT_GLB_PATH);

    // Note that this lookup is specific to the Astronaut model and will need
    // to be adapted in case the model changes:
    const material =
        ((gltf.scene.children[0] as Object3D).children[0] as Mesh).material as
        MeshStandardMaterial;

    const executionContext =
        new ThreeDOMExecutionContext(['material-properties']);
    const graft = new ModelGraft('', await correlateSceneGraphs(gltf));

    executionContext.changeModel(graft);

    executionContext.eval(
        'model.materials[0].pbrMetallicRoughness.setBaseColorFactor([0, 0, 1])');

    await waitForEvent(graft, 'mutation');

    expect(material.color.r).to.be.equal(0);
    expect(material.color.b).to.be.equal(1);
  });

  test('can operate on the artifact of a Three.js GLTFLoader', async () => {
    const gltf = await loadThreeGLTF(ASTRONAUT_GLB_PATH);

    const material = (gltf.scene.children[0]!.children[0] as Mesh).material as
        MeshStandardMaterial;
    const graft =
        new ModelGraft(ASTRONAUT_GLB_PATH, await correlateSceneGraphs(gltf));

    const executionContext =
        new ThreeDOMExecutionContext(['material-properties']);
    executionContext.changeModel(graft);

    executionContext.eval(
        'model.materials[0].pbrMetallicRoughness.setBaseColorFactor([0, 0, 1])');

    await waitForEvent(graft, 'mutation');

    expect(material.color.r).to.be.equal(0);
    expect(material.color.b).to.be.equal(1);
  });

  test('expresses the name of a material in the worklet context', async () => {
    const gltf = await loadThreeGLTF(ASTRONAUT_GLB_PATH);

    const material = (gltf.scene.children[0]!.children[0] as Mesh).material as
        MeshStandardMaterial;
    const graft =
        new ModelGraft(ASTRONAUT_GLB_PATH, await correlateSceneGraphs(gltf));

    const executionContext =
        new ThreeDOMExecutionContext(['messaging', 'material-properties']);
    executionContext.changeModel(graft);

    const messageEventArrives =
        waitForEvent<MessageEvent>(executionContext.worker, 'message');
    executionContext.eval('self.postMessage(model.materials[0].name)');

    const messageEvent = await messageEventArrives;

    expect(messageEvent.data).to.be.ok;
    expect(messageEvent.data).to.not.be.equal('');
    expect(messageEvent.data).to.be.equal(material.name);
  });
});
