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

import {RGBA} from '../api.js';
import {FakeMaterial, FakeModel, FakePBRMetallicRoughness} from '../test-helpers.js';
import {getLocallyUniqueId} from '../utilities.js';

import {defineModelKernel, ModelKernel, ModelKernelConstructor} from './model-kernel.js';

suite('api/model-kernel', () => {
  suite('defineModelKernel', () => {
    let ModelKernel: ModelKernelConstructor;
    setup(() => {
      ModelKernel =
          defineModelKernel(FakeModel, FakeMaterial, FakePBRMetallicRoughness);
    });

    suite('ModelKernel', () => {
      test('deserializes a sparse, serialized model', () => {
        const channel = new MessageChannel();

        const kernel = new ModelKernel(
            channel.port1,
            {materials: [], modelUri: '', id: getLocallyUniqueId()});

        expect(kernel.model).to.be.ok;
        expect(kernel.model.materials).to.be.ok;
        expect(kernel.model.materials.length).to.be.equal(0);

        kernel.deactivate();
      });

      suite('with a Model cntaining a Material', () => {
        let kernel: ModelKernel;

        setup(() => {
          const channel = new MessageChannel();
          kernel = new ModelKernel(channel.port1, {
            id: getLocallyUniqueId(),
            materials: [{
              id: getLocallyUniqueId(),
              pbrMetallicRoughness: {
                id: getLocallyUniqueId(),
                baseColorFactor: [0, 0, 0, 1] as RGBA
              }
            }],
            modelUri: ''
          });
        });

        teardown(() => {
          kernel.deactivate();
        });

        test('creates a corresponding deserialized material', () => {
          expect(kernel.model.materials.length).to.be.equal(1);
          expect(kernel.model.materials[0]).to.be.ok;
          expect(kernel.model.materials[0].pbrMetallicRoughness).to.be.ok;
        });
      });
    });
  });
});
