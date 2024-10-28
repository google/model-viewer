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

import {expect} from 'chai';
import {Camera, Vector3} from 'three';

import {$controls, $promptAnimatedContainer, $promptElement, CameraChangeDetails, cameraOrbitIntrinsics, ControlsInterface, DEFAULT_FOV_DEG, DEFAULT_MIN_FOV_DEG, INTERACTION_PROMPT, SphericalPosition} from '../../features/controls.js';
import ModelViewerElementBase, {$scene, $statusElement, $userInputElement, Vector3D} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {StyleEvaluator} from '../../styles/evaluators.js';
import {ChangeSource, SmoothControls} from '../../three-components/SmoothControls.js';
import {step, timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, dispatchSyntheticEvent, rafPasses, until} from '../helpers.js';

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');

const interactWith = (element: HTMLElement) => {
  element.dispatchEvent(
      new PointerEvent('pointerdown', {pointerId: 8, clientX: 0, clientY: 10}));
  element.dispatchEvent(
      new PointerEvent('pointermove', {pointerId: 8, clientX: 0, clientY: 0}));
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


suite('Controls', () => {
  suite('camera-orbit', () => {
    let element: ModelViewerElement;
    let defaultRadius: number;

    setup(async () => {
      element = new ModelViewerElement();
      document.body.insertBefore(element, document.body.firstChild);
      element.src = assetPath('models/cube.gltf');

      await waitForEvent(element, 'poster-dismissed');

      element.jumpCameraToGoal();
      await element.updateComplete;

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

      element.cameraOrbit = `${nextTheta}rad ${orbit.phi}rad ${orbit.radius}m`;
      element.jumpCameraToGoal();
      await element.updateComplete;

      expectSphericalsToBeEqual(
          element.getCameraOrbit(), {...orbit, theta: nextTheta});
    });

    test('can independently adjust inclination', async () => {
      const orbit = element.getCameraOrbit();
      const nextPhi = orbit.phi + 1.0;

      element.cameraOrbit = `${orbit.theta}rad ${nextPhi}rad ${orbit.radius}m`;
      element.jumpCameraToGoal();
      await element.updateComplete;

      expectSphericalsToBeEqual(
          element.getCameraOrbit(), {...orbit, phi: nextPhi});
    });

    test('can independently adjust radius', async () => {
      const orbit = element.getCameraOrbit();
      const nextRadius = orbit.radius - 1.0;

      element.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${nextRadius}m`;
      element.jumpCameraToGoal();
      await element.updateComplete;

      expectSphericalsToBeEqual(
          element.getCameraOrbit(), {...orbit, radius: nextRadius});

      element.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad auto`;
      element.jumpCameraToGoal();
      await element.updateComplete;

      expect(element.getCameraOrbit().radius).to.be.equal(defaultRadius);
    });

    test('can independently adjust target', async () => {
      const target = element.getCameraTarget();
      target.x += 1;
      target.z += 1;

      element.cameraTarget = `${target.x}m auto ${target.z}m`;
      element.jumpCameraToGoal();
      await element.updateComplete;

      expect(element.getCameraTarget().toString())
          .to.be.equal(target.toString());
    });

    test('causes the camera to look at the target', () => {
      expect(
          cameraIsLookingAt(element[$scene].camera, element.getCameraTarget()))
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

      test('causes camera-change event to fire', async () => {
        const cameraChangeDispatches = waitForEvent(element, 'camera-change');
        element.cameraTarget = '3m 2m 1m';

        await cameraChangeDispatches;
      });
    });

    test('defaults FOV correctly', async () => {
      expect(element.getFieldOfView()).to.be.closeTo(DEFAULT_FOV_DEG, 0.00001);
    });

    test('defaults FOV limits correctly', async () => {
      expect(element.getMinimumFieldOfView())
          .to.be.closeTo(DEFAULT_MIN_FOV_DEG, 0.00001);
      expect(element.getMaximumFieldOfView())
          .to.be.closeTo(DEFAULT_FOV_DEG, 0.00001);
    });

    test('can independently adjust FOV', async () => {
      const fov = element.getFieldOfView();
      const nextFov = fov - 1.0;

      element.fieldOfView = `${nextFov}deg`;
      element.jumpCameraToGoal();
      await element.updateComplete;

      expect(element.getFieldOfView()).to.be.closeTo(nextFov, 0.00001);
    });

    test('changes FOV basis when aspect ratio changes', async () => {
      const fov = element.getFieldOfView();
      expect(fov).to.be.closeTo(DEFAULT_FOV_DEG, .001);
      element.setAttribute('style', 'width: 200px; height: 300px');
      await rafPasses();
      await rafPasses();

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
        element.cameraOrbit = `1rad 1rad 2.5m`;
        element.jumpCameraToGoal();
        await element.updateComplete;
      });

      test('starts at the initially configured orbit', () => {
        const orbit = element.getCameraOrbit();

        expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
            .to.be.equal(element.cameraOrbit);
      });

      test('jumpCameraToGoal updates instantly', async () => {
        const cameraOrbit = `0.5rad 1.5rad 2.2m`;
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
        element.cameraOrbit = `0deg 90deg 2.5m`;
        element.jumpCameraToGoal();
        await element.updateComplete;
      });

      test('defaults maxFieldOfView correctly', async () => {
        element.fieldOfView = '180deg';
        element.jumpCameraToGoal();
        await element.updateComplete;
        expect(element.getFieldOfView()).to.be.closeTo(DEFAULT_FOV_DEG, 0.001);
      });

      test('jumps to maxCameraOrbit when outside', async () => {
        element.maxCameraOrbit = `-2rad 1rad 2m`;
        await timePasses();
        const orbit = element.getCameraOrbit();
        expect(`${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`)
            .to.equal(element.maxCameraOrbit);
      });

      test('jumps to minCameraOrbit when outside', async () => {
        element.minCameraOrbit = `2rad 2rad 3m`;
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
        let initiallyUnloadedElement: ModelViewerElementBase&ControlsInterface;

        setup(() => {
          initiallyUnloadedElement = new ModelViewerElement();
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

          expect(initiallyUnloadedElement.getFieldOfView())
              .to.be.closeTo(90, 0.001);

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

      await waitForEvent(element, 'poster-dismissed');
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

    test('with zero radius, sets far plane to contain the model', async () => {
      const maxRadius = 0;
      element.minCameraOrbit = `auto auto ${maxRadius}m`;
      element.maxCameraOrbit = `auto auto ${maxRadius}m`;
      element.jumpCameraToGoal();
      await timePasses();

      const cameraDistance = element[$scene].camera.position.distanceTo(
          element[$scene].target.position);
      expect(controls.camera.far).to.be.at.least(cameraDistance + maxRadius);
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

        expect(event.detail.source).to.be.equal(ChangeSource.USER_INTERACTION);
      });

      test('does not send "user-interaction" after JS change', async () => {
        const user = waitForEvent(
            element,
            'camera-change',
            (event) =>
                (event as any).detail.source === ChangeSource.USER_INTERACTION);
        dispatchSyntheticEvent(
            element[$userInputElement], 'keydown', {key: 'ArrowUp'});
        await user;

        const js = waitForEvent(
            element,
            'camera-change',
            (event) => (event as any).detail.source === ChangeSource.NONE);
        element.cameraOrbit = '0deg 0deg auto';
        await js;
      });
    });

    suite('interaction-prompt', () => {
      test('can be configured to never appear', async () => {
        element.interactionPrompt = 'none';
        await timePasses(element.interactionPromptThreshold + 100);

        const promptElement: HTMLElement = (element as any)[$promptElement];
        expect(promptElement.classList.contains('visible')).to.be.equal(false);
      });

      test('can be configured to raise automatically', async () => {
        element.interactionPrompt = 'auto';
        await element.updateComplete;
        await timePasses(element.interactionPromptThreshold + 100);
        await rafPasses();

        const promptElement: HTMLElement = (element as any)[$promptElement];
        expect(promptElement.classList.contains('visible')).to.be.equal(true);
      });

      test('does not appear when camera-controls is disabled', async () => {
        element.interactionPrompt = 'auto';
        element.cameraControls = false;
        await timePasses(element.interactionPromptThreshold + 100);

        const promptElement: HTMLElement = (element as any)[$promptElement];
        expect(promptElement.classList.contains('visible')).to.be.equal(false);
      });

      suite('after it has been dismissed', () => {
        let promptElement: HTMLElement;

        setup(async () => {
          promptElement = (element as any)[$promptElement];
          element.interactionPrompt = 'auto';

          await until(() => promptElement.classList.contains('visible'));
          interactWith(element[$userInputElement]);
          await until(
              () => promptElement.classList.contains('visible') === false);
        });

        test('can be reset and displayed again', async () => {
          element.resetInteractionPrompt();

          await timePasses(element.interactionPromptThreshold + 100);
          await rafPasses();

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
              getComputedStyle((element as any)[$promptElement]);
          expect(computedStyle.animationName).to.be.equal('none');
        });

        test('becomes visible', async () => {
          await until(
              () => (element as any)[$promptElement].classList.contains(
                  'visible'));
          expect((element as any)[$promptAnimatedContainer].style.opacity)
              .to.be.equal('1');
        });
      });
    });

    suite('synthetic interaction', () => {
      setup(async () => {
        element.interactionPrompt = 'none';
        await element.updateComplete;
      });

      const finger = {
        x: {
          initialValue: 0.6,
          keyframes: [
            {frames: 1, value: 0.7},
            {frames: 1, value: 0.6},
          ]
        },
        y: {
          initialValue: 0.45,
          keyframes: [
            {frames: 1, value: 0.4},
            {frames: 1, value: 0.45},
          ]
        }
      };

      const tap = (position: number) => {
        return {
          x: {
            initialValue: position,
            keyframes: [
              {frames: 1, value: position},
            ]
          },
          y: {
            initialValue: position,
            keyframes: [
              {frames: 1, value: position},
            ]
          }
        };
      };

      test.skip('one finger rotates', async () => {
        const orbit = element.getCameraOrbit();

        element.interact(1000, finger);
        await waitForEvent(element, 'camera-change');
        await waitForEvent(element, 'camera-change');

        const newOrbit = element.getCameraOrbit();
        expect(newOrbit.theta).to.be.lessThan(orbit.theta, 'theta');
        expect(newOrbit.phi).to.be.greaterThan(orbit.phi, 'phi');
        expect(newOrbit.radius).to.eq(orbit.radius, 'radius');
      });

      test(
          'return one finger to starting point returns camera to starting point',
          async () => {
            const orbit = element.getCameraOrbit();
            element.interactionPrompt = 'none';
            element.interpolationDecay = 0;

            element.interact(50, finger);
            await timePasses(50);
            await rafPasses();
            element.jumpCameraToGoal();
            await element.updateComplete;

            const newOrbit = element.getCameraOrbit();
            expect(newOrbit.theta).to.be.closeTo(orbit.theta, 0.001, 'theta');
            expect(newOrbit.phi).to.be.closeTo(orbit.phi, 0.001, 'phi');
            expect(newOrbit.radius).to.eq(orbit.radius, 'radius');
          });

      test.skip('two fingers pan', async () => {
        element.cameraOrbit = '0deg 90deg auto';
        element.jumpCameraToGoal();
        await element.updateComplete;
        const target = element.getCameraTarget();

        element.interact(500, finger, finger);
        await waitForEvent(element, 'camera-change');
        await waitForEvent(element, 'camera-change');

        const newTarget = element.getCameraTarget();
        expect(newTarget.x).to.be.lessThan(target.x, 'X');
        expect(newTarget.y).to.be.lessThan(target.y, 'Y');
        expect(newTarget.z).to.be.closeTo(target.z, 0.001, 'Z');
      });

      test('two fingers do not pan if disable-pan is set', async () => {
        element.disablePan = true;
        await element.updateComplete;
        element.cameraOrbit = '0deg 90deg auto';
        element.jumpCameraToGoal();
        await element.updateComplete;
        const target = element.getCameraTarget();

        element.interact(500, finger, finger);
        await rafPasses();
        await timePasses(50);
        await rafPasses();

        const newTarget = element.getCameraTarget();
        expect(newTarget.x).to.be.eq(target.x, 'X');
        expect(newTarget.y).to.be.eq(target.y, 'Y');
        expect(newTarget.z).to.be.eq(target.z, 'Z');
      });

      test(
          'return two fingers to starting point returns target to starting point',
          async () => {
            const target = element.getCameraTarget();

            // Long enough duration to not be considered a re-centering tap.
            element.interact(500, finger, finger);
            await rafPasses();
            await timePasses(500);
            await rafPasses();
            element.jumpCameraToGoal();
            await element.updateComplete;

            const newTarget = element.getCameraTarget();
            expect(newTarget.x).to.be.closeTo(target.x, 0.001, 'X');
            expect(newTarget.y).to.be.closeTo(target.y, 0.001, 'Y');
            expect(newTarget.z).to.be.closeTo(target.z, 0.001, 'Z');
          });

      test(
          'disconnecting the mv from DOM cancels the interaction.',
          async () => {
            let stopped = false;
            element.addEventListener('interact-stopped', () => {
              stopped = true;
            }, {once: true});
            element.interact(500, finger, finger);
            await rafPasses();
            expect(element.isConnected).to.be.true;
            element.parentNode!.removeChild(element);
            expect(element.isConnected).to.be.false;
            await rafPasses();
            expect(stopped).to.be.true;
          });

      test.skip('tap moves the model and re-centers', async () => {
        element.cameraOrbit = '0deg 90deg auto';
        element.jumpCameraToGoal();
        await element.updateComplete;
        const target = element.getCameraTarget();

        // tap on the model
        element.interact(50, tap(0.5));
        await waitForEvent(element, 'camera-change');
        await waitForEvent(element, 'camera-change');
        element.jumpCameraToGoal();
        await element.updateComplete;

        const newTarget = element.getCameraTarget();
        expect(newTarget.x).to.be.closeTo(target.x, 0.001, 'X');
        expect(newTarget.y).to.be.closeTo(target.y, 0.001, 'Y');
        expect(newTarget.z).to.be.greaterThan(target.z, 'Z');

        // tap off the model
        element.interact(50, tap(0));
        await waitForEvent(element, 'camera-change');
        await waitForEvent(element, 'camera-change');
        element.jumpCameraToGoal();
        await element.updateComplete;

        const oldTarget = element.getCameraTarget();
        expect(oldTarget.x).to.be.closeTo(target.x, 0.001, 'X recenter');
        expect(oldTarget.y).to.be.closeTo(target.y, 0.001, 'Y recenter');
        expect(oldTarget.z).to.be.closeTo(target.z, 0.001, 'Z recenter');
      });

      test('tap does not move the model with disable-tap is set', async () => {
        element.disableTap = true;
        await element.updateComplete;
        element.cameraOrbit = '0deg 90deg auto';
        element.jumpCameraToGoal();
        await element.updateComplete;
        const target = element.getCameraTarget();

        element.interact(50, tap(0.5));
        await rafPasses();
        await timePasses(50);
        await rafPasses();

        const newTarget = element.getCameraTarget();
        expect(newTarget.x).to.be.eq(target.x, 'X');
        expect(newTarget.y).to.be.eq(target.y, 'Y');
        expect(newTarget.z).to.be.eq(target.z, 'Z');
      });

      test.skip('camera-orbit cancels synthetic interaction', async () => {
        const canceled = waitForEvent(
            element,
            'interact-stopped',
            (event) => (event as any).detail.source === ChangeSource.NONE);

        element.interact(500, finger);
        await rafPasses();
        element.cameraOrbit = 'auto auto 70%';
        await canceled;
      });

      test.skip('user interaction cancels synthetic interaction', async () => {
        const canceled = waitForEvent(
            element,
            'interact-stopped',
            (event) =>
                (event as any).detail.source === ChangeSource.USER_INTERACTION);

        element.interact(500, finger);
        await rafPasses();
        dispatchSyntheticEvent(
            element[$userInputElement], 'keydown', {key: 'PageDown'});
        await canceled;
      });

      test.skip('second interaction does not interrupt the first', async () => {
        const target = element.getCameraTarget();
        const orbit = element.getCameraOrbit();

        element.interact(500, finger, finger);
        element.interact(500, finger);
        await timePasses(50);
        await rafPasses();
        element.jumpCameraToGoal();
        await element.updateComplete;

        const newTarget = element.getCameraTarget();
        expect(newTarget.x).to.be.lessThan(target.x, 'X');
        expect(newTarget.y).to.be.lessThan(target.y, 'Y');

        const newOrbit = element.getCameraOrbit();
        expect(newOrbit.theta).to.be.closeTo(orbit.theta, 0.001, 'theta');
        expect(newOrbit.phi).to.be.closeTo(orbit.phi, 0.001, 'phi');
      });

      test('zero element size does not produce NaNs', async () => {
        element.style.width = '0px';
        element.style.height = '0px';
        await rafPasses();

        const finger = {
          x: {
            initialValue: 0.6,
            keyframes: [
              {frames: 1, value: 0.7},
              {frames: 1, value: 0.6},
            ]
          },
          y: {
            // No Y change to test potential 0 / 0
            initialValue: 0.4,
            keyframes: [
              {frames: 1, value: 0.4},
              {frames: 1, value: 0.4},
            ]
          }
        };

        element.interact(50, finger);
        await rafPasses();
        await rafPasses();
        await rafPasses();

        const newOrbit = element.getCameraOrbit();
        expect(newOrbit.theta).to.be.finite;
        expect(newOrbit.phi).to.be.finite;
        expect(newOrbit.radius).to.be.finite;
      });
    });

    suite('a11y', () => {
      let input: HTMLDivElement;
      let promptElement: HTMLElement;
      let statusElement: HTMLSpanElement;

      setup(async () => {
        input = element[$userInputElement];
        promptElement = (element as any)[$promptElement];
        statusElement = element[$statusElement];
        element.alt = 'A 3D model of a cube';
        element.cameraOrbit = '0 90deg auto';
        await element.updateComplete;
      });

      test('has initial aria-label set to alt before interaction', () => {
        expect(input.getAttribute('aria-label')).to.include(element.alt);
      });

      test('does not prompt if user already interacted', async () => {
        input.focus();

        interactWith(input);

        await timePasses(element.interactionPromptThreshold + 100);

        expect(input.getAttribute('aria-label')).to.include(INTERACTION_PROMPT);
        expect(promptElement.classList.contains('visible')).to.be.equal(false);
      });

      test(
          'announces camera orientation when orbiting horizontally',
          async () => {
            await rafPasses();
            input.focus();

            controls.setOrbit(-Math.PI / 2.0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage left');

            controls.setOrbit(Math.PI / 2.0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage right');

            controls.adjustOrbit(-Math.PI / 2.0, 0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage back');

            controls.adjustOrbit(Math.PI, 0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage front');
          });

      test(
          'announces camera orientation when orbiting vertically', async () => {
            await rafPasses();
            input.focus();

            element.jumpCameraToGoal();
            await element.updateComplete;

            controls.setOrbit(0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage upper-front');

            controls.adjustOrbit(0, -Math.PI / 2.0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage front');

            controls.adjustOrbit(0, -Math.PI / 2.0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage lower-front');
          });

      test(
          'announces camera orientation when orbiting horizontally with a11y',
          async () => {
            await rafPasses();
            input.focus();

            element.a11y = {
              'front': 'A11y test stage front',
              'back': 'A11y test stage back',
              'left': 'A11y test stage left',
              'right': 'A11y test stage right',
              'upper-front': 'A11y test stage upper-front',
              'upper-back': 'A11y test stage upper-back',
              'upper-left': 'A11y test stage upper-left',
              'upper-right': 'A11y test stage upper-right',
              'lower-front': 'A11y test stage lower-front',
              'lower-back': 'A11y test stage lower-back',
              'lower-left': 'A11y test stage lower-left',
              'lower-right': 'A11y test stage lower-right',
              'interaction-prompt': 'A11y test interaction prompt'
            };

            controls.setOrbit(-Math.PI / 2.0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('A11y test stage left');

            controls.setOrbit(Math.PI / 2.0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('A11y test stage right');

            controls.adjustOrbit(-Math.PI / 2.0, 0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('A11y test stage back');

            controls.adjustOrbit(Math.PI, 0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('A11y test stage front');

            element.a11y = null;

            controls.setOrbit(-Math.PI / 2.0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage left');

            controls.setOrbit(Math.PI / 2.0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage right');

            controls.adjustOrbit(-Math.PI / 2.0, 0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage back');

            controls.adjustOrbit(Math.PI, 0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage front');
          });

      test(
          'announces camera orientation when orbiting vertically with a11y',
          async () => {
            await rafPasses();
            input.focus();

            element.a11y = {
              'front': 'A11y test stage front',
              'back': 'A11y test stage back',
              'left': 'A11y test stage left',
              'right': 'A11y test stage right',
              'upper-front': 'A11y test stage upper-front',
              'upper-back': 'A11y test stage upper-back',
              'upper-left': 'A11y test stage upper-left',
              'upper-right': 'A11y test stage upper-right',
              'lower-front': 'A11y test stage lower-front',
              'lower-back': 'A11y test stage lower-back',
              'lower-left': 'A11y test stage lower-left',
              'lower-right': 'A11y test stage lower-right',
              'interaction-prompt': 'A11y test interaction prompt'
            };

            element.jumpCameraToGoal();
            await element.updateComplete;

            controls.setOrbit(0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('A11y test stage upper-front');

            controls.adjustOrbit(0, -Math.PI / 2.0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('A11y test stage front');

            controls.adjustOrbit(0, -Math.PI / 2.0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('A11y test stage lower-front');

            element.jumpCameraToGoal();
            await element.updateComplete;

            element.a11y = '';

            controls.setOrbit(0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage upper-front');

            controls.adjustOrbit(0, -Math.PI / 2.0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage front');

            controls.adjustOrbit(0, -Math.PI / 2.0, 0);
            element.jumpCameraToGoal();
            await element.updateComplete;

            expect(statusElement.textContent)
                .to.be.equal('View from stage lower-front');
          });
    });
  });
});
