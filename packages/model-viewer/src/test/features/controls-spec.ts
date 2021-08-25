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

import {Camera, Vector3} from 'three';
import {IS_IOS} from '../../constants.js';

import {$controls, $promptAnimatedContainer, $promptElement, CameraChangeDetails, cameraOrbitIntrinsics, ControlsInterface, ControlsMixin, INTERACTION_PROMPT, SphericalPosition} from '../../features/controls.js';
import ModelViewerElementBase, {$canvas, $scene, $userInputElement, Vector3D} from '../../model-viewer-base.js';
import {StyleEvaluator} from '../../styles/evaluators.js';
import {ChangeSource, SmoothControls} from '../../three-components/SmoothControls.js';
import {Constructor, step, timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, dispatchSyntheticEvent, rafPasses, until} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';
import {settleControls} from '../three-components/SmoothControls-spec.js';

const expect = chai.expect;
const DEFAULT_FOV = 45;
const DEFAULT_MIN_FOV = 25;
const DEFAULT_MAX_FOV = 45;
const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');

const interactWith = (element: HTMLElement) => {
  dispatchSyntheticEvent(element, 'mousedown', {clientX: 0, clientY: 10});
  dispatchSyntheticEvent(window, 'mousemove', {clientX: 0, clientY: 0});
};

const expectSphericalsToBeEqual =
    (sphericalOne: SphericalPosition, sphericalTwo: SphericalPosition) => {
      const precision = 5;

      expect(sphericalOne.theta.toFixed(precision))
          .to.be.equal(
              sphericalTwo.theta.toFixed(precision),
              'Spherical theta does not match');

      expect(sphericalOne.phi.toFixed(precision))
          .to.be.equal(
              sphericalTwo.phi.toFixed(precision),
              'Spherical phi does not match');

      expect(sphericalOne.radius.toFixed(precision))
          .to.be.equal(
              sphericalTwo.radius.toFixed(precision),
              'Spherical radius does not match');
    };

// NOTE(cdata): Precision is a bit off when comparing e.g., expected camera
// direction in practice:
const FLOAT_EQUALITY_THRESHOLD = 1e-6;

/**
 * Returns true if the camera is looking at a given position, within +/-
 * FLOAT_EQUALITY_THRESHOLD on each axis.
 */
const cameraIsLookingAt = (camera: Camera, position: Vector3D) => {
  const cameraDirection = camera.getWorldDirection(new Vector3());
  const expectedDirection = new Vector3(position.x, position.y, position.z)
                                .sub(camera.position)
                                .normalize();

  const deltaX = Math.abs(cameraDirection.x - expectedDirection.x);
  const deltaY = Math.abs(cameraDirection.y - expectedDirection.y);
  const deltaZ = Math.abs(cameraDirection.z - expectedDirection.z);

  return step(FLOAT_EQUALITY_THRESHOLD, deltaX) === 0 &&
      step(FLOAT_EQUALITY_THRESHOLD, deltaY) === 0 &&
      step(FLOAT_EQUALITY_THRESHOLD, deltaZ) === 0;
};


