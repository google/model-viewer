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

import {$controls, $promptElement, ControlsMixin, DEFAULT_INTERACTION_PROMPT_THRESHOLD, INTERACTION_PROMPT} from '../../features/controls.js';
import ModelViewerElementBase, {$scene, $onUserModelOrbit} from '../../model-viewer-base.js';
import {FRAMED_HEIGHT} from '../../three-components/ModelScene.js';
import {assetPath, dispatchSyntheticEvent, rafPasses, timePasses, until, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';
import {settleControls} from '../three-components/SmoothControls-spec.js';

const expect = chai.expect;

const interactWith = (element) => {
  dispatchSyntheticEvent(element, 'mousedown', {clientX: 0, clientY: 10});
  dispatchSyntheticEvent(element, 'mousemove', {clientX: 0, clientY: 0});
};

const expectSphericalsToBeEqual = (sphericalOne, sphericalTwo) => {
  const precision = 5;

  expect(sphericalOne.theta.toFixed(precision))
      .to.be.equal(
          sphericalTwo.theta.toFixed(precision),
          'Spherical theta does not match');

  expect(sphericalOne.phi.toFixed(precision))
      .to.be.equal(
          sphericalTwo.phi.toFixed(precision), 'Spherical phi does not match');

  expect(sphericalOne.radius.toFixed(precision))
      .to.be.equal(
          sphericalTwo.radius.toFixed(precision),
          'Spherical radius does not match');
};

suite('ModelViewerElementBase with ControlsMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName;
    let ModelViewerElement;

    setup(() => {
      tagName = `model-viewer-controls-${nextId++}`;
      ModelViewerElement = class extends ControlsMixin
      (ModelViewerElementBase) {
        static get is() {
          return tagName;
        }
      };
      customElements.define(tagName, ModelViewerElement);
    });

    BasicSpecTemplate(() => ModelViewerElement, () => tagName);

    suite('camera-orbit', () => {
      let element;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.appendChild(element);
        element.src = assetPath('cube.gltf');

        await waitForEvent(element, 'load');
        // NOTE(cdata): Sometimes the load event dispatches quickly enough to
        // cause a race condition where property change occurs _after_ load.
        // In this condition, it is possible for the controls to be "unsettled"
        // by the time that the test begins. Awaiting for a microtask ensures
        // that we always have time for one internal property change in the
        // element:
        await timePasses();

        settleControls(element[$controls]);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('defaults radius to ideal camera distance', () => {
        const scene = element[$scene];

        expect(element.getCameraOrbit().radius * FRAMED_HEIGHT)
            .to.be.equal(scene.idealCameraDistance);
      });

      test('can independently adjust azimuth', async () => {
        const orbit = element.getCameraOrbit();
        const nextTheta = orbit.theta + 1.0;

        element.cameraOrbit =
            `${nextTheta}rad ${orbit.phi}rad ${orbit.radius}m`;

        await timePasses();

        settleControls(element[$controls]);

        expectSphericalsToBeEqual(
            element.getCameraOrbit(), {...orbit, theta: nextTheta});
      });

      test('can independently adjust inclination', async () => {
        const orbit = element.getCameraOrbit();
        const nextPhi = orbit.phi + 1.0;

        element.cameraOrbit =
            `${orbit.theta}rad ${nextPhi}rad ${orbit.radius}m`;

        await timePasses();

        settleControls(element[$controls]);

        expectSphericalsToBeEqual(
            element.getCameraOrbit(), {...orbit, phi: nextPhi});
      });

      test('can independently adjust radius', async () => {
        const orbit = element.getCameraOrbit();
        const nextRadius = orbit.radius - 1.0;

        element.cameraOrbit =
            `${orbit.theta}rad ${orbit.phi}rad ${nextRadius}m`;

        await timePasses();

        settleControls(element[$controls]);

        expectSphericalsToBeEqual(
            element.getCameraOrbit(), {...orbit, radius: nextRadius});
      });

      suite('getCameraOrbit', () => {
        setup(async () => {
          element.cameraOrbit = `1rad 1rad 1.5m`;
          await timePasses();
          settleControls(element[$controls]);
        });

        // NOTE(cdata): Flakey test is flakey
        test.skip('starts at the initially configured orbit', () => {
          const orbit = element.getCameraOrbit();

          expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
              .to.be.equal(element.cameraOrbit);
        });

        test('updates with current orbit after interaction', async () => {
          const controls = element[$controls];
          controls.adjustOrbit(0, 0.5, 0);
          settleControls(controls);

          const orbit = element.getCameraOrbit();
          expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
              .to.equal(`1rad 0.5rad 1.5m`);
        });
      });
    });

    suite('camera-controls', () => {
      let element;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.appendChild(element);
        element.src = assetPath('cube.gltf');
        element.cameraControls = true;

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        element.cameraControls = false;
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('creates SmoothControls if enabled', () => {
        expect(element[$controls]).to.be.ok;
      });

      test('sets max radius to the camera framed distance', () => {
        const cameraDistance = element[$scene].camera.position.distanceTo(
            element[$scene].model.position);
        expect(element[$controls].options.maximumRadius)
            .to.be.equal(cameraDistance);
      });

      test('disables interaction if disabled after enabled', async () => {
        element.cameraControls = false;
        await timePasses();
        expect(element[$controls].interactionEnabled).to.be.false;
      });

      suite('a11y', () => {
        setup(async () => {
          element.alt = 'A 3D model of a cube';
          element.cameraOrbit = '0 90deg auto';
          await rafPasses();
        });

        test(
            'has initial aria-label set to alt before interaction',
            async () => {
              const {canvas} = element[$scene];

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal(element.alt);
            });

        test('prompts user to interact when focused', async () => {
          const {canvas} = element[$scene];
          const promptElement = element[$promptElement];
          const controls = element[$controls];

          settleControls(controls);

          // NOTE(cdata): This wait time was added in order to deflake tests on
          // iOS Simulator and Android Emulator on Sauce Labs. These same test
          // targets were tested manually locally and manually on Sauce, and do
          // not fail. Only automated Sauce tests seem to fail consistently
          // without this additional wait time:
          await rafPasses();

          canvas.focus();

          await until(
              () => canvas.getAttribute('aria-label') === INTERACTION_PROMPT);

          expect(promptElement.classList.contains('visible')).to.be.equal(true);
        });

        test(
            'does not prompt users to interact before a model is loaded',
            async () => {
              Object.defineProperty(
                  element, 'loaded', {value: false, configurable: true});

              element.interactionPromptThreshold = 500;

              const {canvas} = element[$scene];
              const promptElement = element[$promptElement];
              const controls = element[$controls];

              settleControls(controls);

              await rafPasses();

              canvas.focus();

              await timePasses(element.interactionPromptThreshold + 100);

              expect(promptElement.classList.contains('visible'))
                  .to.be.equal(false);

              Object.defineProperty(
                  element, 'loaded', {value: true, configurable: true});

              await timePasses(element.interactionPromptThreshold + 100);

              expect(promptElement.classList.contains('visible'))
                  .to.be.equal(true);
            });

        test('does not prompt if user already interacted', async () => {
          const {canvas} = element[$scene];
          const promptElement = element[$promptElement];
          const originalLabel = canvas.getAttribute('aria-label');

          expect(originalLabel).to.not.be.equal(INTERACTION_PROMPT);

          canvas.focus();

          await timePasses(DEFAULT_INTERACTION_PROMPT_THRESHOLD / 2.0);

          interactWith(canvas);

          await timePasses(DEFAULT_INTERACTION_PROMPT_THRESHOLD + 100);

          expect(canvas.getAttribute('aria-label'))
              .to.not.be.equal(INTERACTION_PROMPT);
          expect(promptElement.classList.contains('visible'))
              .to.be.equal(false);
        });

        test(
            'announces camera orientation when orbiting horizontally',
            async () => {
              const {canvas} = element[$scene];
              const controls = element[$controls];

              await rafPasses();
              canvas.focus();

              controls.setOrbit(-Math.PI / 2.0);
              settleControls(controls);

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal('View from stage left');

              controls.setOrbit(Math.PI / 2.0);
              settleControls(controls);

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal('View from stage right');

              controls.adjustOrbit(-Math.PI / 2.0, 0, 0);
              settleControls(controls);

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal('View from stage back');

              controls.adjustOrbit(Math.PI, 0, 0);
              settleControls(controls);

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal('View from stage front');
            });

        test(
            'announces camera orientation when orbiting vertically',
            async () => {
              const {canvas} = element[$scene];
              const controls = element[$controls];

              await rafPasses();
              canvas.focus();

              settleControls(controls);

              controls.setOrbit(0, 0);
              settleControls(controls);

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal('View from stage upper-front');

              controls.adjustOrbit(0, -Math.PI / 2.0, 0);
              settleControls(controls);

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal('View from stage front');

              controls.adjustOrbit(0, -Math.PI / 2.0, 0);
              settleControls(controls);

              expect(canvas.getAttribute('aria-label'))
                  .to.be.equal('View from stage lower-front');
            });
      });

    });
  });
});
