/* @license
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

import {AUTO_ROTATE_DELAY_AFTER_USER_INTERACTION, StagingMixin} from '../../features/staging.js';
import ModelViewerElementBase, {$onUserModelOrbit} from '../../model-viewer-base.js';
import {assetPath, timePasses, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;

const ODD_SHAPE_GLB_PATH = assetPath('odd-shape.glb');

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
          Object.defineProperty(element, 'modelIsVisible', {value: false});
        });

        test('does not cause the model to rotate over time', async () => {
          const {turntableRotation} = element;
          await timePasses(50);  // An arbitrary amount of time, greater than
                                 // one rAF though
          expect(element.turntableRotation).to.be.equal(turntableRotation);
        });
      });

      // TODO(#582)
      test.skip('pauses rotate after user interaction', async () => {
        const {turntableRotation: initialTurntableRotation} = element;

        element[$onUserModelOrbit]();

        await timePasses(50);  // An arbitrary amount of time, greater than one
                               // rAF though
        expect(element.turntableRotation).to.be.equal(initialTurntableRotation);

        await timePasses(AUTO_ROTATE_DELAY_AFTER_USER_INTERACTION);

        expect(element.turntableRotation)
            .to.be.greaterThan(initialTurntableRotation);
      });
    });
  });
});
