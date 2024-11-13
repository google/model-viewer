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

import {expect} from 'chai';

import {$defaultPosterElement, $posterContainerElement} from '../../features/loading.js';
import {$scene, $userInputElement} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {CachingGLTFLoader} from '../../three-components/CachingGLTFLoader.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, pickShadowDescendant, rafPasses, until} from '../helpers.js';

const CUBE_GLB_PATH = assetPath('models/cube.gltf');
const HORSE_GLB_PATH = assetPath('models/Horse.glb');

suite('Loading', () => {
  let element: ModelViewerElement;
  let firstChild: ChildNode|null;

  setup(async () => {
    element = new ModelViewerElement();
    firstChild = document.body.firstChild;
    document.body.insertBefore(element, firstChild);

    // Wait at least a microtask for size calculations
    await timePasses();
  });

  teardown(() => {
    CachingGLTFLoader.clearCache();

    if (element.parentNode != null) {
      element.parentNode.removeChild(element);
    }
  });

  suite('with a second element outside the viewport', () => {
    let element2: ModelViewerElement;

    setup(async () => {
      element2 = new ModelViewerElement();
      element2.loading = 'eager';
      document.body.insertBefore(element2, firstChild);
      element.style.height = '100vh';
      element2.style.height = '100vh';
      const load1 = waitForEvent(element, 'load');
      const load2 = waitForEvent(element2, 'load');
      element.src = CUBE_GLB_PATH;
      element2.src = CUBE_GLB_PATH;
      await Promise.all([load1, load2]);
    });

    teardown(() => {
      if (element2.parentNode != null) {
        element2.parentNode.removeChild(element2);
      }
    });

    test('first element is visible', () => {
      expect(element.modelIsVisible).to.be.true;
    });

    test('second element is not visible', () => {
      expect(element2.modelIsVisible).to.be.false;
    });

    suite('scroll to second element', () => {
      setup(() => {
        element2.scrollIntoView();
      });

      test('first element is not visible', async () => {
        await waitForEvent<CustomEvent>(
            element,
            'model-visibility',
            event => event.detail.visible === false);
      });

      test('second element is visible', async () => {
        await waitForEvent<CustomEvent>(
            element2,
            'model-visibility',
            event => event.detail.visible === true);
      });
    });
  });

  test('creates a poster element that captures interactions', async () => {
    const picked = pickShadowDescendant(element);
    expect(picked).to.be.ok;
    // TODO(cdata): Leaky internal details here:
    expect(picked!.id).to.be.equal('default-poster');
  });

  test('does not load when hidden from render tree', async () => {
    let loadDispatched = false;
    const loadHandler = () => {
      loadDispatched = true;
    };

    element.addEventListener('load', loadHandler);

    element.style.display = 'none';

    // Give IntersectionObserver a chance to notify. In Chrome, this takes
    // two rAFs (empirically observed). Await extra time just in case:
    await timePasses(100);

    element.src = CUBE_GLB_PATH;

    await timePasses(500);  // Arbitrary time to allow model to load

    element.removeEventListener('load', loadHandler);

    expect(loadDispatched).to.be.false;
  });

  suite('load', () => {
    suite('when a model src changes after loading', () => {
      setup(async () => {
        // The shadow is here to expose an earlier bug on unloading models.
        element.shadowIntensity = 1;
        element.src = CUBE_GLB_PATH;
        await waitForEvent(element, 'poster-dismissed');
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

      test('models are unloaded after src updates', async () => {
        element.src = HORSE_GLB_PATH;
        await waitForEvent(element, 'load');

        const {shadow, model, target} = element[$scene];
        const {children} = target;
        expect(children.length).to.be.eq(2, 'horse');
        expect(children).to.contain(shadow, 'horse shadow');
        expect(children).to.contain(model, 'horse model');

        element.src = CUBE_GLB_PATH;
        await waitForEvent(element, 'load');
        const {children: children2} = target;
        expect(children2.length).to.be.eq(2, 'cube');
        expect(children2).to.contain(shadow, 'cube shadow');
        expect(children2).to.contain(element[$scene].model, 'cube model');
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
      test('eventually notifies that current src is loaded', async () => {
        element.loading = 'eager';
        element.src = CUBE_GLB_PATH;

        const loadCubeEvent =
            waitForEvent(element, 'load') as Promise<CustomEvent>;

        await timePasses();

        element.src = HORSE_GLB_PATH;

        const loadCube = await loadCubeEvent;
        const loadHorse = await waitForEvent(element, 'load') as CustomEvent;

        expect(loadCube.detail.url).to.be.eq(CUBE_GLB_PATH);
        expect(loadHorse.detail.url).to.be.eq(HORSE_GLB_PATH);
      });
    });


    suite('reveal', () => {
      suite('auto', () => {
        test('hides poster when element loads', async () => {
          element.src = CUBE_GLB_PATH;
          const input = element[$userInputElement];

          expect(pickShadowDescendant(element))
              .to.be.not.equal(
                  input, 'the poster should be shown until the model loads');

          await waitForEvent(
              element,
              'model-visibility',
              (event: any) => event.detail.visible);

          await rafPasses();

          expect(pickShadowDescendant(element)).to.be.equal(input);

          element.reveal = 'manual';
          await element.updateComplete;
          await rafPasses();

          expect(pickShadowDescendant(element))
              .to.be.equal(input, 'changing reveal should not show the poster');
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

          expect(element.shadowRoot!.activeElement).to.be.equal(posterElement);

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
          element, 'model-visibility', event => event.detail.visible === true);

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

      test('when src is reset, poster is dismissible', async () => {
        const posterElement = (element as any)[$defaultPosterElement];
        const posterContainer = (element as any)[$posterContainerElement];
        const inputElement = element[$userInputElement];

        element.reveal = 'manual';
        element.src = null;
        element.showPoster();

        await timePasses();

        element.src = CUBE_GLB_PATH;

        await timePasses();

        expect(posterContainer.classList.contains('show')).to.be.true;

        posterElement.focus();

        expect(element.shadowRoot!.activeElement).to.be.equal(posterElement);

        element.dismissPoster();

        await until(() => {
          return element.shadowRoot!.activeElement === inputElement;
        });
      });
    });
  });
});
