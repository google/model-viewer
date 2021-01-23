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

import {clamp, deserializeUrl, resolveDpr, step} from '../utilities.js';

const expect = chai.expect;

suite('utils', () => {
  suite('deserializeUrl', () => {
    test('returns a string given a string', () => {
      expect(deserializeUrl('foo')).to.be.a('string');
    });

    test('returns null given a null-ish value', () => {
      expect(deserializeUrl(null)).to.be.equal(null);
    });

    test('yields a url on the same origin for relative paths', () => {
      const {origin} = window.location;

      expect(deserializeUrl('foo')!.indexOf(origin)).to.be.equal(0);
    });
  });

  suite('resolveDpr', () => {
    suite('when <meta name="viewport"> is present', () => {
      test('resolves the device pixel ratio', () => {
        const resolvedDpr = resolveDpr();
        // NOTE(cdata): The main test frame is assumed to have a
        // <meta name="viewport">. If this changes, it is probably by
        // accident.
        const actualDpr = self.devicePixelRatio;

        expect(resolvedDpr).to.be.equal(actualDpr);
      });
    });

    suite('when <meta name="viewport"> is not present', () => {
      test.skip(
          'caps the device pixel ratio to 1',
          () => {
              // There is not a good way to test this given the current
              // factoring and bundling constraints
              // TODO:
              // https://github.com/google/model-viewer/issues/262
          });
    });
  });

  suite('step', () => {
    test('returns 0 for values below edge', () => {
      expect(step(0.5, 0.1)).to.be.equal(0);
    });

    test('returns 1 for values above edge', () => {
      expect(step(0.5, 0.9)).to.be.equal(1);
    });
  });

  suite('clamp', () => {
    test('numbers below lower limit adjusted to lower limit', () => {
      expect(clamp(1.0, 2.0, 3.0)).to.be.equal(2.0);
    });

    test('numbers above upper limit adjusted to upper limit', () => {
      expect(clamp(4.0, 2.0, 3.0)).to.be.equal(3.0);
    });

    test('numbers within lower and upper limits unchanged', () => {
      expect(clamp(2.5, 2.0, 3.0)).to.be.equal(2.5);
    });
  });
});
