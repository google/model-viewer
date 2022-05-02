/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import {property} from 'lit/decorators.js';
import {ReactiveElement} from 'lit';

import {style} from '../decorators.js';
import {numberNode} from '../styles/parsers.js';
import {timePasses} from '../utilities.js';

const expect = chai.expect;

const $updateFoo = Symbol('updateFoo');

const fooIntrinsics = {
  basis: [numberNode(1, 'm'), numberNode(Math.PI, 'rad')],
  keywords: {auto: [null, numberNode(200, '%')]}
};

class StyleableElement extends ReactiveElement {
  @style({intrinsics: fooIntrinsics, updateHandler: $updateFoo})
  @property({type: String})
  foo: string = '200cm 1rad';

  fooUpdates: Array<[number, number]> = [];

  [$updateFoo](style: [number, number]) {
    this.fooUpdates.push(style);
  }
}

suite('decorators', () => {
  suite('@style', () => {
    let instance = 0;
    let tagName: string;
    let element: StyleableElement;

    setup(async () => {
      tagName = `styleable-element-${instance++}`;
      customElements.define(tagName, class extends StyleableElement {});

      element = document.createElement(tagName) as StyleableElement;
      document.body.insertBefore(element, document.body.firstChild);

      await timePasses();
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('invokes the update handler with the parsed default value', () => {
      expect(element.fooUpdates).to.be.eql([[2, 1]]);
    });

    test(
        'invokes the update handler once with a parsed updated value',
        async () => {
          element.foo = '1m auto';
          await timePasses();
          expect(element.fooUpdates).to.be.eql([[2, 1], [1, 2 * Math.PI]]);
        });
  });
});