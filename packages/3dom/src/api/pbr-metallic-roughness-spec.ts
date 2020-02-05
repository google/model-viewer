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
import {FakeModelKernel} from '../test-helpers.js';

import {definePBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {defineThreeDOMElement} from './three-dom-element.js';

const ThreeDOMElement = defineThreeDOMElement();

suite('api/pbr-metallic-roughness', () => {
  suite('definePBRMetallicRoughness', () => {
    test('yields a valid constructor', () => {
      const GeneratedConstructor = definePBRMetallicRoughness(ThreeDOMElement);
      const instance = new GeneratedConstructor(
          new FakeModelKernel(), {id: 0, baseColorFactor: [0, 0, 0, 1]});

      expect(instance).to.be.ok;
    });

    test('produces elements with the correct owner model', () => {
      const kernel = new FakeModelKernel();
      const GeneratedConstructor = definePBRMetallicRoughness(ThreeDOMElement);
      const instance = new GeneratedConstructor(
          kernel, {id: 0, baseColorFactor: [0, 0, 0, 1]});

      expect(instance.ownerModel).to.be.equal(kernel.model);
    });

    suite('PBRMetallicRoughness', () => {
      test('is configured with the serialized base color factor', () => {
        const GeneratedConstructor =
            definePBRMetallicRoughness(ThreeDOMElement);
        const baseColorFactor: RGBA =
            [Math.random(), Math.random(), Math.random(), Math.random()];
        const instance = new GeneratedConstructor(
            new FakeModelKernel(), {id: 0, baseColorFactor});

        expect(instance.baseColorFactor).to.be.deep.equal(baseColorFactor);
      });
    });
  });
});
