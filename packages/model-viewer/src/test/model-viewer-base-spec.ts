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

import ModelViewerElementBase, {$renderer, $scene, $userInputElement} from '../model-viewer-base.js';
import {Renderer} from '../three-components/Renderer.js';
import {Constructor, timePasses, waitForEvent} from '../utilities.js';

import {assetPath, spy, until} from './helpers.js';
import {BasicSpecTemplate} from './templates.js';


const expect = chai.expect;

const expectBlobDimensions =
    async (blob: Blob, width: number, height: number) => {
  const img = await new Promise<HTMLImageElement>((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.src = url;
  });

  expect(img.width).to.be.equal(Math.round(width));
  expect(img.height).to.be.equal(Math.round(height));
};

suite('ModelViewerElementBase', () => {
  test('is not registered as a custom element by default', () => {
    expect(customElements.get('model-viewer-base')).to.be.equal(undefined);
  });

  suite('when registered', () => {
    let nextId = 0;
    let tagName: string;
    let ModelViewerElement: Constructor<ModelViewerElementBase>;

    setup(() => {
      tagName = `model-viewer-base-${nextId++}`;
      ModelViewerElement = class extends ModelViewerElementBase {
        static get is() {
          return tagName;
        }
      };
      customElements.define(tagName, ModelViewerElement);
    });

    BasicSpecTemplate(() => ModelViewerElement, () => tagName);

    suite('with alt text', () => {
      let element: ModelViewerElementBase;
      let input: HTMLDivElement;

      setup(() => {
        element = new ModelViewerElement();
        input = element[$userInputElement];
        document.body.insertBefore(element, document.body.firstChild);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('gives the input a related aria-label', async () => {
        const altText = 'foo';
        element.alt = altText;
        await timePasses();
        expect(input.getAttribute('aria-label')).to.be.equal(altText);
      });

      suite('that is removed', () => {
        test('reverts input to default aria-label', async () => {
          const defaultAriaLabel = input.getAttribute('aria-label');
          const altText = 'foo';

          element.alt = altText;
          await timePasses();
          element.alt = null;
          await timePasses();

          expect(input.getAttribute('aria-label'))
              .to.be.equal(defaultAriaLabel);
        });
      });
    });

    suite('with a valid src', () => {
      let element: ModelViewerElementBase;
      setup(() => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('eventually dispatches a load event', async () => {
        const sourceLoads = waitForEvent(element, 'load');
        element.src = assetPath('models/Astronaut.glb');
        await sourceLoads;
      });


      suite('that changes before the model loads', () => {
        test('it loads the second value on microtask timing', async () => {
          element.src = assetPath('models/Astronaut.glb');
          await timePasses();
          element.src = assetPath('models/Horse.glb');
          await waitForEvent(element, 'load');

          expect(element[$scene].url)
              .to.be.equal(assetPath('models/Horse.glb'));
        });

        test('it loads the second value on task timing', async () => {
          element.src = assetPath('models/Astronaut.glb');
          await timePasses(1);
          element.src = assetPath('models/Horse.glb');
          await waitForEvent(element, 'load');

          expect(element[$scene].url)
              .to.be.equal(assetPath('models/Horse.glb'));
        });
      });
    });

    suite('with an invalid src', () => {
      let element: ModelViewerElementBase;
      setup(() => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);
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

    suite('when losing the GL context', () => {
      let element: ModelViewerElementBase;
      setup(() => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('dispatches a related error event', async () => {
        const {threeRenderer, canvas3D} = Renderer.singleton;

        canvas3D.addEventListener('webglcontextlost', function(event) {
          event.preventDefault();
          Renderer.resetSingleton();
        }, false);

        const errorEventDispatches = waitForEvent(element, 'error');
        // We make a best effor to simulate the real scenario here, but
        // for some cases like headless Chrome WebGL might be disabled,
        // so we simulate the scenario.
        // @see https://threejs.org/docs/index.html#api/en/renderers/WebGLRenderer.forceContextLoss
        if (threeRenderer.getContext() != null) {
          threeRenderer.forceContextLoss();
        } else {
          threeRenderer.domElement.dispatchEvent(
              new CustomEvent('webglcontextlost'));
        }
        const event = await errorEventDispatches;
        expect((event as any).detail.type).to.be.equal('webglcontextlost');
      });
    });

    suite('capturing screenshots', () => {
      let element: ModelViewerElementBase;
      let width: number;
      let height: number;
      setup(async () => {
        element = new ModelViewerElement();

        // Avoid testing our memory ceiling in CI by limiting the size
        // of the screenshots we produce in these tests:
        width = 32;
        height = 64;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;

        document.body.insertBefore(element, document.body.firstChild);

        const modelLoads = waitForEvent(element, 'load');
        element.src = assetPath('models/cube.gltf');
        await modelLoads;
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      suite('toDataURL', () => {
        test('produces a URL-compatible string', () => {
          const dataUrlMatcher = /^data\:image\//;
          expect(dataUrlMatcher.test(element.toDataURL())).to.be.true;
        });
      });

      suite('toBlob', () => {
        test('produces a blob', async () => {
          const blob = await element.toBlob();
          expect(blob).to.not.be.null;
        });

        test('can convert blob to object URL', async () => {
          const blob = await element.toBlob();
          const objectUrl = URL.createObjectURL(blob);
          const objectUrlMatcher = /^blob\:/;
          expect(objectUrlMatcher.test(objectUrl)).to.be.true;
        });

        test('has size', async () => {
          const blob = await element.toBlob();
          expect(blob.size).to.be.greaterThan(0);
        });

        test('uses fallbacks on unsupported browsers', async () => {
          // Emulate unsupported browser
          let restoreCanvasToBlob = () => {};
          try {
            restoreCanvasToBlob =
                spy(HTMLCanvasElement.prototype, 'toBlob', {value: undefined});
          } catch (error) {
            // Ignored...
          }

          const blob = await element.toBlob();
          expect(blob).to.not.be.null;

          restoreCanvasToBlob();
        });

        test(
            'blobs on supported and unsupported browsers are equivalent',
            async () => {
              let restoreCanvasToBlob = () => {};
              try {
                restoreCanvasToBlob = spy(
                    HTMLCanvasElement.prototype, 'toBlob', {value: undefined});
              } catch (error) {
                // Ignored...
              }

              const unsupportedBrowserBlob = await element.toBlob();

              restoreCanvasToBlob();

              const supportedBrowserBlob = await element.toBlob();

              // Blob.prototype.arrayBuffer is not available in Edge / Safari
              // Using Response to get arrayBuffer instead
              const supportedBrowserResponse =
                  new Response(supportedBrowserBlob);
              const unsupportedBrowserResponse =
                  new Response(unsupportedBrowserBlob);

              const supportedBrowserArrayBuffer =
                  await supportedBrowserResponse.arrayBuffer();
              const unsupportedBrowserArrayBuffer =
                  await unsupportedBrowserResponse.arrayBuffer();

              expect(unsupportedBrowserArrayBuffer)
                  .to.eql(supportedBrowserArrayBuffer);
            });

        test.skip('idealAspect gives the proper blob dimensions', async () => {
          const basicBlob = await element.toBlob();
          const idealBlob = await element.toBlob({idealAspect: true});
          const idealHeight = 32 / element[$scene].idealAspect;

          const {dpr, scaleFactor} = element[$renderer];
          const f = dpr * scaleFactor;
          await expectBlobDimensions(basicBlob, width * f, height * f);
          await expectBlobDimensions(idealBlob, width * f, idealHeight * f);
        });
      });
    });

    suite('orchestrates rendering', () => {
      let elements: Array<ModelViewerElementBase> = [];

      setup(async () => {
        elements.push(new ModelViewerElement());
        elements.push(new ModelViewerElement());
        elements.push(new ModelViewerElement());

        for (let element of elements) {
          element.style.position = 'relative';
          element.style.marginBottom = '100vh';
          element.src = assetPath('models/cube.gltf');
          document.body.insertBefore(element, document.body.firstChild);
        }
      });

      teardown(() => {
        elements.forEach(
            element => element.parentNode != null &&
                element.parentNode.removeChild(element));
      });

      test('sets a model within viewport to be visible', async () => {
        await until(() => {
          return elements[2].modelIsVisible;
        });

        expect(elements[2].modelIsVisible).to.be.true;
      });

      test.skip('only models visible in the viewport', async () => {
        // IntersectionObserver needs to set appropriate
        // visibility on the scene, lots of timing issues when
        // running -- wait for the visibility flags to be flipped
        await until(() => {
          return elements
              .map((element, index) => {
                return (index === 0) === element.modelIsVisible;
              })
              .reduce(((l, r) => l && r), true);
        });

        expect(elements[0].modelIsVisible).to.be.ok;
        expect(elements[1].modelIsVisible).to.not.be.ok;
        expect(elements[2].modelIsVisible).to.not.be.ok;
      });
    });
  });
});