suite('ModelViewerElementBase with ControlsMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName: string;
    let ModelViewerElement:
        Constructor<ModelViewerElementBase&ControlsInterface>;

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
      let element: ModelViewerElementBase&ControlsInterface;
      let controls: SmoothControls;
      let defaultRadius: number;

      setup(async () => {
        element = new ModelViewerElement();
        controls = (element as any)[$controls];
        document.body.insertBefore(element, document.body.firstChild);
        element.src = assetPath('models/cube.gltf');

        await waitForEvent(element, 'load');

        settleControls(controls);

        const orbitIntrinsics = cameraOrbitIntrinsics(element);
        const evaluator = new StyleEvaluator([], orbitIntrinsics);

        defaultRadius = evaluator.evaluate()[2];
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('defaults radius to ideal camera distance', () => {
        expect(element.getCameraOrbit().radius).to.be.equal(defaultRadius);
      });

      test('can independently adjust azimuth', async () => {
        const orbit = element.getCameraOrbit();
        const nextTheta = orbit.theta + 1.0;

        element.cameraOrbit =
            `${nextTheta}rad ${orbit.phi}rad ${orbit.radius}m`;

        await timePasses();

        settleControls(controls);

        expectSphericalsToBeEqual(
            element.getCameraOrbit(), {...orbit, theta: nextTheta});
      });

      test('can independently adjust inclination', async () => {
        const orbit = element.getCameraOrbit();
        const nextPhi = orbit.phi + 1.0;

        element.cameraOrbit =
            `${orbit.theta}rad ${nextPhi}rad ${orbit.radius}m`;

        await timePasses();

        settleControls(controls);

        expectSphericalsToBeEqual(
            element.getCameraOrbit(), {...orbit, phi: nextPhi});
      });

      test('can independently adjust radius', async () => {
        const orbit = element.getCameraOrbit();
        const nextRadius = orbit.radius - 1.0;

        element.cameraOrbit =
            `${orbit.theta}rad ${orbit.phi}rad ${nextRadius}m`;

        await timePasses();

        settleControls(controls);

        expectSphericalsToBeEqual(
            element.getCameraOrbit(), {...orbit, radius: nextRadius});

        element.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad auto`;

        await timePasses();
        settleControls(controls);

        expect(element.getCameraOrbit().radius).to.be.equal(defaultRadius);
      });

      test('can independently adjust target', async () => {
        const target = element.getCameraTarget();
        target.x += 1;
        target.z += 1;

        element.cameraTarget = `${target.x}m auto ${target.z}m`;

        await timePasses();

        settleControls(controls);

        expect(element.getCameraTarget().toString())
            .to.be.equal(target.toString());
      });

      test('causes the camera to look at the target', () => {
        expect(cameraIsLookingAt(
                   element[$scene].camera, element.getCameraTarget()))
            .to.be.equal(true);
      });

      suite('when target is modified', () => {
        test('camera looks at the configured target', () => {
          element.cameraTarget = '3m 2m 1m';
          element.jumpCameraToGoal();

          expect(cameraIsLookingAt(
                     element[$scene].camera, element.getCameraTarget()))
              .to.be.equal(true);
        });
      });

      test('defaults FOV correctly', async () => {
        expect(element.getFieldOfView()).to.be.closeTo(DEFAULT_FOV, 0.00001);
      });

      test('defaults FOV limits correctly', async () => {
        expect(element.getMinimumFieldOfView())
            .to.be.closeTo(DEFAULT_MIN_FOV, 0.00001);
        expect(element.getMaximumFieldOfView())
            .to.be.closeTo(DEFAULT_MAX_FOV, 0.00001);
      });

      test('can independently adjust FOV', async () => {
        const fov = element.getFieldOfView();
        const nextFov = fov - 1.0;

        element.fieldOfView = `${nextFov}deg`;

        await timePasses();

        settleControls(controls);

        expect(element.getFieldOfView()).to.be.closeTo(nextFov, 0.00001);
      });

      test('changes FOV basis when aspect ratio changes', async () => {
        if (IS_IOS) {  // Flaky on iOS 13
          return;
        }
        const fov = element.getFieldOfView();
        expect(fov).to.be.closeTo(DEFAULT_MAX_FOV, .001);
        element.setAttribute('style', 'width: 200px; height: 300px');

        await until(() => element.getFieldOfView() !== fov);
        expect(element.getFieldOfView()).to.be.greaterThan(fov);
      });

      test('causes camera-change event to fire', async () => {
        const cameraChangeDispatches = waitForEvent(element, 'camera-change');
        const cameraOrbit = element.getCameraOrbit();
        element.cameraOrbit = `${cameraOrbit.theta + 1}rad ${
            cameraOrbit.phi}rad ${cameraOrbit.radius}m`;

        await cameraChangeDispatches;
      });

      test('sets an appropriate event source', async () => {
        const cameraChangeDispatches =
            waitForEvent<CustomEvent<CameraChangeDetails>>(
                element, 'camera-change');

        const cameraOrbit = element.getCameraOrbit();
        element.cameraOrbit = `${cameraOrbit.theta + 1}rad ${
            cameraOrbit.phi}rad ${cameraOrbit.radius}m`;

        const event = await cameraChangeDispatches;
        expect(event.detail.source).to.be.equal(ChangeSource.NONE);
      });


      suite('getCameraOrbit', () => {
        setup(async () => {
          element.cameraOrbit = `1rad 1rad 1.5m`;
          await timePasses();
          settleControls(controls);
        });

        test('starts at the initially configured orbit', () => {
          const orbit = element.getCameraOrbit();

          expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
              .to.be.equal(element.cameraOrbit);
        });

        test('updates with current orbit after interaction', async () => {
          controls.adjustOrbit(0, 0.5, 0);
          settleControls(controls);

          const orbit = element.getCameraOrbit();
          expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
              .to.equal(`1rad 0.5rad 1.5m`);
        });

        test('jumpCameraToGoal updates instantly', async () => {
          const cameraOrbit = `0.5rad 1.5rad 1.2m`;
          element.cameraOrbit = cameraOrbit;
          const fieldOfView = 30;
          element.fieldOfView = `${fieldOfView}deg`;
          element.jumpCameraToGoal();

          await rafPasses();

          expect(element.getFieldOfView()).to.be.closeTo(fieldOfView, 0.00001);
          let orbit = element.getCameraOrbit();
          // round to nearest 0.0001
          orbit.theta = Math.round(orbit.theta * 10000) / 10000;
          expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
              .to.equal(cameraOrbit);
        });
      });

      suite('min/max extents', () => {
        setup(async () => {
          element.cameraOrbit = `0deg 90deg 1.5m`;
          await timePasses();
          settleControls(controls);
        });

        test('defaults maxFieldOfView to ideal value', async () => {
          const scene = element[$scene];

          element.fieldOfView = '180deg';
          await timePasses();
          settleControls(controls);
          expect(element.getFieldOfView())
              .to.be.closeTo(scene.framedFieldOfView, 0.001);
        });

        test('jumps to maxCameraOrbit when outside', async () => {
          element.maxCameraOrbit = `-2rad 1rad 1m`;
          await timePasses();
          const orbit = element.getCameraOrbit();
          expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
              .to.equal(element.maxCameraOrbit);
        });

        test('jumps to minCameraOrbit when outside', async () => {
          element.minCameraOrbit = `2rad 2rad 2m`;
          await timePasses();
          const orbit = element.getCameraOrbit();
          expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
              .to.equal(element.minCameraOrbit);
        });

        test('jumps to maxFieldOfView when outside', async () => {
          element.maxFieldOfView = `30deg`;
          await timePasses();
          const fov = Math.round(element.getFieldOfView());
          expect(`${fov}deg`).to.equal(element.maxFieldOfView);
        });

        test('jumps to minFieldOfView when outside', async () => {
          element.minFieldOfView = `60deg`;
          await timePasses();
          const fov = Math.round(element.getFieldOfView());
          expect(`${fov}deg`).to.equal(element.minFieldOfView);
        });

        suite('when configured before model loads', () => {
          let initiallyUnloadedElement: ModelViewerElementBase&
              ControlsInterface;
          let controls: SmoothControls;

          setup(() => {
            initiallyUnloadedElement = new ModelViewerElement();
            controls =
                (initiallyUnloadedElement as any)[$controls] as SmoothControls;
          });

          teardown(() => {
            if (initiallyUnloadedElement.parentNode != null) {
              initiallyUnloadedElement.parentNode.removeChild(
                  initiallyUnloadedElement);
            }
          });

          test('respects user-configured min/maxFieldOfView', async () => {
            document.body.insertBefore(
                initiallyUnloadedElement, document.body.firstChild);

            initiallyUnloadedElement.minFieldOfView = '90deg';
            initiallyUnloadedElement.maxFieldOfView = '100deg';
            initiallyUnloadedElement.src = ASTRONAUT_GLB_PATH;

            await waitForEvent(initiallyUnloadedElement, 'load');

            initiallyUnloadedElement.fieldOfView = '100deg';

            await timePasses();
            settleControls(controls);

            expect(initiallyUnloadedElement.getFieldOfView())
                .to.be.closeTo(100, 0.001);

            expect(initiallyUnloadedElement.getMinimumFieldOfView())
                .to.be.closeTo(90, 0.001);

            expect(initiallyUnloadedElement.getMaximumFieldOfView())
                .to.be.closeTo(100, 0.001);
          });
        });
      });
    });

    suite('camera-controls', () => {
      let element: ModelViewerElementBase&ControlsInterface;
      let controls: SmoothControls;

      setup(async () => {
        element = new ModelViewerElement();
        controls = (element as any)[$controls]
        document.body.insertBefore(element, document.body.firstChild);
        element.src = assetPath('models/cube.gltf');
        element.cameraControls = true;

        element.interactionPromptThreshold =
            100;  // Fairly low, to keep the test time down

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        element.cameraControls = false;
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('creates SmoothControls if enabled', () => {
        expect(controls).to.be.ok;
      });

      test(
          'requires focus to interact if policy is set to allow-when-focused',
          async () => {
            element.interactionPolicy = 'allow-when-focused';
            await timePasses();
            expect(controls.options.interactionPolicy)
                .to.be.equal('allow-when-focused');
          });

      test(
          'does not require focus to interact if policy is set to always-allow',
          async () => {
            element.interactionPolicy = 'always-allow';
            await timePasses();
            expect(controls.options.interactionPolicy)
                .to.be.equal('always-allow');
          });

      test('sets max radius to at least the camera framed distance', () => {
        const cameraDistance = element[$scene].camera.position.distanceTo(
            element[$scene].target.position);
        expect(controls.options.maximumRadius).to.be.at.least(cameraDistance);
      });

      test(
          'with a large radius, sets far plane to contain the model',
          async () => {
            const maxRadius = 10;
            element.maxCameraOrbit = `auto auto ${maxRadius}m`;
            await timePasses();

            const cameraDistance = element[$scene].camera.position.distanceTo(
                element[$scene].target.position);
            expect(controls.camera.far)
                .to.be.at.least(cameraDistance + maxRadius);
          });

      test(
          'with zero radius, sets far plane to contain the model', async () => {
            const maxRadius = 0;
            element.maxCameraOrbit = `auto auto ${maxRadius}m`;
            await timePasses();

            const cameraDistance = element[$scene].camera.position.distanceTo(
                element[$scene].target.position);
            expect(controls.camera.far)
                .to.be.at.least(cameraDistance + maxRadius);
          });

      test('disables interaction if disabled after enabled', async () => {
        element.cameraControls = false;
        await timePasses();
        expect(controls.interactionEnabled).to.be.false;
      });

      suite('when user is interacting', () => {
        test('sets an appropriate camera-change event source', async () => {
          await rafPasses();
          element[$userInputElement].focus();
          interactWith(element[$userInputElement]);

          const cameraChangeDispatches =
              waitForEvent<CustomEvent<CameraChangeDetails>>(
                  element, 'camera-change');
          const event = await cameraChangeDispatches;

          expect(event.detail.source)
              .to.be.equal(ChangeSource.USER_INTERACTION);
        });
      });

      suite('interaction-prompt', () => {
        test('can be configured to never appear', async () => {
          element.interactionPrompt = 'none';
          await timePasses(element.interactionPromptThreshold + 100);

          const promptElement: HTMLElement = (element as any)[$promptElement];
          expect(promptElement.classList.contains('visible'))
              .to.be.equal(false);
        });

        test('can be configured to raise automatically', async () => {
          element.interactionPrompt = 'auto';
          await timePasses(element.interactionPromptThreshold + 100);

          const promptElement: HTMLElement = (element as any)[$promptElement];
          expect(promptElement.classList.contains('visible')).to.be.equal(true);
        });

        test('does not appear when camera-controls is disabled', async () => {
          element.interactionPrompt = 'auto';
          element.cameraControls = false;
          await timePasses(element.interactionPromptThreshold + 100);

          const promptElement: HTMLElement = (element as any)[$promptElement];
          expect(promptElement.classList.contains('visible'))
              .to.be.equal(false);
        });

        suite('after it has been dismissed', () => {
          let promptElement: HTMLElement;

          setup(async () => {
            promptElement = (element as any)[$promptElement];
            element.interactionPrompt = 'auto';

            await until(() => promptElement.classList.contains('visible'));

            interactWith(element[$canvas]);

            await until(
                () => promptElement.classList.contains('visible') === false);

            settleControls(controls);
          });

          test('can be reset and displayed again', async () => {
            element.resetInteractionPrompt();

            await timePasses(element.interactionPromptThreshold + 100);

            expect(promptElement.classList.contains('visible')).to.be.true;
          });
        });

        suite('when configured to be basic', () => {
          setup(async () => {
            element.interactionPromptStyle = 'basic';
            await timePasses();
          });

          test('does not have a css animation', () => {
            const computedStyle =
                getComputedStyle((element as any)[$promptAnimatedContainer]);
            expect(computedStyle.animationName).to.be.equal('none');
          });
        });
      });

      suite('a11y', () => {
        let input: HTMLDivElement;
        let promptElement: HTMLElement;

        setup(async () => {
          input = element[$userInputElement];
          promptElement = (element as any)[$promptElement];
          element.alt = 'A 3D model of a cube';
          element.cameraOrbit = '0 90deg auto';
        });

        suite('when configured for focus-based interaction prompting', () => {
          setup(async () => {
            element.interactionPrompt = 'when-focused';
            await timePasses();
          });

          test('has initial aria-label set to alt before interaction', () => {
            expect(input.getAttribute('aria-label')).to.be.equal(element.alt);
          });

          test.skip('prompts user to interact when focused', async () => {
            input.focus();

            await until(
                () => input.getAttribute('aria-label') === INTERACTION_PROMPT);

            expect(promptElement.classList.contains('visible'))
                .to.be.equal(true);
          });

          test.skip(
              'does not prompt users to interact before a model is loaded',
              async () => {
                element.src = null;

                input.focus();

                await timePasses(element.interactionPromptThreshold + 100);
                await rafPasses();

                expect(promptElement.classList.contains('visible'))
                    .to.be.equal(false);

                input.blur();
                // IE11 does not fire the blur handler without this wait.
                await timePasses();

                element.src = ASTRONAUT_GLB_PATH;
                await waitForEvent(element, 'load');

                input.focus();

                await timePasses(element.interactionPromptThreshold + 100);
                await rafPasses();

                expect(promptElement.classList.contains('visible'))
                    .to.be.equal(true);
              });

          test('does not prompt if user already interacted', async () => {
            input.focus();

            interactWith(input);

            await timePasses(element.interactionPromptThreshold + 100);

            expect(input.getAttribute('aria-label'))
                .to.not.be.equal(INTERACTION_PROMPT);
            expect(promptElement.classList.contains('visible'))
                .to.be.equal(false);
          });
        });

        test(
            'announces camera orientation when orbiting horizontally',
            async () => {
              await rafPasses();
              input.focus();

              controls.setOrbit(-Math.PI / 2.0);
              settleControls(controls);

              expect(input.getAttribute('aria-label'))
                  .to.be.equal('View from stage left');

              controls.setOrbit(Math.PI / 2.0);
              settleControls(controls);

              expect(input.getAttribute('aria-label'))
                  .to.be.equal('View from stage right');

              controls.adjustOrbit(-Math.PI / 2.0, 0, 0);
              settleControls(controls);

              expect(input.getAttribute('aria-label'))
                  .to.be.equal('View from stage back');

              controls.adjustOrbit(Math.PI, 0, 0);
              settleControls(controls);

              expect(input.getAttribute('aria-label'))
                  .to.be.equal('View from stage front');
            });

        test(
            'announces camera orientation when orbiting vertically',
            async () => {
              await rafPasses();
              input.focus();

              settleControls(controls);

              controls.setOrbit(0, 0);
              settleControls(controls);

              expect(input.getAttribute('aria-label'))
                  .to.be.equal('View from stage upper-front');

              controls.adjustOrbit(0, -Math.PI / 2.0, 0);
              settleControls(controls);

              expect(input.getAttribute('aria-label'))
                  .to.be.equal('View from stage front');

              controls.adjustOrbit(0, -Math.PI / 2.0, 0);
              settleControls(controls);

              expect(input.getAttribute('aria-label'))
                  .to.be.equal('View from stage lower-front');
            });
      });
    });
  });
});
