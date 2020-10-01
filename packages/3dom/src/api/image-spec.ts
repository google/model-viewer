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
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or impliedv
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {FakeModelKernel} from '../test-helpers.js';

import {Image} from './image.js';

suite('api/image', () => {
  suite('defineImage', () => {
    test('yields a valid constructor', () => {
      const instance = new Image(new FakeModelKernel(), {
        uri: 'http://example.com',
        id: 0,
      });

      expect(instance).to.be.ok;
    });

    suite('the generated class', () => {
      let kernel: FakeModelKernel;

      setup(() => {
        kernel = new FakeModelKernel();
      });

      test('produces elements with the correct owner model', () => {
        const instance = new Image(kernel, {
          uri: 'http://example.com',
          id: 0,
        });

        expect(instance.ownerModel).to.be.equal(kernel.model);
      });

      test('expresses the image name when available', () => {
        const instance = new Image(kernel, {id: 0, name: 'foo'});

        expect(instance.name).to.be.equal('foo');
      });

      test('expresses the image uri when available', () => {
        const instance = new Image(kernel, {
          id: 0,
          uri: 'http://example.com',
        });

        expect(instance.uri).to.be.equal('http://example.com');
      });

      test('is external if a uri is available', () => {
        const instance = new Image(kernel, {
          id: 0,
          uri: 'http://example.com',
        });

        expect(instance.type).to.be.equal('external');
      });

      test('is embedded if no uri is available', () => {
        const instance = new Image(kernel, {
          id: 0,
        });

        expect(instance.type).to.be.equal('embedded');
      });
    });
  });
});
