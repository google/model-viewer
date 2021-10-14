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

import {Texture} from 'three';

import {BASE_OPACITY, EnvironmentInterface, EnvironmentMixin} from '../../features/environment.js';
import ModelViewerElementBase, {$scene} from '../../model-viewer-base.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {Renderer} from '../../three-components/Renderer.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, rafPasses} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;
const ALT_BG_IMAGE_URL = assetPath('environments/white_furnace.hdr');
const HDR_BG_IMAGE_URL = assetPath('environments/spruit_sunrise_1k_HDR.hdr');
const MODEL_URL = assetPath('models/reflective-sphere.gltf');

/**
 * Returns a promise that resolves when a given element is loaded
 * and has an environment map set that matches the passed in meta.
 */
const waitForLoadAndEnvMap = (element: ModelViewerElementBase) => {
  const load = waitForEvent(element, 'load');
  const envMap = waitForEvent(element[$scene], 'envmap-update');
  return Promise.all([load, envMap]);
};

suite('ModelViewerElementBase with EnvironmentMixin', () => {
  suiteTeardown(() => {
    Renderer.resetSingleton();
  });

  let nextId = 0;
  let tagName: string;
  let ModelViewerElement:
      Constructor<ModelViewerElementBase&EnvironmentInterface>;
  let element: ModelViewerElementBase&EnvironmentInterface;
  let scene: ModelScene;

  setup(() => {
    tagName = `model-viewer-environment-${nextId++}`;
    ModelViewerElement = class extends EnvironmentMixin
    (ModelViewerElementBase) {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);
    element = new ModelViewerElement();
    scene = element[$scene];
  });

  teardown(() => element.parentNode && element.parentNode.removeChild(element));

  BasicSpecTemplate(() => ModelViewerElement, () => tagName);

  test('only generates an environment when in the render tree', async () => {
    let environmentChangeCount = 0;
    const environmentChangeHandler = () => environmentChangeCount++;
    element.addEventListener('environment-change', environmentChangeHandler);
    element.style.display = 'none';
    element.src = MODEL_URL;
    document.body.insertBefore(element, document.body.firstChild);
    await rafPasses();
    expect(environmentChangeCount).to.be.eq(0);
    element.style.display = 'block';
    await waitForEvent(element, 'environment-change');
    expect(environmentChangeCount).to.be.eq(1);
    element.removeEventListener('environment-change', environmentChangeHandler);
  });

  suite('with no skybox-image property', () => {
    let environmentChanges = 0;
    suite('and a src property', () => {
      setup(async () => {
        const onLoad = waitForLoadAndEnvMap(element);
        element.src = MODEL_URL;
        document.body.insertBefore(element, document.body.firstChild);

        environmentChanges = 0;
        scene.addEventListener('envmap-update', () => {
          environmentChanges++;
        });
        await onLoad;
      });

      teardown(() => {
        document.body.removeChild(element);
      });

      test('applies a generated environment map on model', async function() {
        expect(scene.environment!.name).to.be.eq('default');
      });

      test('changes the environment exactly once', async function() {
        expect(environmentChanges).to.be.eq(1);
      });
    });
  });

  suite('exposure', () => {
    setup(async () => {
      element.src = MODEL_URL;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');
      scene.visible = true;
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('changes the tone mapping exposure of the renderer', async () => {
      const renderer = Renderer.singleton;
      const originalToneMappingExposure =
          renderer.threeRenderer.toneMappingExposure;
      element.exposure = 2.0;
      await timePasses();
      renderer.render(performance.now());

      const newToneMappingExposure = renderer.threeRenderer.toneMappingExposure;

      expect(newToneMappingExposure)
          .to.be.greaterThan(originalToneMappingExposure);
    });
  });

  suite('shadow-intensity', () => {
    setup(async () => {
      element.src = MODEL_URL;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('changes the opacity of the static shadow', async () => {
      element.shadowIntensity = 1.0;
      await timePasses();
      const newIntensity = scene.shadow!.getIntensity();
      expect(newIntensity).to.be.eq(BASE_OPACITY);
    });
  });

  suite('environment-image', () => {
    setup(async () => {
      const onLoad = waitForLoadAndEnvMap(element);
      element.setAttribute('src', MODEL_URL);
      element.setAttribute('environment-image', HDR_BG_IMAGE_URL);
      document.body.insertBefore(element, document.body.firstChild);
      await onLoad;
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('applies environment-image environment map on model', () => {
      expect(scene.environment!.name).to.be.eq(element.environmentImage);
    });

    suite('and environment-image subsequently removed', () => {
      setup(async () => {
        const envMapChanged = waitForEvent(scene, 'envmap-update');
        element.removeAttribute('environment-image');
        await envMapChanged;
      });

      test('reapplies generated environment map on model', () => {
        expect(scene.environment!.name).to.be.eq('default');
      });
    });
  });

  suite('with skybox-image property', () => {
    setup(async () => {
      const onLoad = waitForLoadAndEnvMap(element);
      element.setAttribute('src', MODEL_URL);
      element.setAttribute('skybox-image', HDR_BG_IMAGE_URL);
      document.body.insertBefore(element, document.body.firstChild);
      await onLoad;
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('displays background with skybox-image', async function() {
      expect((scene.background as Texture).name).to.be.eq(element.skyboxImage);
    });

    test('applies skybox-image environment map on model', async function() {
      expect(scene.environment!.name).to.be.eq(element.skyboxImage);
    });

    suite('with an environment-image', () => {
      setup(async () => {
        const environmentChanged = waitForEvent(element, 'environment-change');
        element.setAttribute('environment-image', ALT_BG_IMAGE_URL);
        await environmentChanged;
      });

      test('prefers environment-image as environment map', () => {
        expect(scene.environment!.name).to.be.eq(ALT_BG_IMAGE_URL);
      });

      suite('and environment-image subsequently removed', () => {
        setup(async () => {
          const environmentChanged =
              waitForEvent(element, 'environment-change');
          element.removeAttribute('environment-image');
          await environmentChanged;
        });

        test('uses skybox-image as environment map', () => {
          expect(scene.environment!.name).to.be.eq(HDR_BG_IMAGE_URL);
        });
      });

      suite('and skybox-image subsequently removed', () => {
        setup(async () => {
          const envMapChanged = waitForEvent(scene, 'envmap-update');
          element.removeAttribute('skybox-image');
          await envMapChanged;
        });

        test('continues using environment-image as environment map', () => {
          expect(scene.environment!.name).to.be.eq(ALT_BG_IMAGE_URL);
        });

        test('removes the background', async function() {
          expect(scene.background).to.be.null;
        });
      });
    });

    suite('and skybox-image subsequently removed', () => {
      setup(async () => {
        const envMapChanged = waitForEvent(scene, 'envmap-update');
        element.removeAttribute('skybox-image');
        await envMapChanged;
      });

      test('removes the background', async function() {
        expect(scene.background).to.be.null;
      });

      test('reapplies generated environment map on model', async function() {
        expect(scene.environment!.name).to.be.eq('default');
      });
    });
  });
});
