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

import {PerspectiveCamera, Spherical, Vector3} from 'three';

import {DEFAULT_OPTIONS, KeyCode, SmoothControls} from '../../three-components/SmoothControls.js';
import {step} from '../../utilities.js';
import {dispatchSyntheticEvent} from '../helpers.js';

const expect = chai.expect;

const ONE_FRAME_DELTA = 1000.0 / 60.0;
const FIFTY_FRAME_DELTA = 50.0 * ONE_FRAME_DELTA;

const HALF_PI = Math.PI / 2.0;
const QUARTER_PI = HALF_PI / 2.0;
const THREE_QUARTERS_PI = HALF_PI + QUARTER_PI;

const USER_INTERACTION_CHANGE_SOURCE = 'user-interaction';
const DEFAULT_INTERACTION_CHANGE_SOURCE = 'none';

// NOTE(cdata): Precision is a bit off when comparing e.g., expected camera
// direction in practice:
const FLOAT_EQUALITY_THRESHOLD = 1e-6;

/**
 * Returns true if the camera is looking at a given position, within +/-
 * FLOAT_EQUALITY_THRESHOLD on each axis.
 */
const cameraIsLookingAt = (camera, position) => {
  const cameraDirection = camera.getWorldDirection(new Vector3());
  const expectedDirection = position.clone().sub(camera.position).normalize();

  const deltaX = Math.abs(cameraDirection.x - expectedDirection.x);
  const deltaY = Math.abs(cameraDirection.y - expectedDirection.y);
  const deltaZ = Math.abs(cameraDirection.z - expectedDirection.z);

  return step(FLOAT_EQUALITY_THRESHOLD, deltaX) === 0 &&
      step(FLOAT_EQUALITY_THRESHOLD, deltaY) === 0 &&
      step(FLOAT_EQUALITY_THRESHOLD, deltaZ) === 0;
};


/**
 * Settle controls by performing 50 frames worth of updates
 */
export const settleControls = controls =>
    controls.update(performance.now, FIFTY_FRAME_DELTA);

