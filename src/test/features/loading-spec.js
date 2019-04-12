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

import {$defaultPosterElement, LoadingMixin, POSTER_TRANSITION_TIME} from '../../features/loading.js';
import ModelViewerElementBase, {$canvas} from '../../model-viewer-base.js';
import {CachingGLTFLoader} from '../../three-components/CachingGLTFLoader.js';
import {assetPath, dispatchSyntheticEvent, pickShadowDescendant, rafPasses, timePasses, until, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;
const ASTRONAUT_GLB_PATH = assetPath('Astronaut.glb');
const HORSE_GLB_PATH = assetPath('Horse.glb');

suite('ModelViewerElementBase with LoadingMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName;
    let ModelViewerElement;

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
      let element;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.appendChild(element);
        element.poster = assetPath('poster.png');

        // Wait at least a microtask for size calculations
        await timePasses();
      });

      teardown(() => {
        CachingGLTFLoader.clearCache();

        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('creates a poster element that captures interactions', () => {
        const picked = pickShadowDescendant(element);
        // TODO(cdata): Leaky internal details here:
        expect(picked.id).to.be.equal('default-poster');
      });

      suite('preload', () => {
        suite('src changes quickly', () => {
          test(
              'eventually notifies that current src is preloaded', async () => {
                element.preload = true;
                element.src = ASTRONAUT_GLB_PATH;

                await timePasses();

                element.src = HORSE_GLB_PATH;

                let preloadEvent = null;
                const onPreload = (event) => {
                  if (event.detail.url === HORSE_GLB_PATH) {
                    preloadEvent = event;
                  }
                };
                element.addEventListener('preload', onPreload);

                await until(() => element.loaded);

                element.removeEventListener('preload', onPreload);

                expect(preloadEvent).to.be.ok;
              });
        });


        suite('reveal', () => {
          suite('auto', () => {
            test('hides poster when element loads', async () => {
              element.preload = true;
              element.src = ASTRONAUT_GLB_PATH;

              await waitForEvent(element, 'load');

              const canvas = element[$canvas];
              const picked = pickShadowDescendant(element);

              expect(picked).to.be.equal(canvas);
            });
          });

          suite('interaction', () => {
            test('retains poster after preloading', async () => {
              element.preload = true;
              element.reveal = 'interaction';
              element.src = ASTRONAUT_GLB_PATH;

              await waitForEvent(element, 'preload');
              await timePasses(POSTER_TRANSITION_TIME + 100);

              const canvas = element[$canvas];
              const picked = pickShadowDescendant(element);

              expect(picked).to.not.be.equal(canvas);
            });

            suite('when focused', () => {
              test(
                  'can hide the poster with keyboard interaction', async () => {
                    element.preload = true;
                    element.reveal = 'interaction';
                    element.src = ASTRONAUT_GLB_PATH;

                    const posterElement = element[$defaultPosterElement];
                    const canvasElement = element[$canvas];

                    await waitForEvent(element, 'preload');

                    // NOTE(cdata): Currently, Firefox does not forward focus
                    // when delegatesFocus is true but focus is triggered
                    // manually (e.g., with the .focus() method).
                    posterElement.focus();

                    expect(element.shadowRoot.activeElement)
                        .to.be.equal(posterElement);

                    dispatchSyntheticEvent(
                        posterElement, 'keydown', {keyCode: 13});

                    await until(() => {
                      return element.shadowRoot.activeElement === canvasElement;
                    });
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
            element.setAttribute('poster', ASTRONAUT_GLB_PATH);
            await timePasses();
            element.removeAttribute('poster');
            await timePasses();
            expect(element.poster).to.be.equal(null);
          });
        });
      });

      suite('with loaded model src', () => {
        setup(() => {
          element.src = ASTRONAUT_GLB_PATH;
        });

        test('can be hidden imperatively', async () => {
          const ostensiblyThePoster = pickShadowDescendant(element);

          element.dismissPoster();

          await waitForEvent(
              element,
              'model-visibility',
              event => event.detail.visible === true);

          const ostensiblyNotThePoster = pickShadowDescendant(element);

          expect(ostensiblyThePoster).to.not.be.equal(ostensiblyNotThePoster);
        });

        suite('when poster is hidden', () => {
          setup(async () => {
            element.dismissPoster();
            await waitForEvent(
                element,
                'model-visibility',
                event => event.detail.visible === true);
          });

          test('allows the canvas to be interactive', async () => {
            const canvas = element[$canvas];
            const picked = pickShadowDescendant(element);

            expect(picked).to.be.equal(canvas);
          });
        });
      });
    });
  });
});
