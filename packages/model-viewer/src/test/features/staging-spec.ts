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

import {AUTO_ROTATE_DELAY_DEFAULT, StagingMixin} from '../../features/staging.js';
import ModelViewerElementBase from '../../model-viewer-base.js';
import {KeyCode} from '../../three-components/SmoothControls.js';
import {assetPath, dispatchSyntheticEvent, rafPasses, timePasses, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;

const ODD_SHAPE_GLB_PATH = assetPath('models/odd-shape.glb');

suite('ModelViewerElementBase with StagingMixin', () => {
  let nextId = 0;
  let tagName: string;
  let ModelViewerElement: any;
  let element: any;

  setup(() => {
    tagName = `model-viewer-staging-${nextId++}`;
    ModelViewerElement = class extends StagingMixin
    (ModelViewerElementBase) {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);
  });

  BasicSpecTemplate(() => ModelViewerElement, () => tagName);

  suite('with a loaded model', () => {
    setup(async () => {
      element = new ModelViewerElement();
      element.src = ODD_SHAPE_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);

      await waitForEvent(element, 'load');
      await rafPasses();
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    suite.only('auto-rotate', () => {
      setup(async () => {
        element.autoRotate = true;
        element.autoRotateDelay = 50;
        await timePasses();
        console.log('after setup');
      });

      test('causes the model to rotate after a delay', async () => {
        const {turntableRotation} = element;
        await rafPasses();
        expect(element.turntableRotation).to.be.equal(turntableRotation);
        await timePasses(AUTO_ROTATE_DELAY_DEFAULT);
        await rafPasses();
        expect(element.turntableRotation).to.be.greaterThan(turntableRotation);
      });

      test(
          'retains turntable rotation when auto-rotate is toggled',
          async () => {
            element.autoRotateDelay = 0;
            console.log('after delay = 0');
            await timePasses();
            console.log('after macrotask');
            await rafPasses();
            console.log('after raf');

            const {turntableRotation} = element;

            expect(turntableRotation).to.be.greaterThan(0);

            element.autoRotate = false;

            await rafPasses();

            expect(element.turntableRotation).to.be.equal(turntableRotation);

            element.autoRotate = true;

            await rafPasses();

            expect(element.turntableRotation)
                .to.be.greaterThan(turntableRotation);
          });

      test('pauses rotate after user interaction', async () => {
        const {turntableRotation: initialTurntableRotation} = element;

        dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});

        await rafPasses();

        expect(element.turntableRotation).to.be.equal(initialTurntableRotation);

        await timePasses(AUTO_ROTATE_DELAY_DEFAULT);
        await rafPasses();

        expect(element.turntableRotation)
            .to.be.greaterThan(initialTurntableRotation);
      });

      suite('when the model is not visible', () => {
        setup(() => {
          Object.defineProperty(element, 'modelIsVisible', {value: false});
        });

        test('does not cause the model to rotate over time', async () => {
          const {turntableRotation} = element;

          await timePasses(AUTO_ROTATE_DELAY_DEFAULT);
          await rafPasses();

          expect(element.turntableRotation).to.be.equal(turntableRotation);
        });
      });

      suite('with zero auto-rotate-delay', () => {
        setup(async () => {
          element.autoRotateDelay = 0;
          await timePasses();
          await rafPasses();
        });

        test('causes the model to rotate ASAP', async () => {
          const {turntableRotation} = element;
          await rafPasses();
          expect(element.turntableRotation)
              .to.be.greaterThan(turntableRotation);
        });
      });
    });
  });
});
