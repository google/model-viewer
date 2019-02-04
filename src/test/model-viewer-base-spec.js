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

import ModelViewerElementBase, {$canvas, $renderer, $scene} from '../model-viewer-base.js';

import {assetPath, timePasses, until, waitForEvent} from './helpers.js';
import {BasicSpecTemplate} from './templates.js';

const expect = chai.expect;

suite('ModelViewerElementBase', () => {
  test('is not registered as a custom element by default', () => {
    expect(customElements.get('model-viewer-base')).to.be.equal(undefined);
  });

  suite('when registered', () => {
    let nextId = 0;
    let tagName;
    let ModelViewerElement;

    setup(() => {
      tagName = `model-viewer-${nextId++}`;
      ModelViewerElement = class extends ModelViewerElementBase {
        static get is() {
          return tagName;
        }
      };
      customElements.define(tagName, ModelViewerElement);
    });

    BasicSpecTemplate(() => ModelViewerElement, () => tagName);

    suite('with alt text', () => {
      let element;
      let canvas;

      setup(() => {
        element = new ModelViewerElement();
        canvas = element[$canvas];
        document.body.appendChild(element);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('gives the canvas a related aria-label', async () => {
        const altText = 'foo';
        const canvas = element[$canvas];
        element.alt = altText;
        await timePasses();
        expect(canvas.getAttribute('aria-label')).to.be.equal(altText);
      });

      suite('that is removed', () => {
        test('reverts canvas to default aria-label', async () => {
          const defaultAriaLabel = canvas.getAttribute('aria-label');
          const altText = 'foo';

          element.alt = altText;
          await timePasses();
          element.alt = null;
          await timePasses();

          expect(canvas.getAttribute('aria-label'))
              .to.be.equal(defaultAriaLabel);
        });
      });
    });

    suite('with a valid src', () => {
      let element;
      setup(() => {
        element = new ModelViewerElement();
        document.body.appendChild(element);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('eventually dispatches a load event', async () => {
        const sourceLoads = waitForEvent(element, 'load');
        element.src = assetPath('Astronaut.glb');
        await sourceLoads;
      });
    });

    suite('with an invalid src', () => {
      let element;
      setup(() => {
        element = new ModelViewerElement();
        document.body.appendChild(element);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('eventually dispatches an error event', async () => {
        const sourceErrors = waitForEvent(element, 'error');
        element.src = './does-not-exist.glb';
        await sourceErrors;
      });
    });

    suite('orchestrates rendering', () => {
      let elements = [];

      setup(async () => {
        elements.push(new ModelViewerElement());
        elements.push(new ModelViewerElement());
        elements.push(new ModelViewerElement());

        const loaded = elements.map(e => waitForEvent(e, 'load'));

        for (let element of elements) {
          element.style.height = '200vh';
          element.style.width = '100vw';
          element.autoRotate = true;
          element.src = assetPath('cube.gltf');
          document.body.appendChild(element);
        }

        await Promise.all(loaded);
      });

      teardown(() => {
        elements.forEach(
            e => e.parentNode != null && e.parentNode.removeChild(element));
      });

      test.skip('only models visible in the viewport', async () => {
        const renderer = elements[0][$renderer];

        // IntersectionObserver needs to set appropriate
        // visibility on the scene, lots of timing issues when
        // running -- wait for the visibility flags to be flipped
        await until(() => {
          return elements
              .map((element, index) => {
                return (index === 0) === element[$scene].isVisible;
              })
              .reduce(((l, r) => l && r), true);
        });

        expect(elements[0][$scene].isVisible).to.be.ok;
        expect(elements[1][$scene].isVisible).to.not.be.ok;
        expect(elements[2][$scene].isVisible).to.not.be.ok;
      });
    });
  });
});
