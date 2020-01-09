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

import {interpolate, sequence, timeline} from '../../utilities/animation.js';

const expect = chai.expect;
const easeLinear = (t: number) => t;
const PRECISION = 0.000001;

suite('animation', () => {
  suite('interpolate', () => {
    test('interpolates from start to end values', () => {
      const timingForward = interpolate(0, 100, easeLinear);
      const timingBackward = interpolate(100, 0, easeLinear);

      for (let i = 0; i < 10; ++i) {
        expect(timingForward(i / 10)).to.be.equal(i * 10);
        expect(timingBackward(i / 10)).to.be.equal(100 - i * 10);
      }
    });
  });

  suite('sequence', () => {
    test('interpolates across a sequence of timing functions', () => {
      const timingForward = interpolate(0, 100, easeLinear);
      const timingBackward = interpolate(100, 0, easeLinear);

      const forwardBackward = sequence([timingForward, timingBackward], [1, 1]);

      for (let i = 0; i < 10; ++i) {
        expect(forwardBackward(i / 10))
            .to.be.closeTo(i < 5 ? i * 20 : 100 - (i - 5) * 20, PRECISION);
      }
    });

    test('allows for timing functions to be relatively weighted', () => {
      const timingForward = interpolate(0, 100, easeLinear);
      const timingBackward = interpolate(90, 0, easeLinear);

      const forwardBackward = sequence([timingForward, timingBackward], [1, 9]);

      for (let i = 0; i < 10; ++i) {
        expect(forwardBackward(i / 10))
            .to.be.closeTo(i < 2 ? i * 100 : (10 - i) * 10, PRECISION)
      }
    });
  });

  suite('timeline', () => {
    test('creates a timing function sequence from keyframes', () => {
      const forwardBackward = timeline(0, [
        {frames: 5, value: 100, ease: easeLinear},
        {frames: 5, value: 0, ease: easeLinear}
      ]);
      for (let i = 0; i < 10; ++i) {
        for (let i = 0; i < 10; ++i) {
          expect(forwardBackward(i / 10))
              .to.be.closeTo(i < 5 ? i * 20 : 100 - (i - 5) * 20, PRECISION);
        }
      }
    });
  });
});