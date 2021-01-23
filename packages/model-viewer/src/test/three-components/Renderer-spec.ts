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

import {USE_OFFSCREEN_CANVAS} from '../../constants.js';
import ModelViewerElementBase, {$canvas, $getModelIsVisible, $loaded, $onResize, $renderer, $scene, $userInputElement} from '../../model-viewer-base.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {Renderer} from '../../three-components/Renderer.js';
import {waitForEvent} from '../../utilities.js';
import {assetPath} from '../helpers.js';

const expect = chai.expect;

const ModelViewerElement = class extends ModelViewerElementBase {
  static get is() {
    return 'model-viewer-renderer';
  }
};

customElements.define('model-viewer-renderer', ModelViewerElement);

async function createScene(): Promise<ModelScene> {
  const element = new ModelViewerElement();
  document.body.insertBefore(element, document.body.firstChild);
  const sourceLoads = waitForEvent(element, 'load');
  element.src = assetPath('models/Astronaut.glb');
  element[$getModelIsVisible] = () => {
    return true;
  };
  // manual render loop
  element[$renderer].threeRenderer.setAnimationLoop(null);
  await sourceLoads;

  return element[$scene];
}

suite('Renderer', () => {
  let scene: ModelScene;
  let renderer: Renderer;

  setup(async () => {
    renderer = Renderer.singleton;
    // Ensure tests are not rescaling
    ModelViewerElement.minimumRenderScale = 1;
    scene = await createScene();
  });

  teardown(() => {
    const {element} = scene;
    if (element.parentNode != null) {
      element.parentNode.removeChild(element);
    }
    renderer.render(performance.now());
  });

  suite('render', () => {
    let otherScene: ModelScene;

    setup(async () => {
      otherScene = await createScene();
    });

    teardown(() => {
      const {element} = otherScene;
      if (element.parentNode != null) {
        element.parentNode.removeChild(element);
      }
      renderer.render(performance.now());
    });

    test('renders only dirty scenes', () => {
      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1, 'scene first render');
      expect(otherScene.renderCount).to.be.equal(1, 'otherScene first render');

      scene.isDirty = true;
      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(2, 'scene second render');
      expect(otherScene.renderCount).to.be.equal(1, 'otherScene second render');
    });

    test('does not render scenes that have not been loaded', () => {
      scene.element[$loaded] = false;
      scene.isDirty = true;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(0);
      expect(scene.isDirty).to.be.eq(true);

      scene.element[$loaded] = true;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1);
      expect(!scene.isDirty).to.be.eq(true);
    });

    test('uses the proper canvas when unregsitering scenes', () => {
      renderer.render(performance.now());

      expect(renderer.canvasElement.classList.contains('show'))
          .to.be.eq(
              false, 'webgl canvas should not be shown with multiple scenes.');
      expect(scene.element[$canvas].classList.contains('show'))
          .to.be.eq(true, 'scene canvas should be shown with multiple scenes.');
      expect(otherScene.element[$canvas].classList.contains('show'))
          .to.be.eq(
              true, 'otherScene canvas should be shown with multiple scenes.');

      renderer.unregisterScene(scene);
      renderer.render(performance.now());

      if (USE_OFFSCREEN_CANVAS) {
        expect(renderer.canvasElement.classList.contains('show'))
            .to.be.eq(false);
        expect(otherScene.element[$canvas].classList.contains('show'))
            .to.be.eq(true);
      } else {
        expect(renderer.canvasElement.parentElement)
            .to.be.eq(otherScene.element[$userInputElement]);
        expect(renderer.canvasElement.classList.contains('show'))
            .to.be.eq(true, 'webgl canvas should be shown with single scene.');
        expect(otherScene.element[$canvas].classList.contains('show'))
            .to.be.eq(
                false,
                'otherScene canvas should not be shown when it is the only scene.');
      }
    });

    suite('when resizing', () => {
      let originalDpr: number;

      setup(() => {
        originalDpr = self.devicePixelRatio;
      });

      teardown(() => {
        Object.defineProperty(self, 'devicePixelRatio', {value: originalDpr});
      });

      test('updates effective DPR', () => {
        const {element} = scene;
        const initialDpr = renderer.dpr;
        const {width, height} = scene.getSize();

        element[$onResize]({width, height});

        Object.defineProperty(
            self, 'devicePixelRatio', {value: initialDpr + 1});

        renderer.render(performance.now());

        const newDpr = renderer.dpr;

        expect(newDpr).to.be.equal(initialDpr + 1);
      });
    });
  });
});
