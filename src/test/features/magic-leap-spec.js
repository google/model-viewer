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

import {MagicLeapMixin} from '../../features/magic-leap.js';
import ModelViewerElementBase from '../../model-viewer-base.js';
import {assetPath, pickShadowDescendant, timePasses} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;

suite('ModelViewerElementBase with MagicLeapMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName;
    let ModelViewerElement;

    setup(() => {
      tagName = `model-viewer-magic-leap-${nextId++}`;
      ModelViewerElement = class extends MagicLeapMixin
      (ModelViewerElementBase) {
        static get is() {
          return tagName;
        }
      };
      customElements.define(tagName, ModelViewerElement);
    });

    BasicSpecTemplate(() => ModelViewerElement, () => tagName);

    suite('magic-leap', () => {
      suite('in standard browser environments', () => {
        let element;

        setup(async () => {
          element = new ModelViewerElement();
          document.body.appendChild(element);
          element.magicLeap = true;

          // Wait at least a microtask for size calculations
          await timePasses(1);
        });

        teardown(() => {
          if (element.parentNode != null) {
            element.parentNode.removeChild(element);
          }
        });

        test('does not change model presentation', () => {
          const presented = pickShadowDescendant(element);

          expect(presented.classList.contains('container')).to.be.equal(true);
        });
      });

      suite('in the Helios browser environment', () => {
        let element;

        setup(async () => {
          self.mlWorld = {};

          element = new ModelViewerElement();
          document.body.appendChild(element);
          element.magicLeap = true;

          // Wait at least a microtask for size calculations
          await timePasses(10);
        });

        teardown(() => {
          if (element.parentNode != null) {
            element.parentNode.removeChild(element);
          }
          delete self.mlWorld;
        });

        test('shows an <ml-model>', () => {
          const presented = pickShadowDescendant(element);
          expect(presented.tagName).to.be.equal('ML-MODEL');
        });

        suite('with a src property', () => {
          setup(async () => {
            element.src = assetPath('Astronaut.glb');
            // Wait til microtask so that property changes can propagate
            await timePasses();
          });

          test('sets the same src on the <ml-model>', () => {
            const mlModel = pickShadowDescendant(element);
            expect(mlModel.getAttribute('src')).to.be.equal(element.src);
          });
        });
      });
    });
  });
});
