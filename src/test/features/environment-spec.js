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
import ModelViewerElementBase, {$scene} from '../../model-viewer-element-base.js';
import {waitForEvent} from '../helpers.js';

const expect = chai.expect;
const BG_IMAGE_URL = './examples/assets/equirectangular.png';
const MODEL_URL = './examples/assets/reflective-sphere.gltf';

const skysphereUsingMap = (scene, url) => scene.skysphere.material.map &&
    scene.skysphere.material.map.name === url &&
    scene.skysphere.material.color.getHexString() === 'ffffff';

const skysphereUsingColor =
    (scene, hex) => {
      const {color, map} = scene.skysphere.material;
      // Invert gamma correct to match passed in hex
      const gammaCorrectedColor = color.clone().convertLinearToGamma(2.2);

      return map == null && gammaCorrectedColor.getHexString() === hex;
    }

const modelUsingEnvmap = (scene, url) => {
  let found = false;
  scene.model.traverse(object => {
    if (object && object.material && object.material.envMap &&
        object.material.envMap.name === url) {
      found = true;
    }
  });
  return found;
};

const waitForEnvmap = (model, mapName) => waitForEvent(
    model, 'envmap-change', e => e.value ? e.value.name === mapName : false);

const waitForLoadAndEnvmap = (scene, element, mapName) => Promise.all(
    [waitForEvent(element, 'load'), waitForEnvmap(scene.model, mapName)]);

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

  test(
      'has default skysphere if no background-image or background-color',
      () => {
        expect(skysphereUsingColor(scene, 'ffffff')).to.be.equal(true);
      });

  suite('with a background-image property', () => {
    suite('and a src property', () => {
      setup(async () => {
        let onLoad = waitForLoadAndEnvmap(scene, element, BG_IMAGE_URL);
        element.src = MODEL_URL;
        element.backgroundImage = BG_IMAGE_URL;
        await onLoad;
      });

      test('displays skysphere with the correct map', async function() {
        expect(skysphereUsingMap(scene, element.backgroundImage)).to.be.ok;
      });

      test('applies the image as an environment map', async function() {
        expect(modelUsingEnvmap(scene, element.backgroundImage)).to.be.ok;
      });
    });
  });

  suite('with a background-color property', () => {
    suite('and a src property', () => {
      setup(async () => {
        let onLoad = waitForLoadAndEnvmap(scene, element, 'Generated');
        element.src = MODEL_URL;
        element.backgroundColor = '#ff0077';
        await onLoad;
      });

      test('displays skysphere with the correct color', async function() {
        expect(skysphereUsingColor(scene, 'ff0077')).to.be.ok;
      });

      test('applies a generated environment map on model', async function() {
        expect(modelUsingEnvmap(scene, 'Generated')).to.be.ok;
      });
    });
  });

  suite('with background-color and background-image properties', () => {
    setup(async () => {
      let onLoad = waitForLoadAndEnvmap(scene, element, BG_IMAGE_URL);
      element.setAttribute('src', MODEL_URL);
      element.setAttribute('background-color', '#ff0077');
      element.setAttribute('background-image', BG_IMAGE_URL);
      await onLoad;
    });

    test('displays skysphere with background-image', async function() {
      expect(skysphereUsingMap(scene, element.backgroundImage)).to.be.ok;
    });

    test('applies background-image envmap on model', async function() {
      expect(modelUsingEnvmap(scene, element.backgroundImage)).to.be.ok;
    });

    suite('and background-image subsequently removed', () => {
      setup(async () => {
        let envmapChanged = waitForEnvmap(scene.model, 'Generated');
        element.removeAttribute('background-image');
        await envmapChanged;
      });

      test('displays skysphere with background-color', async function() {
        expect(skysphereUsingColor(scene, 'ff0077')).to.be.ok;
      });

      test('reapplies generated envmap on model', async function() {
        expect(modelUsingEnvmap(scene, 'Generated')).to.be.ok;
      });
    });
  });
});
