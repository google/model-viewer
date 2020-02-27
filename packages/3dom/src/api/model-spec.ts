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

import {FakeModelKernel} from '../test-helpers.js';

import {defineModel} from './model.js';
import {defineThreeDOMElement} from './three-dom-element.js';

const ThreeDOMElement = defineThreeDOMElement();

suite('api/model', () => {
  suite('defineModel', () => {
    test('yields a valid constructor', () => {
      const GeneratedConstructor = defineModel(ThreeDOMElement);
      const instance = new GeneratedConstructor(
          new FakeModelKernel(), {id: 0, modelUri: '', materials: []});

      expect(instance).to.be.ok;
    });

    test('produces elements with an undefined owner model', () => {
      const kernel = new FakeModelKernel();
      const GeneratedConstructor = defineModel(ThreeDOMElement);
      const instance = new GeneratedConstructor(
          kernel, {id: 0, modelUri: '', materials: []});

      expect(instance.ownerModel).to.be.undefined;
    });
  });
});
