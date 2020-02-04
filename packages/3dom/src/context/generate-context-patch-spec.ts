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

import {generateContextPatch} from './generate-context-patch.js'

const invokeInFakeContext = (code: string, self: any) => {
  return new Function('self', code)(self);
};

interface FakeGlobalInterface extends EventTarget {
  foo: string;
  bar: string;
  baz(): string;
}

suite('context/generate-context-patch', () => {
  suite('generateContextPatch', () => {
    test('yields a string of JS that can be evaluated', () => {
      const implementationString = generateContextPatch({});
      expect(implementationString.length).to.be.greaterThan(0);
      const fn = new Function(implementationString);
      expect(fn).to.be.ok;
    });

    suite('allowing globals', () => {
      let fakeGlobal: FakeGlobalInterface;

      setup(() => {
        // Note: we stop deleting when we reach the EventTarget level of the
        // prototype chain, so inherit from it here to establish the deletion
        // boundary:
        class FakeGlobal extends EventTarget {
          foo = 'foo';
          bar = 'bar';
          baz() {
            return 'baz'
          }
        }

        fakeGlobal = new FakeGlobal();
      });

      test('deletes all globals by default', () => {
        const implementationString = generateContextPatch({});
        invokeInFakeContext(implementationString, fakeGlobal);
        expect(fakeGlobal).to.be.deep.equal(EventTarget.prototype);
      });

      test('retains explicitly allowed globals', () => {
        const implementationString = generateContextPatch({foo: true});
        invokeInFakeContext(implementationString, fakeGlobal);
        expect(fakeGlobal.foo).to.be.equal('foo');
        expect(fakeGlobal.bar).to.be.undefined;
      });
    });
  });
});