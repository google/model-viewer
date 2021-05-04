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
import {LoadingMixin} from '../../features/loading.js';
import ModelViewerElementBase, {$canvas, $intersectionObserver, $isElementInViewport, $onResize, $renderer, $scene, $userInputElement} from '../../model-viewer-base.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {Renderer} from '../../three-components/Renderer.js';
import {waitForEvent} from '../../utilities.js';
import {assetPath} from '../helpers.js';

const expect = chai.expect;

const ModelViewerElement = class extends LoadingMixin
(ModelViewerElementBase) {
  static get is() {
    return 'model-viewer-renderer';
  }
};

customElements.define('model-viewer-renderer', ModelViewerElement);

function createScene(): ModelScene {
  const element = new ModelViewerElement();
  document.body.insertBefore(element, document.body.firstChild);
  element[$intersectionObserver]!.unobserve(element);
  element[$isElementInViewport] = false;

  element.src = assetPath('models/Astronaut.glb');

  // manual render loop
  element[$renderer].threeRenderer.setAnimationLoop(null);

  return element[$scene];
}

function disposeScene(scene: ModelScene) {
  const {element} = scene;
  if (element.parentNode != null) {
    element.parentNode.removeChild(element);
  }
}

suite('Renderer', () => {
  let scene: ModelScene;
  let otherScene: ModelScene;
  let renderer: Renderer;

  setup(() => {
    renderer = Renderer.singleton;
    // Ensure tests are not rescaling
    ModelViewerElement.minimumRenderScale = 1;
    scene = createScene();
    otherScene = createScene();
  });

  teardown(() => {
    disposeScene(scene);
    disposeScene(otherScene);
    renderer.render(performance.now());
  });

  test('pre-renders eager, invisible scenes', async () => {
    const sourceLoads = waitForEvent(scene.element, 'load');
    (scene.element as any).loading = 'eager';
    await sourceLoads;

    renderer.render(performance.now());
    expect(scene.renderCount).to.be.equal(1, 'scene first render');
    expect(otherScene.renderCount).to.be.equal(0, 'otherScene first render');
  });

  suite('with two loaded scenes', () => {
    setup(async () => {
      const sceneVisible = waitForEvent(scene.element, 'poster-dismissed');
      const otherSceneVisible =
          waitForEvent(otherScene.element, 'poster-dismissed');
      scene.element[$isElementInViewport] = true;
      otherScene.element[$isElementInViewport] = true;
      await Promise.all([sceneVisible, otherSceneVisible]);
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

    test('renders only visible scenes', () => {
      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1, 'scene first render');
      expect(otherScene.renderCount).to.be.equal(1, 'otherScene first render');

      scene.isDirty = true;
      otherScene.isDirty = true;
      otherScene.element[$isElementInViewport] = false;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(2, 'scene second render');
      expect(otherScene.renderCount).to.be.equal(1, 'otherScene second render');
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
