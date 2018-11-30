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


import {PerspectiveCamera, Vector3} from 'three';

import {PatchedOrbitControls} from '../../three-components/PatchedOrbitControls.js';

const expect = chai.expect;

suite('PatchedOrbitControls', () => {
  const origin = new Vector3(0, 0, 0);
  const cameraStartingPosition = new Vector3(0, 0, 1);
  let element;
  let camera;
  let controls;

  setup(() => {
    element = document.createElement('div');
    camera = new PerspectiveCamera();
    camera.position.copy(cameraStartingPosition);
    controls = new PatchedOrbitControls(camera, element);
    controls.enableKeys = false;
  });

  teardown(() => {
    controls.dispose();
  });

  suite('global keyboard input', () => {
    test('does not change orbital position of camera', () => {
      const event = new CustomEvent('keydown');
      event.keyCode = controls.keys.UP;
      window.dispatchEvent(event);

      expect(camera.position.z).to.be.equal(cameraStartingPosition.z);
    });
  });

  suite('local keyboard input', () => {
    test('changes orbital position of camera', () => {
      const event = new CustomEvent('keydown');
      event.keyCode = controls.keys.UP;
      element.dispatchEvent(event);

      expect(camera.position.z).to.not.be.equal(cameraStartingPosition.z);
    });
  });
});

window.V = Vector3;
