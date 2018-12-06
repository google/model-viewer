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

import {DEFAULT_CONSTRAINTS, KeyCode, SmoothControls} from '../../three-components/SmoothControls.js';
import {step} from '../../utils.js';

const expect = chai.expect;

const ONE_FRAME_DELTA = 1000.0 / 60.0;
const FIFTY_FRAME_DELTA = 50.0 * ONE_FRAME_DELTA;

const HALF_PI = Math.PI / 2.0;
const QUARTER_PI = HALF_PI / 2.0;
const THREE_QUARTERS_PI = HALF_PI + QUARTER_PI;

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
 * Dispatch a synthetic event on a given element with a given type, and
 * optionally with custom event properties. Returns the dispatched event.
 */
const dispatchSyntheticEvent = (element, type, properties = {
  clientX: 0,
  clientY: 0,
  deltaY: 1.0
}) => {
  const event = new CustomEvent(type, {cancelable: true});
  Object.assign(event, properties);
  element.dispatchEvent(event);
  return event;
};

/**
 * Settle controls by performing 50 frames worth of updates
 */
const settleControls = controls =>
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
  });

  teardown(() => {
    document.body.removeChild(element);
    controls.dispose();
  });

  suite('when updated', () => {
    test(
        'repositions the camera within the configured radius constraints',
        () => {
          settleControls(controls);

          const radius = camera.position.length();

          expect(radius).to.be.within(
              DEFAULT_CONSTRAINTS.nearOrbitRadius,
              DEFAULT_CONSTRAINTS.farOrbitRadius);
        });

    test('causes the camera to look at the origin', () => {
      settleControls(controls);
      expect(cameraIsLookingAt(camera, controls.sceneOrigin)).to.be.equal(true);
    });

    suite('when scene origin is modified', () => {
      test('camera looks at the configured origin', () => {
        controls.sceneOrigin.set(3, 2, 1);
        settleControls(controls);

        expect(cameraIsLookingAt(camera, controls.sceneOrigin))
            .to.be.equal(true);
      });
    });

    suite('when orbit is changed', () => {
      suite('radius', () => {
        test('changes the absolute distance to the scene origin', () => {
          settleControls(controls);

          expect(camera.position.length())
              .to.be.equal(DEFAULT_CONSTRAINTS.nearOrbitRadius);
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

    suite('customizing constraints', () => {
      suite('azimuth', () => {
        setup(() => {
          controls.applyConstraints({
            minimumAzimuthalAngle: -1 * HALF_PI,
            maximumAzimuthalAngle: HALF_PI
          });
        });

        test('prevents camera azimuth from exceeding constraints', () => {
          controls.setOrbit(-Math.PI, 0, 0);
          settleControls(controls);

          expect(controls.cameraSpherical.theta).to.be.equal(-1 * HALF_PI);

          controls.setOrbit(Math.PI, 0, 0);
          settleControls(controls);

          expect(controls.cameraSpherical.theta).to.be.equal(HALF_PI);
        });
      });

      suite('pole', () => {
        setup(() => {
          controls.applyConstraints({
            minimumPolarAngle: QUARTER_PI,
            maximumPolarAngle: THREE_QUARTERS_PI
          });
        });

        test('prevents camera polar angle from exceeding constraints', () => {
          controls.setOrbit(0, 0, 0);
          settleControls(controls);

          expect(controls.cameraSpherical.phi).to.be.equal(QUARTER_PI);

          controls.setOrbit(0, Math.PI, 0);
          settleControls(controls);

          expect(controls.cameraSpherical.phi).to.be.equal(THREE_QUARTERS_PI);
        });
      });

      suite('radius', () => {
        setup(() => {
          controls.applyConstraints({nearOrbitRadius: 10, farOrbitRadius: 20});
        });

        test('prevents camera distance from exceeding constraints', () => {
          controls.setOrbit(0, 0, 0);
          settleControls(controls);

          expect(controls.cameraSpherical.radius).to.be.equal(10);

          controls.setOrbit(0, 0, 100);
          settleControls(controls);

          expect(controls.cameraSpherical.radius).to.be.equal(20);
        });
      });

      suite('event handling', () => {
        suite('prevent-all', () => {
          setup(() => {
            controls.applyConstraints({eventHandlingBehavior: 'prevent-all'});
          });

          test('always preventDefaults cancellable UI events', () => {
            const mousedown = dispatchSyntheticEvent(element, 'mousedown');

            const mousemove = dispatchSyntheticEvent(element, 'mousemove');

            expect(mousemove.defaultPrevented).to.be.equal(true);
          });
        });

        suite('prevent-handled', () => {
          setup(() => {
            controls.applyConstraints(
                {eventHandlingBehavior: 'prevent-handled'});
          });

          test('does not cancel unhandled UI events', () => {
            const mousedown = dispatchSyntheticEvent(element, 'mousedown');
            const mousemove = dispatchSyntheticEvent(element, 'mousemove');

            expect(mousemove.defaultPrevented).to.be.equal(false);
          });
        });
      });

      suite('zooming', () => {
        suite('allow-when-focused', () => {
          setup(() => {
            controls.applyConstraints({zoomPolicy: 'allow-when-focused'});
            settleControls(controls);
          });

          test('does not zoom when scrolling while blurred', () => {
            expect(controls.cameraSpherical.radius)
                .to.be.equal(DEFAULT_CONSTRAINTS.nearOrbitRadius);

            dispatchSyntheticEvent(element, 'wheel');

            settleControls(controls);

            expect(controls.cameraSpherical.radius)
                .to.be.equal(DEFAULT_CONSTRAINTS.nearOrbitRadius);
          });

          test('does zoom when scrolling while focused', () => {
            expect(controls.cameraSpherical.radius)
                .to.be.equal(DEFAULT_CONSTRAINTS.nearOrbitRadius);

            element.focus();

            dispatchSyntheticEvent(element, 'wheel');

            settleControls(controls);

            expect(controls.cameraSpherical.radius)
                .to.be.greaterThan(DEFAULT_CONSTRAINTS.nearOrbitRadius);
          });
        });

        suite('always-allow', () => {
          setup(() => {
            controls.applyConstraints({zoomPolicy: 'always-allow'});
            settleControls(controls);
          });

          test('zooms when scrolling, even while blurred', () => {
            expect(controls.cameraSpherical.radius)
                .to.be.equal(DEFAULT_CONSTRAINTS.nearOrbitRadius);

            dispatchSyntheticEvent(element, 'wheel');

            settleControls(controls);

            expect(controls.cameraSpherical.radius)
                .to.be.greaterThan(DEFAULT_CONSTRAINTS.nearOrbitRadius);
          });
        });
      });
    });
  });
});
