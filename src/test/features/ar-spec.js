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

import {IS_IOS} from '../../constants.js';
import {$enterARElement, ARMixin} from '../../features/ar.js';
import ModelViewerElementBase, {$canvas} from '../../model-viewer-element-base.js';
import {pickShadowDescendant, timePasses, waitForEvent} from '../helpers.js';

const expect = chai.expect;

suite('ModelViewerElementBase with ARMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName;
    let ModelViewerElement;

    setup(() => {
      tagName = `model-viewer-ar-${nextId++}`;
      ModelViewerElement = class extends ARMixin
      (ModelViewerElementBase) {
        static get is() {
          return tagName;
        }
      };
      customElements.define(tagName, ModelViewerElement);
    });

    test('can be directly instantiated', () => {
      const element = new ModelViewerElement();
      expect(element).to.be.ok;
    });

    test('can be instantiated with document.createElement', () => {
      const element = document.createElement(tagName);
      expect(element).to.be.ok;
    });

    suite('with unstable-webxr', () => {
      let element;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.appendChild(element);

        element.unstableWebxr = true;
        element.src = './examples/assets/Astronaut.glb';

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        element.remove();
      });

      test('hides the AR button if not on AR platform', () => {
        expect(element.canActivateAR).to.be.equal(false);
      });

      test('shows the AR button if on AR platform');
    });

    suite('ios-src', () => {
      let element;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.appendChild(element);

        element.src = './examples/assets/Astronaut.glb';

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        element.remove();
      });

      if (IS_IOS) {
        suite('on iOS Safari', () => {
          test('hides the AR button', () => {
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

          suite('with an ios-src', () => {
            setup(async () => {
              element.iosSrc = './examples/assets/Astronaut.usdz';
              await timePasses();
            });

            test('still hides the AR button', () => {
              expect(element.canActivateAR).to.be.equal(false);
            });
          });
        });
      }
    });
  });
});