suite('SmoothControls', () => {
  let controls;
  let camera;
  let element;

  setup(() => {
    element = document.createElement('div');
    camera = new PerspectiveCamera();
    controls = new SmoothControls(camera, element);

    element.style.height = '100px';
    element.tabIndex = 0;

    document.body.appendChild(element);

    controls.enableInteraction();
  });

  teardown(() => {
    document.body.removeChild(element);

    controls.disableInteraction();
  });

  suite('when updated', () => {
    test('repositions the camera within the configured radius optionss', () => {
      settleControls(controls);

      const radius = camera.position.length();

      expect(radius).to.be.within(
          DEFAULT_OPTIONS.minimumRadius, DEFAULT_OPTIONS.maximumRadius);
    });

    test('causes the camera to look at the target', () => {
      settleControls(controls);
      expect(cameraIsLookingAt(camera, controls.target)).to.be.equal(true);
    });

    suite('when target is modified', () => {
      test('camera looks at the configured target', () => {
        controls.target.set(3, 2, 1);
        settleControls(controls);

        expect(cameraIsLookingAt(camera, controls.target)).to.be.equal(true);
      });
    });

    suite('when orbit is changed', () => {
      suite('radius', () => {
        test('changes the absolute distance to the target', () => {
          settleControls(controls);

          expect(camera.position.length())
              .to.be.equal(DEFAULT_OPTIONS.minimumRadius);
          controls.setOrbit(0, 0, 10);
          settleControls(controls);
          expect(camera.position.length()).to.be.equal(10);
        });
      });
    });

    suite('keyboard input', () => {
      let initialCameraPosition;

      setup(() => {
        settleControls(controls);
        initialCameraPosition = camera.position.clone();
      });

      suite('global keyboard input', () => {
        test('does not change orbital position of camera', () => {
          dispatchSyntheticEvent(window, 'keydown', {keyCode: KeyCode.UP});

          settleControls(controls);

          expect(camera.position.z).to.be.equal(initialCameraPosition.z);
        });
      });

      suite('local keyboard input', () => {
        test('changes orbital position of camera', () => {
          element.focus();

          dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});

          settleControls(controls);

          expect(camera.position.z).to.not.be.equal(initialCameraPosition.z);
        });
      });
    });

    suite('customizing optionss', () => {
      suite('azimuth', () => {
        setup(() => {
          controls.applyOptions({
            minimumAzimuthalAngle: -1 * HALF_PI,
            maximumAzimuthalAngle: HALF_PI
          });
        });

        test('prevents camera azimuth from exceeding optionss', () => {
          controls.setOrbit(-Math.PI, 0, 0);
          settleControls(controls);

          expect(controls.getCameraSpherical().theta).to.be.equal(-1 * HALF_PI);

          controls.setOrbit(Math.PI, 0, 0);
          settleControls(controls);

          expect(controls.getCameraSpherical().theta).to.be.equal(HALF_PI);
        });
      });

      suite('pole', () => {
        setup(() => {
          controls.applyOptions({
            minimumPolarAngle: QUARTER_PI,
            maximumPolarAngle: THREE_QUARTERS_PI
          });
        });

        test('prevents camera polar angle from exceeding optionss', () => {
          controls.setOrbit(0, 0, 0);
          settleControls(controls);

          expect(controls.getCameraSpherical().phi).to.be.equal(QUARTER_PI);

          controls.setOrbit(0, Math.PI, 0);
          settleControls(controls);

          expect(controls.getCameraSpherical().phi)
              .to.be.equal(THREE_QUARTERS_PI);
        });
      });

      suite('radius', () => {
        setup(() => {
          controls.applyOptions({minimumRadius: 10, maximumRadius: 20});
        });

        test('prevents camera distance from exceeding optionss', () => {
          controls.setOrbit(0, 0, 0);
          settleControls(controls);

          expect(controls.getCameraSpherical().radius).to.be.equal(10);

          controls.setOrbit(0, 0, 100);
          settleControls(controls);

          expect(controls.getCameraSpherical().radius).to.be.equal(20);
        });
      });

      suite('event handling', () => {
        suite('prevent-all', () => {
          setup(() => {
            controls.applyOptions({
              eventHandlingBehavior: 'prevent-all',
              interactionPolicy: 'always-allow'
            });
          });

          test('always preventDefaults handled, cancellable UI events', () => {
            const mousedown = dispatchSyntheticEvent(element, 'mousedown');

            const mousemove = dispatchSyntheticEvent(element, 'mousemove');

            expect(mousemove.defaultPrevented).to.be.equal(true);
          });
        });

        suite('prevent-handled', () => {
          setup(() => {
            controls.applyOptions({eventHandlingBehavior: 'prevent-handled'});
          });

          test('does not cancel unhandled UI events', () => {
            const mousedown = dispatchSyntheticEvent(element, 'mousedown');
            const mousemove = dispatchSyntheticEvent(element, 'mousemove');

            expect(mousemove.defaultPrevented).to.be.equal(false);
          });
        });
      });

      suite('interaction policy', () => {
        suite('allow-when-focused', () => {
          setup(() => {
            controls.applyOptions({interactionPolicy: 'allow-when-focused'});
            settleControls(controls);
          });

          test('does not zoom when scrolling while blurred', () => {
            expect(controls.getCameraSpherical().radius)
                .to.be.equal(DEFAULT_OPTIONS.minimumRadius);

            dispatchSyntheticEvent(element, 'wheel');

            settleControls(controls);

            expect(controls.getCameraSpherical().radius)
                .to.be.equal(DEFAULT_OPTIONS.minimumRadius);
          });

          test('does not orbit when pointing while blurred', () => {
            const originalPhi = controls.getCameraSpherical().phi;

            dispatchSyntheticEvent(
                element, 'mousedown', {clientX: 0, clientY: 10});
            dispatchSyntheticEvent(
                element, 'mousemove', {clientX: 0, clientY: 0});

            expect(controls.getCameraSpherical().phi).to.be.equal(originalPhi);
          });

          test('does zoom when scrolling while focused', () => {
            expect(controls.getCameraSpherical().radius)
                .to.be.equal(DEFAULT_OPTIONS.minimumRadius);

            element.focus();

            dispatchSyntheticEvent(element, 'wheel');

            settleControls(controls);

            expect(controls.getCameraSpherical().radius)
                .to.be.greaterThan(DEFAULT_OPTIONS.minimumRadius);
          });
        });

        suite('always-allow', () => {
          setup(() => {
            controls.applyOptions({interactionPolicy: 'always-allow'});
            settleControls(controls);
          });

          test('orbits when pointing, even while blurred', () => {
            const originalPhi = controls.getCameraSpherical().phi;

            dispatchSyntheticEvent(
                element, 'mousedown', {clientX: 0, clientY: 10});
            dispatchSyntheticEvent(
                element, 'mousemove', {clientX: 0, clientY: 0});

            settleControls(controls);

            expect(controls.getCameraSpherical().phi)
                .to.be.greaterThan(originalPhi);
          });

          test('zooms when scrolling, even while blurred', () => {
            expect(controls.getCameraSpherical().radius)
                .to.be.equal(DEFAULT_OPTIONS.minimumRadius);

            dispatchSyntheticEvent(element, 'wheel');

            settleControls(controls);

            expect(controls.getCameraSpherical().radius)
                .to.be.greaterThan(DEFAULT_OPTIONS.minimumRadius);
          });
        });

        suite('events', () => {
          test('dispatches "change" on user interaction', () => {
            let didCall = false;
            let changeSource;

            controls.addEventListener('change', ({source}) => {
              didCall = true;
              changeSource = source;
            });

            dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});
            settleControls(controls);

            expect(didCall).to.be.true;
            expect(changeSource).to.equal(USER_INTERACTION_CHANGE_SOURCE);
          });

          test('dispatches "change" on direct orbit change', () => {
            let didCall = false;
            let changeSource;

            controls.addEventListener('change', ({source}) => {
              didCall = true;
              changeSource = source;
            });

            controls.setOrbit(33, 33, 33);
            settleControls(controls);

            expect(didCall).to.be.true;
            expect(changeSource).to.equal(DEFAULT_INTERACTION_CHANGE_SOURCE);
          });

          test('sends "user-interaction" multiple times', () => {
            const expectedSources = [
              USER_INTERACTION_CHANGE_SOURCE,
              USER_INTERACTION_CHANGE_SOURCE,
              USER_INTERACTION_CHANGE_SOURCE,
            ];
            let changeSource = [];

            controls.addEventListener('change', ({source}) => {
              changeSource.push(source);
            });

            dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});
            controls.update(performance.now, ONE_FRAME_DELTA);
            controls.update(performance.now, ONE_FRAME_DELTA);
            controls.update(performance.now, ONE_FRAME_DELTA);

            expect(changeSource.length).to.equal(3);
            expect(changeSource).to.eql(expectedSources);
          });

          test('does not send "user-interaction" after setOrbit', () => {
            const expectedSources = [
              USER_INTERACTION_CHANGE_SOURCE,
              USER_INTERACTION_CHANGE_SOURCE,
              DEFAULT_INTERACTION_CHANGE_SOURCE,
              DEFAULT_INTERACTION_CHANGE_SOURCE,
            ];
            let changeSource = [];

            controls.addEventListener('change', ({source}) => {
              changeSource.push(source);
            });

            dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});
            
            controls.update(performance.now, ONE_FRAME_DELTA);
            controls.update(performance.now, ONE_FRAME_DELTA);

            controls.setOrbit(3, 3, 3);

            controls.update(performance.now, ONE_FRAME_DELTA);
            controls.update(performance.now, ONE_FRAME_DELTA);

            expect(changeSource.length).to.equal(4);
            expect(changeSource).to.eql(expectedSources);
          });

        });
      });
    });
  });
});
