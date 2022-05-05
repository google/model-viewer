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

import {PerspectiveCamera, Vector3} from 'three';

import {$controls} from '../../features/controls.js';
import {$userInputElement} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {ChangeSource, DEFAULT_OPTIONS, KeyCode, SmoothControls} from '../../three-components/SmoothControls.js';
import {waitForEvent} from '../../utilities.js';
import {dispatchSyntheticEvent} from '../helpers.js';

const expect = chai.expect;

const ONE_FRAME_DELTA = 1000.0 / 60.0;
const FIFTY_FRAME_DELTA = 50.0 * ONE_FRAME_DELTA;

const HALF_PI = Math.PI / 2.0;
const QUARTER_PI = HALF_PI / 2.0;
const THREE_QUARTERS_PI = HALF_PI + QUARTER_PI;

const USER_INTERACTION_CHANGE_SOURCE = 'user-interaction';
const DEFAULT_INTERACTION_CHANGE_SOURCE = 'none';

/**
 * Settle controls by performing 50 frames worth of updates
 */
export const settleControls = (controls: SmoothControls) =>
    controls.update(performance.now(), FIFTY_FRAME_DELTA);

suite('SmoothControls', () => {
  let controls: SmoothControls;
  let camera: PerspectiveCamera;
  let modelViewer: ModelViewerElement;
  let element: HTMLDivElement;

  setup(() => {
    modelViewer = new ModelViewerElement();
    element = modelViewer[$userInputElement];
    controls = (modelViewer as any)[$controls];
    camera = controls.camera;

    modelViewer.style.height = '100px';
    element.tabIndex = 0;

    document.body.insertBefore(modelViewer, document.body.firstChild);

    controls.enableInteraction();
  });

  teardown(() => {
    document.body.removeChild(modelViewer);

    controls.disableInteraction();
  });

  suite('when updated', () => {
    test('repositions the camera within the configured radius options', () => {
      settleControls(controls);

      const radius = camera.position.length();

      expect(radius).to.be.within(
          DEFAULT_OPTIONS.minimumRadius as number,
          DEFAULT_OPTIONS.maximumRadius as number);
    });

    suite('when orbit is changed', () => {
      suite('radius', () => {
        test('changes the absolute distance to the target', () => {
          settleControls(controls);

          controls.setOrbit(0, HALF_PI, 1.5);
          settleControls(controls);
          expect(camera.position.length()).to.be.equal(1.5);
        });
      });

      suite('azimuth', () => {
        test('wraps and takes the shortest path', () => {
          controls.setOrbit(QUARTER_PI);
          settleControls(controls);
          expect(controls.getCameraSpherical().theta).to.be.equal(QUARTER_PI);

          controls.setOrbit(4 * Math.PI - HALF_PI);
          expect(controls.getCameraSpherical().theta)
              .to.be.closeTo(4 * Math.PI + QUARTER_PI, 0.0001);

          controls.update(performance.now(), ONE_FRAME_DELTA);
          expect(Math.abs(controls.getCameraSpherical().theta))
              .to.be.lessThan(4 * Math.PI + QUARTER_PI);

          settleControls(controls);
          expect(controls.getCameraSpherical().theta)
              .to.be.closeTo(4 * Math.PI - HALF_PI, 0.0001);

          controls.setOrbit(THREE_QUARTERS_PI);
          expect(controls.getCameraSpherical().theta)
              .to.be.closeTo(Math.PI + HALF_PI, 0.0001);

          controls.update(performance.now(), ONE_FRAME_DELTA);
          expect(Math.abs(controls.getCameraSpherical().theta))
              .to.be.lessThan(Math.PI + HALF_PI);

          settleControls(controls);
          expect(controls.getCameraSpherical().theta)
              .to.be.closeTo(THREE_QUARTERS_PI, 0.0001);
        });

        test(
            'adjustOrbit does not move the goal theta more than pi past the current theta',
            () => {
              controls.adjustOrbit(-Math.PI * 3 / 2, 0, 0);

              controls.update(performance.now(), ONE_FRAME_DELTA);
              const startingTheta = controls.getCameraSpherical().theta;
              expect(startingTheta).to.be.greaterThan(0);

              controls.adjustOrbit(-Math.PI * 3 / 2, 0, 0);
              settleControls(controls);
              const goalTheta = controls.getCameraSpherical().theta;
              expect(goalTheta).to.be.greaterThan(Math.PI);
              expect(goalTheta).to.be.lessThan(startingTheta + Math.PI);
            });
      });
    });

    suite('keyboard input', () => {
      let initialCameraPosition: Vector3;

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

    suite('customizing options', () => {
      suite('azimuth', () => {
        setup(() => {
          controls.applyOptions({
            minimumAzimuthalAngle: -1 * THREE_QUARTERS_PI,
            maximumAzimuthalAngle: THREE_QUARTERS_PI
          });
        });

        test('prevents camera azimuth from exceeding options', () => {
          controls.setOrbit(-Math.PI, 0, 0);
          settleControls(controls);
          expect(controls.getCameraSpherical().theta)
              .to.be.equal(-1 * THREE_QUARTERS_PI);

          controls.setOrbit(Math.PI, 0, 0);
          controls.update(performance.now(), ONE_FRAME_DELTA);
          expect(Math.abs(controls.getCameraSpherical().theta))
              .to.be.lessThan(THREE_QUARTERS_PI);

          settleControls(controls);
          expect(controls.getCameraSpherical().theta)
              .to.be.equal(THREE_QUARTERS_PI);
        });
      });

      suite('pole', () => {
        setup(() => {
          controls.applyOptions({
            minimumPolarAngle: QUARTER_PI,
            maximumPolarAngle: THREE_QUARTERS_PI
          });
        });

        test('prevents camera polar angle from exceeding options', () => {
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

        test('prevents camera distance from exceeding options', () => {
          controls.setOrbit(0, 0, 0);
          settleControls(controls);

          expect(controls.getCameraSpherical().radius).to.be.equal(10);

          controls.setOrbit(0, 0, 100);
          settleControls(controls);

          expect(controls.getCameraSpherical().radius).to.be.equal(20);
        });
      });

      suite('field of view', () => {
        setup(() => {
          controls.applyOptions(
              {minimumFieldOfView: 15, maximumFieldOfView: 20});
        });

        test('prevents field of view from exceeding options', () => {
          controls.setFieldOfView(5);
          settleControls(controls);

          expect(controls.getFieldOfView()).to.be.closeTo(15, 0.00001);

          controls.setFieldOfView(30);
          settleControls(controls);

          expect(controls.getFieldOfView()).to.be.closeTo(20, 0.00001);
        });
      });

      suite('interaction policy', () => {
        suite('allow-when-focused', () => {
          setup(() => {
            controls.applyOptions({interactionPolicy: 'allow-when-focused'});
            settleControls(controls);
          });

          test('does not zoom when scrolling while blurred', () => {
            const radius = controls.getCameraSpherical().radius;
            expect(controls.getFieldOfView())
                .to.be.closeTo(DEFAULT_OPTIONS.maximumFieldOfView!, 0.00001);

            dispatchSyntheticEvent(element, 'wheel', {deltaY: -1});

            settleControls(controls);

            expect(controls.getCameraSpherical().radius).to.be.equal(radius);
            expect(controls.getFieldOfView())
                .to.be.closeTo(DEFAULT_OPTIONS.maximumFieldOfView!, 0.00001);
          });

          test('does not orbit when pointing while blurred', () => {
            const originalPhi = controls.getCameraSpherical().phi;

            dispatchSyntheticEvent(
                element, 'mousedown', {clientX: 0, clientY: 10});
            dispatchSyntheticEvent(
                window, 'mousemove', {clientX: 0, clientY: 0});

            expect(controls.getCameraSpherical().phi).to.be.equal(originalPhi);
          });

          test('does zoom when scrolling while focused', () => {
            expect(controls.getFieldOfView())
                .to.be.closeTo(DEFAULT_OPTIONS.maximumFieldOfView!, 0.00001);

            element.focus();

            dispatchSyntheticEvent(element, 'wheel', {deltaY: -1});

            settleControls(controls);

            expect(controls.getFieldOfView())
                .to.be.lessThan(DEFAULT_OPTIONS.maximumFieldOfView!);
          });
        });

        suite('always-allow', () => {
          setup(() => {
            controls.applyOptions({interactionPolicy: 'always-allow'});
            settleControls(controls);
          });

          test('orbits when pointing, even while blurred', () => {
            const originalPhi = controls.getCameraSpherical().phi;

            element.dispatchEvent(new PointerEvent(
                'pointerdown', {pointerId: 8, clientX: 0, clientY: 10}));
            element.dispatchEvent(new PointerEvent(
                'pointermove', {pointerId: 8, clientX: 0, clientY: 0}));

            settleControls(controls);

            expect(controls.getCameraSpherical().phi)
                .to.be.greaterThan(originalPhi);
          });

          test('zooms when scrolling, even while blurred', () => {
            expect(controls.getFieldOfView())
                .to.be.closeTo(DEFAULT_OPTIONS.maximumFieldOfView!, 0.00001);

            dispatchSyntheticEvent(element, 'wheel', {deltaY: -1});

            settleControls(controls);

            expect(controls.getFieldOfView())
                .to.be.lessThan(DEFAULT_OPTIONS.maximumFieldOfView!);
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
              USER_INTERACTION_CHANGE_SOURCE,
            ];
            let changeSource: Array<string> = [];

            controls.addEventListener('change', ({source}) => {
              changeSource.push(source);
            });

            dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});
            controls.update(performance.now(), ONE_FRAME_DELTA);
            controls.update(performance.now(), ONE_FRAME_DELTA);
            controls.update(performance.now(), ONE_FRAME_DELTA);

            expect(changeSource).to.eql(expectedSources);
          });

          test('does not send "user-interaction" after setOrbit', () => {
            const expectedSources = [
              USER_INTERACTION_CHANGE_SOURCE,
              USER_INTERACTION_CHANGE_SOURCE,
              USER_INTERACTION_CHANGE_SOURCE,
              DEFAULT_INTERACTION_CHANGE_SOURCE,
              DEFAULT_INTERACTION_CHANGE_SOURCE,
            ];
            let changeSource: Array<string> = [];

            controls.addEventListener('change', ({source}) => {
              changeSource.push(source);
            });

            dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});

            controls.update(performance.now(), ONE_FRAME_DELTA);
            controls.update(performance.now(), ONE_FRAME_DELTA);

            controls.isUserChange = false;
            controls.setOrbit(3, 3, 3);

            controls.update(performance.now(), ONE_FRAME_DELTA);
            controls.update(performance.now(), ONE_FRAME_DELTA);

            expect(changeSource).to.eql(expectedSources);
          });

          suite('simultaneous user and imperative interaction', () => {
            test('reports source as user interaction', async () => {
              const eventDispatches = waitForEvent(controls, 'change');
              controls.adjustOrbit(1, 1, 1);
              dispatchSyntheticEvent(element, 'keydown', {keyCode: KeyCode.UP});
              settleControls(controls);

              const event: any = await eventDispatches;
              expect(event.source).to.be.equal(ChangeSource.USER_INTERACTION);
            });
          });
        });
      });
    });
  });
});
