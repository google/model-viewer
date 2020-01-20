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

import {Color, Material, Mesh, Scene} from 'three';
import {MeshStandardMaterial} from 'three';

import {EnvironmentInterface, EnvironmentMixin} from '../../features/environment.js';
import ModelViewerElementBase, {$scene} from '../../model-viewer-base.js';
import Model from '../../three-components/Model.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {Renderer} from '../../three-components/Renderer.js';
import {assetPath, rafPasses, textureMatchesMeta, timePasses, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;
const ALT_BG_IMAGE_URL = assetPath('environments/grey.png');
const BG_IMAGE_URL = assetPath('environments/spruit_sunrise_1k_LDR.jpg');
const HDR_BG_IMAGE_URL = assetPath('environments/spruit_sunrise_1k_HDR.hdr');
const MODEL_URL = assetPath('models/reflective-sphere.gltf');
const UNLIT_MODEL_URL = assetPath(
    'models/glTF-Sample-Models/2.0/UnlitTest/glTF-Binary/UnlitTest.glb');
const MULTI_MATERIAL_MODEL_URL = assetPath('models/Triangle.gltf');

const backgroundHasMap =
    (scene: ModelScene, url: string|null) => {
      return textureMatchesMeta(
          scene.skyboxMaterial().uniforms.envMap.value, {url: url});
    }

const backgroundHasColor =
    (scene: Scene, hex: string) => {
      if (!scene.background || !(scene.background as any).isColor) {
        return false;
      }
      return (scene.background as Color).getHexString() === hex;
    }

/**
 * Takes a scene and a meta object and returns a
 * boolean indicating whether or not the scene's model has an
 * environment map applied that matches the meta object.
 *
 * @see textureMatchesMeta
 */
const modelUsingEnvMap =
    (scene: ModelScene, meta: {[index: string]: any}): boolean => {
      let found = false;
      scene.model.traverse(object => {
        const mesh = object as Mesh;

        if (Array.isArray(mesh.material)) {
          found = found || mesh.material.some((m: Material) => {
            return textureMatchesMeta(
                (m as MeshStandardMaterial).envMap!, meta);
          });
        } else if (
            mesh.material && (mesh.material as MeshStandardMaterial).envMap) {
          found = found ||
              textureMatchesMeta(
                      (mesh.material as MeshStandardMaterial).envMap!, meta);
        }
      });
      return found;
    };

const modelHasEnvMap = (scene: ModelScene): boolean => {
  let found = false;
  scene.model.traverse(object => {
    const mesh = object as Mesh;

    if (Array.isArray(mesh.material)) {
      found = found ||
          mesh.material.some(
              (m: Material) => !!(m as MeshStandardMaterial).envMap);
    } else if (
        mesh.material && (mesh.material as MeshStandardMaterial).envMap) {
      found = true;
    }
  });
  return found;
};

/**
 * Takes a model object and a meta object and returns
 * a promise that resolves when the model's environment map has
 * been set to a texture that has `userData` that matches
 * the passed in `meta`.
 *
 * @see textureMatchesMeta
 */
const waitForEnvMap = (model: Model, meta: {[index: string]: any}) =>
    waitForEvent<{value: any}>(model, 'envmap-change', event => {
      return textureMatchesMeta(event.value, {...meta});
    });

/**
 * Returns a promise that resolves when a given element is loaded
 * and has an environment map set that matches the passed in meta.
 * @see textureMatchesMeta
 */
const waitForLoadAndEnvMap =
    (scene: ModelScene,
     element: ModelViewerElementBase,
     meta: {[index: string]: any}) => {
      const load = waitForEvent(element, 'load');
      const envMap = waitForEnvMap(scene.model, meta);
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

  test('has default background if no skybox-image or background-color', () => {
    expect(backgroundHasColor(scene, 'ffffff')).to.be.equal(true);
  });

  test(
      'has default background if no skybox-image or background-color when in DOM',
      async () => {
        document.body.appendChild(element);
        await timePasses();
        expect(backgroundHasColor(scene, 'ffffff')).to.be.equal(true);
      });

  test('only generates an environment when in the render tree', async () => {
    let environmentChangeCount = 0;
    const environmentChangeHandler = () => environmentChangeCount++;
    element.addEventListener('environment-change', environmentChangeHandler);
    element.style.display = 'none';
    document.body.appendChild(element);
    await rafPasses();
    expect(environmentChangeCount).to.be.equal(0);
    element.style.display = 'block';
    await waitForEvent(element, 'environment-change');
    expect(environmentChangeCount).to.be.equal(1);
    element.removeEventListener('environment-change', environmentChangeHandler);
  });

  suite('with no skybox-image property', () => {
    let environmentChanges = 0;
    suite('and a src property', () => {
      setup(async () => {
        let onLoad = waitForLoadAndEnvMap(scene, element, {url: null});
        element.src = MODEL_URL;
        document.body.appendChild(element);

        environmentChanges = 0;
        scene.model.addEventListener('envmap-update', () => {
          environmentChanges++;
        });
        await onLoad;
      });

      teardown(() => {
        document.body.removeChild(element);
      });

      test('displays default background', async function() {
        expect(backgroundHasColor(scene, 'ffffff')).to.be.equal(true);
      });

      test('applies a generated environment map on model', async function() {
        expect(modelUsingEnvMap(scene, {
          url: null,
        })).to.be.ok;
      });

      test('changes the environment exactly once', async function() {
        expect(environmentChanges).to.be.eq(1);
      });
    });
  });

  suite('with a skybox-image property', () => {
    suite('and a src property', () => {
      setup(async () => {
        let onLoad = waitForLoadAndEnvMap(scene, element, {url: BG_IMAGE_URL});
        element.src = MODEL_URL;
        element.skyboxImage = BG_IMAGE_URL;
        document.body.appendChild(element);
        await onLoad;
      });

      teardown(() => {
        document.body.removeChild(element);
      });

      test('displays background with the correct map', async function() {
        expect(backgroundHasMap(scene, element.skyboxImage!)).to.be.ok;
      });

      test('applies the image as an environment map', async function() {
        expect(modelUsingEnvMap(scene, {url: element.skyboxImage})).to.be.ok;
      });

      suite('and a background-color property', () => {
        setup(async () => {
          element.backgroundColor = '#ff0077';
          await timePasses();
        });
      });

      suite('on an unlit model', () => {
        setup(async () => {
          let onLoad = waitForLoadAndEnvMap(scene, element, {
            url: BG_IMAGE_URL,
          });
          element.src = UNLIT_MODEL_URL;
          await onLoad;
        });
        test('applies no environment map on unlit model', async function() {
          expect(modelHasEnvMap(scene)).to.be.false;
        });
      });

      suite('on a model with multi-material meshes', () => {
        setup(async () => {
          let onLoad = waitForLoadAndEnvMap(scene, element, {
            url: BG_IMAGE_URL,
          });
          element.src = MULTI_MATERIAL_MODEL_URL;
          await onLoad;
        });
        test(
            'applies environment map on model with multi-material meshes',
            async function() {
              expect(modelUsingEnvMap(scene, {
                url: element.skyboxImage
              })).to.be.ok;
            });
      });
    });
  });

  suite('with a background-color property', () => {
    suite('and a src property', () => {
      setup(async () => {
        let onLoad = waitForLoadAndEnvMap(scene, element, {
          url: null,
        });
        element.src = MODEL_URL;
        element.backgroundColor = '#ff0077';
        document.body.appendChild(element);
        await onLoad;
      });

      teardown(() => {
        document.body.removeChild(element);
      });

      test('displays background with the correct color', async function() {
        expect(backgroundHasColor(scene, 'ff0077')).to.be.ok;
      });

      test('applies a generated environment map on model', async function() {
        expect(modelUsingEnvMap(scene, {
          url: null,
        })).to.be.ok;
      });

      test(
          'displays background with correct color after attaching to DOM',
          async function() {
            document.body.appendChild(element);
            await timePasses();
            expect(backgroundHasColor(scene, 'ff0077')).to.be.ok;
          });

      suite('on an unlit model', () => {
        setup(async () => {
          let onLoad = waitForLoadAndEnvMap(scene, element, {
            url: null,
          });
          element.src = UNLIT_MODEL_URL;
          await onLoad;
        });
        test('applies no environment map on unlit model', async function() {
          expect(modelHasEnvMap(scene)).to.be.false;
        });
      });
    });
  });

  suite('exposure', () => {
    setup(async () => {
      element.src = MODEL_URL;
      document.body.appendChild(element);
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
      document.body.appendChild(element);
      await waitForEvent(element, 'load');
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('changes the opacity of the static shadow', async () => {
      element.shadowIntensity = 1.0;
      await timePasses();
      const newIntensity = scene.shadow!.getIntensity();
      expect(newIntensity).to.be.eq(1.0);
    });
  });

  suite('environment-image', () => {
    setup(async () => {
      let onLoad =
          waitForLoadAndEnvMap(scene, element, {url: HDR_BG_IMAGE_URL});
      element.setAttribute('src', MODEL_URL);
      element.setAttribute('background-color', '#ff0077');
      element.setAttribute('environment-image', HDR_BG_IMAGE_URL);
      document.body.appendChild(element);
      await onLoad;
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('applies environment-image environment map on model', () => {
      expect(modelUsingEnvMap(scene, {url: element.environmentImage})).to.be.ok;
    });

    suite('and environment-image subsequently removed', () => {
      setup(async () => {
        let envMapChanged = waitForEnvMap(scene.model, {url: null});
        element.removeAttribute('environment-image');
        await envMapChanged;
      });

      test('reapplies generated environment map on model', () => {
        expect(modelUsingEnvMap(scene, {url: null})).to.be.ok;
      });
    });
  });

  suite('with background-color and skybox-image properties', () => {
    setup(async () => {
      let onLoad =
          waitForLoadAndEnvMap(scene, element, {url: HDR_BG_IMAGE_URL});
      element.setAttribute('src', MODEL_URL);
      element.setAttribute('background-color', '#ff0077');
      element.setAttribute('skybox-image', HDR_BG_IMAGE_URL);
      document.body.appendChild(element);
      await onLoad;
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('displays background with skybox-image', async function() {
      expect(backgroundHasMap(scene, element.skyboxImage!)).to.be.ok;
    });

    test('applies skybox-image environment map on model', async function() {
      expect(modelUsingEnvMap(scene, {url: element.skyboxImage})).to.be.ok;
    });

    suite('with an environment-image', () => {
      setup(async () => {
        const environmentChanged = waitForEvent(element, 'environment-change');
        element.setAttribute('environment-image', ALT_BG_IMAGE_URL);
        await environmentChanged;
      });

      test('prefers environment-image as environment map', () => {
        expect(modelUsingEnvMap(scene, {url: ALT_BG_IMAGE_URL})).to.be.ok;
      });

      suite('and environment-image subsequently removed', () => {
        setup(async () => {
          const environmentChanged =
              waitForEvent(element, 'environment-change');
          element.removeAttribute('environment-image');
          await environmentChanged;
        });

        test('uses skybox-image as environment map', () => {
          expect(modelUsingEnvMap(scene, {url: HDR_BG_IMAGE_URL})).to.be.ok;
        });
      });

      suite('and skybox-image subsequently removed', () => {
        setup(async () => {
          const environmentChanged =
              waitForEvent(element, 'environment-change');
          element.removeAttribute('skybox-image');
          await environmentChanged;
        });

        test('continues using environment-image as environment map', () => {
          expect(modelUsingEnvMap(scene, {url: ALT_BG_IMAGE_URL})).to.be.ok;
        });

        test('displays background with background-color', async function() {
          expect(backgroundHasColor(scene, 'ff0077')).to.be.ok;
        });
      });
    });

    suite('and skybox-image subsequently removed', () => {
      setup(async () => {
        let envMapChanged = waitForEnvMap(scene.model, {url: null});
        element.removeAttribute('skybox-image');
        await envMapChanged;
      });

      test('displays background with background-color', async function() {
        expect(backgroundHasColor(scene, 'ff0077')).to.be.ok;
      });

      test('reapplies generated environment map on model', async function() {
        expect(modelUsingEnvMap(scene, {url: null})).to.be.ok;
      });
    });
  });
});
