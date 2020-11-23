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

import {CameraChangeDetails} from '../../features/controls.js';
import {StagingMixin} from '../../features/staging.js';
import ModelViewerElementBase from '../../model-viewer-base.js';
import {ChangeSource} from '../../three-components/SmoothControls.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, rafPasses} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;

const ODD_SHAPE_GLB_PATH = assetPath('models/odd-shape.glb');
const AUTO_ROTATE_DELAY = 50;

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

  suite('with a visible loaded model', () => {
    setup(async () => {
      element = new ModelViewerElement();
      element.src = ODD_SHAPE_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);

      await waitForEvent(element, 'load');
      Object.defineProperty(
          element, 'modelIsVisible', {value: true, writable: true});
      await rafPasses();
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('can manually rotate turntable', () => {
      element.resetTurntableRotation(3);
      expect(element.turntableRotation).to.be.equal(3);

      element.resetTurntableRotation();
      expect(element.turntableRotation).to.be.equal(0);
    });

    suite('auto-rotate', () => {
      setup(async () => {
        element.autoRotate = true;
        element.autoRotateDelay = AUTO_ROTATE_DELAY;
        await timePasses();
      });

      test('causes the model to rotate after a delay', async () => {
        const {turntableRotation} = element;
        await rafPasses();
        expect(element.turntableRotation).to.be.equal(turntableRotation);
        await timePasses(AUTO_ROTATE_DELAY);
        await rafPasses();
        expect(element.turntableRotation).to.be.greaterThan(turntableRotation);
      });

      // TODO(#1205)
      test.skip(
          'retains turntable rotation when auto-rotate is toggled',
          async () => {
            element.autoRotateDelay = 0;
            await timePasses();
            await rafPasses();

            const {turntableRotation} = element;

            expect(turntableRotation).to.be.greaterThan(0);

            element.autoRotate = false;
            await timePasses();
            await rafPasses();

            expect(element.turntableRotation).to.be.equal(turntableRotation);

            element.autoRotate = true;
            await timePasses();
            await rafPasses();

            expect(element.turntableRotation)
                .to.be.greaterThan(turntableRotation);
          });

      // TODO(#1206)
      test.skip('pauses rotate after user interaction', async () => {
        const {turntableRotation} = element;
        await timePasses(AUTO_ROTATE_DELAY);
        await rafPasses();

        const {turntableRotation: initialTurntableRotation} = element;
        expect(initialTurntableRotation).to.be.greaterThan(turntableRotation);

        element.dispatchEvent(new CustomEvent<CameraChangeDetails>(
            'camera-change',
            {detail: {source: ChangeSource.USER_INTERACTION}}));
        await timePasses();

        await rafPasses();

        expect(element.turntableRotation).to.be.equal(initialTurntableRotation);

        await timePasses(AUTO_ROTATE_DELAY);
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

          await timePasses(AUTO_ROTATE_DELAY);
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
