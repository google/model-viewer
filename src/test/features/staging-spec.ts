/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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

import {Vector3} from 'three';

import {StagingMixin, AUTO_ROTATE_DELAY_AFTER_USER_INTERACTION} from '../../features/staging.js';
import ModelViewerElementBase, {$scene, $onUserModelOrbit} from '../../model-viewer-base.js';
import {assetPath, timePasses, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;

const ODD_SHAPE_GLB_PATH = assetPath('odd-shape.glb');
const CENTER_OFFSET = new Vector3(0.5, -1.25, 0.5);
const ORIGIN_OFFSET = new Vector3();

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
      document.body.appendChild(element);

      await waitForEvent(element, 'load');
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    suite('align-model', () => {
      test('centers the model in the frame by default', () => {
        const offset = (element as any)[$scene].unscaledModelOffset;
        expect(offset).to.be.deep.equal(CENTER_OFFSET);
      });

      suite('origin alignment', () => {
        setup(async () => {
          element.alignModel = 'origin';
          await timePasses();
        });

        test('aligns model origin with the scene origin', () => {
          // NOTE(cdata): We clone the offset as a cheap way of normalizing
          // -0 values as 0
          const offset = (element as any)[$scene].unscaledModelOffset.clone();
          expect(offset).to.be.deep.equal(ORIGIN_OFFSET);
        });
      });

      suite('mixed values', () => {
        suite('two values', () => {
          test('aligns x and y axes accordingly', async () => {
            element.alignModel = 'center origin';
            await timePasses();

            const offset = (element as any)[$scene].unscaledModelOffset.clone();
            expect(offset).to.be.deep.equal(
                new Vector3(CENTER_OFFSET.x, ORIGIN_OFFSET.y, CENTER_OFFSET.z));
          });
        });

        suite('three values', () => {
          test('aligns x, y and z axes accordingly', async () => {
            element.alignModel = 'origin center origin';
            await timePasses();

            const offset = (element as any)[$scene].unscaledModelOffset.clone();
            expect(offset).to.be.deep.equal(
                new Vector3(ORIGIN_OFFSET.x, CENTER_OFFSET.y, ORIGIN_OFFSET.z));
          });
        });
      });
    });

    suite('auto-rotate', () => {
      setup(() => {
        element.autoRotate = true;
      });

      test('causes the model to rotate over time', async () => {
        const {turntableRotation} = element;
        await timePasses(50);  // An arbitrary amount of time, greater than one
                               // rAF though
        expect(element.turntableRotation).to.be.greaterThan(turntableRotation);
      });

      suite('when the model is not visible', () => {
        setup(() => {
          Object.defineProperty(
            element, 'modelIsVisible', {value:false});
        });

        test('does not cause the model to rotate over time', async () => {
          const {turntableRotation} = element;
          await timePasses(50);  // An arbitrary amount of time, greater than one
                                 // rAF though
          expect(element.turntableRotation).to.be.equal(turntableRotation);
        });
      });

      test('pauses rotate after user interaction', async () => {
        const {turntableRotation: initialTurntableRotation} = element;

        element[$onUserModelOrbit]();

        await timePasses(50);  // An arbitrary amount of time, greater than one
                               // rAF though
        expect(element.turntableRotation).to.be.equal(initialTurntableRotation);

        await timePasses(AUTO_ROTATE_DELAY_AFTER_USER_INTERACTION);

        expect(element.turntableRotation).to.be.greaterThan(initialTurntableRotation);
      });
    });
  });
});
