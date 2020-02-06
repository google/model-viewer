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

import {BufferGeometry} from 'three/src/core/BufferGeometry.js';
import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial.js';
import {Color} from 'three/src/math/Color.js';
import {Mesh} from 'three/src/objects/Mesh.js';

import {ThreeDOMExecutionContext} from './context.js';
import {ModelGraft} from './facade/three-js/model-graft.js';
import {createFakeGLTF, waitForEvent} from './test-helpers.js';

suite('end-to-end', () => {
  test('can operate on a scene graph via a custom script in a worker', async () => {
    const gltf = createFakeGLTF();

    const material = new MeshStandardMaterial();
    material.color = new Color('rgba(255, 0, 0)');
    const mesh = new Mesh(new BufferGeometry(), material);

    gltf.scene.add(mesh);

    const executionContext =
        new ThreeDOMExecutionContext(['material-properties']);
    const graft = new ModelGraft('', gltf);

    executionContext.changeModel(graft);

    executionContext.eval(
        'model.materials[0].pbrMetallicRoughness.setBaseColorFactor([0, 0, 1])');

    await waitForEvent(graft, 'mutation');

    expect(material.color.r).to.be.equal(0);
    expect(material.color.b).to.be.equal(1);
  });
});
