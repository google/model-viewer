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

import {$defaultPosterElement, $posterContainerElement, LoadingInterface, LoadingMixin, POSTER_TRANSITION_TIME} from '../../features/loading.js';
import ModelViewerElementBase, {$scene, $userInputElement} from '../../model-viewer-base.js';
import {CachingGLTFLoader} from '../../three-components/CachingGLTFLoader.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, dispatchSyntheticEvent, pickShadowDescendant, rafPasses, until} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;
const CUBE_GLB_PATH = assetPath('models/cube.gltf');
const HORSE_GLB_PATH = assetPath('models/Horse.glb');

suite('ModelViewerElementBase with LoadingMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName: string;
    let ModelViewerElement:
        Constructor<ModelViewerElementBase&LoadingInterface>;

    setup(() => {
      tagName = `model-viewer-loading-${nextId++}`;
      ModelViewerElement = class extends LoadingMixin
      (ModelViewerElementBase) {
        static get is() {
          return tagName;
        }
      };
      customElements.define(tagName, ModelViewerElement);
    });

    BasicSpecTemplate(() => ModelViewerElement, () => tagName);

    // TODO: Elements must have loaded to hide poster...

    suite('loading', () => {
      let element: ModelViewerElementBase&LoadingInterface;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);
        element.poster = assetPath('../screenshot.png');

        // Wait at least a microtask for size calculations
        await timePasses();
      });

      teardown(() => {
        CachingGLTFLoader.clearCache();

        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('creates a poster element that captures interactions', async () => {
        const picked = pickShadowDescendant(element);
        expect(picked).to.be.ok;
        // TODO(cdata): Leaky internal details here:
        expect(picked!.id).to.be.equal('default-poster');
      });

      test('does not load when hidden from render tree', async () => {
        let loadDispatched = false;
        let preloadDispatched = false;
        const loadHandler = () => {
          loadDispatched = true;
        };
        const preloadHandler = () => {
          preloadDispatched = true;
        };

        element.addEventListener('load', loadHandler);
        element.addEventListener('preload', preloadHandler);

        element.style.display = 'none';

        // Give IntersectionObserver a chance to notify. In Chrome, this takes
        // two rAFs (empirically observed). Await extra time just in case:
        await timePasses(100);

        element.src = CUBE_GLB_PATH;

        await timePasses(500);  // Arbitrary time to allow model to load

        element.removeEventListener('load', loadHandler);
        element.removeEventListener('preload', preloadHandler);

        expect(loadDispatched).to.be.false;
        expect(preloadDispatched).to.be.false;
      });

      suite('load', () => {
        suite('when a model src changes after loading', () => {
          setup(async () => {
            element.src = CUBE_GLB_PATH;
            await waitForEvent(element, 'load');
          });

          test('only dispatches load once per src change', async () => {
            let loadCount = 0;
            const onLoad = () => {
              loadCount++;
            };

            element.addEventListener('load', onLoad);

            try {
              element.src = HORSE_GLB_PATH;

              await waitForEvent(element, 'load');

              element.src = CUBE_GLB_PATH;

              await waitForEvent(element, 'load');

              // Give any late-dispatching events a chance to dispatch
              await timePasses(300);

              expect(loadCount).to.be.equal(2);
            } finally {
              element.removeEventListener('load', onLoad);
            }
          });

          test('getDimensions() returns correct size', () => {
            const size = element.getDimensions();
            expect(size.x).to.be.eq(1);
            expect(size.y).to.be.eq(1);
            expect(size.z).to.be.eq(1);
          });

          test('generates 3DModel schema', async () => {
            element.generateSchema = true;
            await element.updateComplete;
            const {schemaElement} = element[$scene];
            expect(schemaElement.type).to.be.eq('application/ld+json');
            expect(schemaElement.parentElement).to.be.eq(document.head);
            const json = JSON.parse(schemaElement.textContent!);
            const encoding = json.encoding[0];

            expect(encoding.contentUrl).to.be.eq(CUBE_GLB_PATH);
            expect(encoding.encodingFormat).to.be.eq('model/gltf+json');

            element.generateSchema = false;
            await element.updateComplete;
            expect(schemaElement.parentElement).to.be.not.ok;
          });
        });
      });

      suite('loading', () => {
        suite('src changes quickly', () => {
          test(
              'eventually notifies that current src is preloaded', async () => {
                element.loading = 'eager';
                element.src = CUBE_GLB_PATH;

                await timePasses();

                element.src = HORSE_GLB_PATH;

                let preloadEvent = null;
                const onPreload = (event: CustomEvent) => {
                  if (event.detail.url === HORSE_GLB_PATH) {
                    preloadEvent = event;
                  }
                };
                element.addEventListener<any>('preload', onPreload);

                await until(() => element.loaded);

                await timePasses();

                element.removeEventListener<any>('preload', onPreload);

                expect(preloadEvent).to.be.ok;
              });
        });


        suite('reveal', () => {
          suite('auto', () => {
            test('hides poster when element loads', async () => {
              element.loading = 'eager';
              element.src = CUBE_GLB_PATH;

              await waitForEvent(
                  element,
                  'model-visibility',
                  (event: any) => event.detail.visible);

              await rafPasses();

              const input = element[$userInputElement];
              const picked = pickShadowDescendant(element);

              expect(picked).to.be.equal(input);
            });
          });

          suite('interaction', () => {
            test('retains poster after loading', async () => {
              element.loading = 'eager';
              element.reveal = 'interaction';
              element.src = CUBE_GLB_PATH;

              await waitForEvent(element, 'load');
              await timePasses(POSTER_TRANSITION_TIME + 100);

              const input = element[$userInputElement];
              const picked = pickShadowDescendant(element);

              expect(picked).to.not.be.equal(input);
            });

            suite('when focused', () => {
              test(
                  'can hide the poster with keyboard interaction', async () => {
                    element.loading = 'eager';
                    element.reveal = 'interaction';
                    element.src = CUBE_GLB_PATH;

                    const posterElement =
                        (element as any)[$defaultPosterElement];
                    const inputElement = element[$userInputElement];

                    await waitForEvent(element, 'load');

                    // NOTE(cdata): Currently, Firefox does not forward focus
                    // when delegatesFocus is true but focus is triggered
                    // manually (e.g., with the .focus() method).
                    posterElement.focus();

                    expect(element.shadowRoot!.activeElement)
                        .to.be.equal(posterElement);

                    dispatchSyntheticEvent(
                        posterElement, 'keydown', {keyCode: 13});

                    await until(() => {
                      return element.shadowRoot!.activeElement === inputElement;
                    });
                  });
            });
          });

          suite('manual', () => {
            test('does not hide poster until dismissed', async () => {
              element.loading = 'eager';
              element.reveal = 'manual';
              element.src = CUBE_GLB_PATH;

              const posterElement = (element as any)[$defaultPosterElement];
              const input = element[$userInputElement];

              await waitForEvent(element, 'load');

              posterElement.focus();

              expect(element.shadowRoot!.activeElement)
                  .to.be.equal(posterElement);

              element.dismissPoster();

              await until(() => {
                return element.shadowRoot!.activeElement === input;
              });
            });
          });
        });
      });

      suite('configuring poster via attribute', () => {
        suite('removing the attribute', () => {
          test('sets poster to null', async () => {
            // NOTE(cdata): This is less important after we resolve
            // https://github.com/PolymerLabs/model-viewer/issues/76
            element.setAttribute('poster', CUBE_GLB_PATH);
            await timePasses();
            element.removeAttribute('poster');
            await timePasses();
            expect(element.poster).to.be.equal(null);
          });
        });
      });

      suite('with loaded model src', () => {
        setup(() => {
          element.src = CUBE_GLB_PATH;
        });

        test('can be hidden imperatively', async () => {
          const ostensiblyThePoster = pickShadowDescendant(element);

          element.dismissPoster();

          await waitForEvent<CustomEvent>(
              element,
              'model-visibility',
              event => event.detail.visible === true);

          await rafPasses();

          const ostensiblyNotThePoster = pickShadowDescendant(element);

          expect(ostensiblyThePoster).to.not.be.equal(ostensiblyNotThePoster);
        });

        suite('when poster is hidden', () => {
          setup(async () => {
            element.dismissPoster();
            await waitForEvent<CustomEvent>(
                element,
                'model-visibility',
                event => event.detail.visible === true);
            await rafPasses();
          });

          test('allows the input to be interactive', async () => {
            const input = element[$userInputElement];
            const picked = pickShadowDescendant(element);

            expect(picked).to.be.equal(input);
          });

          test('when src is reset, poster is dismissable', async () => {
            const posterElement = (element as any)[$defaultPosterElement];
            const posterContainer = (element as any)[$posterContainerElement];
            const inputElement = element[$userInputElement];

            element.reveal = 'interaction';
            element.src = null;

            await timePasses();

            element.src = CUBE_GLB_PATH;

            await timePasses();

            expect(posterContainer.classList.contains('show')).to.be.true;

            posterElement.focus();

            expect(element.shadowRoot!.activeElement)
                .to.be.equal(posterElement);

            dispatchSyntheticEvent(posterElement, 'keydown', {keyCode: 13});

            await until(() => {
              return element.shadowRoot!.activeElement === inputElement;
            });
          });
        });
      });
    });
  });
});
