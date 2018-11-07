/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {$enterARElement, ARMixin} from '../../features/ar.js';
import {IS_IOS} from '../../utils.js';
import XRModelElementBase, {$canvas} from '../../xr-model-element-base.js';
import {pickShadowDescendant, timePasses, waitForEvent} from '../helpers.js';

const expect = chai.expect;

suite('XRModelElementBase with ARMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName;
    let XRModelElement;

    setup(() => {
      tagName = `xr-model-ar-${nextId++}`;
      XRModelElement = ARMixin(XRModelElementBase);
      customElements.define(tagName, XRModelElement);
    });

    test('can be directly instantiated', () => {
      const element = new XRModelElement();
      expect(element).to.be.ok;
    });

    test('can be instantiated with document.createElement', () => {
      const element = document.createElement(tagName);
      expect(element).to.be.ok;
    });

    suite('ar', () => {
      let element;

      setup(async () => {
        element = new XRModelElement();
        document.body.appendChild(element);

        element.ar = true;
        element.src = './examples/assets/Astronaut.glb';

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        element.remove();
      });

      if (IS_IOS) {
        suite('on iOS Safari', () => {
          test('does not show the AR button', () => {
            expect(element.canActivateAR).to.be.equal(false);
          });

          suite('with an ios-src', () => {
            setup(async () => {
              element.iosSrc = './examples/assets/Astronaut.usdz';
              await timePasses();
            });

            test('shows the AR button', () => {
              expect(element.canActivateAR).to.be.equal(true);
            });
          });
        });
      } else {
        suite('on browsers that are not iOS Safari', () => {
          test('hides the AR button', () => {
            expect(element.canActivateAR).to.be.equal(false);
          });
        });
      }
    });
  });
});
