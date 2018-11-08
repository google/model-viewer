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

import {$controls, ControlsMixin} from '../../features/controls.js';
import XRModelElementBase, {$scene} from '../../xr-model-element-base.js';
import {timePasses, waitForEvent} from '../helpers.js';

const expect = chai.expect;

suite('XRModelElementBase with ControlsMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName;
    let XRModelElement;

    setup(() => {
      tagName = `xr-model-controls-${nextId++}`;
      XRModelElement = ControlsMixin(XRModelElementBase);
      customElements.define(tagName, XRModelElement);
    });

    test('can be directly instantiated', () => {
      const element = new XRModelElement();
      expect(element).to.be.ok;
    });

    test('can be instantiated with document.createElement', () => {
      const element = document.createElement(tagName);
      expect(element).to.be.ok;
    });

    suite('controls', () => {
      let element;

      setup(async () => {
        element = new XRModelElement();
        document.body.appendChild(element);
        element.src = './examples/assets/cube.gltf';
        element.controls = true;

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        element.remove();
      });

      test('creates OrbitControls if enabled', () => {
        expect(element[$controls]).to.be.ok;
      });

      test(
          'sets OrbitControls maxDistance to the camera framed distance',
          () => {
            const cameraZ = element[$scene].camera.position.z;
            expect(element[$controls].maxDistance).to.be.equal(cameraZ);
          });

      test('removes OrbitControls if disabled after enabled', async () => {
        element.controls = false;
        await timePasses();
        expect(element[$controls]).to.be.not.ok;
      });
    });
  });
});
