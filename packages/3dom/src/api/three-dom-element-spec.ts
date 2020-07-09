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

import {ThreeDOMElement} from './three-dom-element.js';

suite('api/three-dom-element', () => {
  suite('defineThreeDOMElement', () => {
    test('yields a valid constructor', () => {
      const instance = new ThreeDOMElement(new FakeModelKernel());

      expect(instance).to.be.ok;
    });

    test('produces elements with the correct owner model', () => {
      const kernel = new FakeModelKernel();
      const instance = new ThreeDOMElement(kernel);

      expect(instance.ownerModel).to.be.equal(kernel.model);
    });
  });
});
