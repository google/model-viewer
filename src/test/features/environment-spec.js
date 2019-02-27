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

import {EnvironmentMixin} from '../../features/environment.js';
import ModelViewerElementBase, {$scene} from '../../model-viewer-base.js';
import {assetPath, textureMatchesMeta, timePasses, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;
const BG_IMAGE_URL = assetPath('spruit_sunrise_2k.jpg');
const MODEL_URL = assetPath('reflective-sphere.gltf');

const backgroundHasMap =
    (scene, url) => {
      return textureMatchesMeta(scene.background.texture, {url: url});
    }

const backgroundHasColor =
    (scene, hex) => {
      if (!scene.background || !scene.background.isColor) {
        return false;
      }
      return scene.background.getHexString() === hex;
    }

/**
 * Takes a scene and a meta object and returns a
 * boolean indicating whether or not the scene's model has an
 * environment map applied that matches the meta object.
 *
 * @see textureMatchesMeta
 * @param {THREE.Scene} scene
 * @param {Object} meta
 */
const modelUsingEnvMap = (scene, meta) => {
  let found = false;
  scene.model.traverse(object => {
    if (!object.material || !object.material.envMap) {
      return;
    }

    if (textureMatchesMeta(object.material.envMap, meta)) {
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
 * @param {Model} model
 * @param {Object} meta
 */
const waitForEnvMap = (model, meta) =>
    waitForEvent(model, 'envmap-change', event => {
      return textureMatchesMeta(event.value, {...meta});
    });

/**
 * Returns a promise that resolves when a given element is loaded
 * and has an environment map set that matches the passed in meta.
 * @see textureMatchesMeta
 */
const waitForLoadAndEnvMap =
    (scene, element, meta) => {
      const load = waitForEvent(element, 'load');
      const envMap = waitForEnvMap(scene.model, meta);
      return Promise.all([load, envMap]);
    }

suite('ModelViewerElementBase with EnvironmentMixin', () => {
  let nextId = 0;
  let tagName;
  let ModelViewerElement;
  let element;
  let scene;

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

  test(
      'has default background if no background-image or background-color',
      () => {
        expect(backgroundHasColor(scene, 'ffffff')).to.be.equal(true);
      });

  test(
      'has default background if no background-image or background-color when in DOM',
      async () => {
        document.body.appendChild(element);
        await timePasses();
        expect(backgroundHasColor(scene, 'ffffff')).to.be.equal(true);
      });

  suite('with a background-image property', () => {
    suite('and a src property', () => {
      setup(async () => {
        let onLoad = waitForLoadAndEnvMap(scene, element, {url: BG_IMAGE_URL});
        element.src = MODEL_URL;
        element.backgroundImage = BG_IMAGE_URL;
        await onLoad;
      });

      test('displays background with the correct map', async function() {
        expect(backgroundHasMap(scene, element.backgroundImage)).to.be.ok;
      });

      test('applies the image as an environment map', async function() {
        expect(modelUsingEnvMap(scene, {
          url: element.backgroundImage
        })).to.be.ok;
      });

      suite('and a background-color property', () => {
        setup(async () => {
          element.backgroundColor = '#ff0077';
          await timePasses();
        });

        test('the directional light is white', () => {
          const lightColor =
              scene.shadowLight.color.getHexString().toLowerCase();
          expect(lightColor).to.be.equal('ffffff');
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
        await onLoad;
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
      test('the directional light is tinted', () => {
        const lightColor = scene.shadowLight.color.getHexString().toLowerCase();
        expect(lightColor).to.not.be.equal('ffffff');
      });
    });
  });

  suite('shadow-strength', () => {
    setup(async () => {
      element.src = MODEL_URL;
      await waitForEvent(element, 'load');
    });

    test('changes the opacity of the static shadow', async () => {
      const originalOpacity = scene.shadow.material.opacity;
      element.shadowStrength = 1.0;
      await timePasses();
      const newOpacity = scene.shadow.material.opacity;
      expect(newOpacity).to.be.greaterThan(originalOpacity);
    });
  });

  suite('with background-color and background-image properties', () => {
    setup(async () => {
      let onLoad = waitForLoadAndEnvMap(scene, element, {url: BG_IMAGE_URL});
      element.setAttribute('src', MODEL_URL);
      element.setAttribute('background-color', '#ff0077');
      element.setAttribute('background-image', BG_IMAGE_URL);
      await onLoad;
    });

    test('displays background with background-image', async function() {
      expect(backgroundHasMap(scene, element.backgroundImage)).to.be.ok;
    });

    test('applies background-image environment map on model', async function() {
      expect(modelUsingEnvMap(scene, {url: element.backgroundImage})).to.be.ok;
    });

    suite('and background-image subsequently removed', () => {
      setup(async () => {
        let envMapChanged = waitForEnvMap(scene.model, {url: null});
        element.removeAttribute('background-image');
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
