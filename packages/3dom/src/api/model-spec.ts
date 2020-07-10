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

import {Model} from './model.js';

suite('api/model', () => {
  suite('defineModel', () => {
    test('yields a valid constructor', () => {
      const instance = new Model(
          new FakeModelKernel(), {id: 0, modelUri: '', materials: []});

      expect(instance).to.be.ok;
    });

    test('produces elements with self-referencing owner model', () => {
      const kernel = new FakeModelKernel();
      const instance = new Model(kernel, {id: 0, modelUri: '', materials: []});

      expect(instance.ownerModel).to.be.eq(instance);
    });
  });
});
