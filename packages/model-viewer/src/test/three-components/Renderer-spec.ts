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
import {Vector2} from 'three';

import {$controls} from '../../features/controls.js';
import {$intersectionObserver, $isElementInViewport, $onResize, $renderer, $scene, $updateSize, Camera, RendererInterface} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {Renderer} from '../../three-components/Renderer.js';
import {waitForEvent} from '../../utilities.js';
import {assetPath} from '../helpers.js';

let externalCamera: Camera;
let externalWidth = 0;
let externalHeight = 0;

class ExternalRenderer implements RendererInterface {
  load(callback: (progress: number) => void) {
    callback(1.0);
    return Promise.resolve({framedRadius: 15, fieldOfViewAspect: 2});
  }
  render(camera: Camera) {
    externalCamera = camera;
  }
  resize(width: number, height: number) {
    externalWidth = width;
    externalHeight = height;
  }
}

function createScene(external: boolean = false): ModelScene {
  const element = new ModelViewerElement();
  document.body.insertBefore(element, document.body.firstChild);
  element[$intersectionObserver]!.unobserve(element);
  element[$isElementInViewport] = false;

  if (external) {
    const externalRenderer = new ExternalRenderer();
    element.registerRenderer(externalRenderer);
  }
  element.src = assetPath('models/Astronaut.glb');

  // manual render loop
  element[$renderer].threeRenderer.setAnimationLoop(null);

  return element[$scene];
}

function disposeScene(scene: ModelScene) {
  const {element} = scene;
  if (scene.externalRenderer != null) {
    element.unregisterRenderer();
  }
  if (element.parentNode != null) {
    element.parentNode.removeChild(element);
  }
}

suite('Renderer with two scenes', () => {
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
    (scene.element as ModelViewerElement).loading = 'eager';
    await sourceLoads;

    renderer.render(performance.now());
    expect(scene.renderCount).to.be.equal(1, 'scene first render');
    expect(otherScene.renderCount).to.be.equal(0, 'otherScene first render');
  });

  suite('and an externally-rendered scene', () => {
    let externalScene: ModelScene;
    let externalElement: ModelViewerElement;

    setup(() => {
      externalScene = createScene(true);
      externalElement = externalScene.element as any;
    });

    teardown(() => {
      disposeScene(externalScene);
      renderer.render(performance.now());
    });

    test('load sets framing', async () => {
      expect(externalScene.idealAspect).to.be.eq(0);

      const sourceLoads = waitForEvent(externalScene.element, 'load');
      externalElement[$isElementInViewport] = true;
      await sourceLoads;

      expect(externalScene.idealAspect).to.be.eq(2);
      expect((externalElement as any)[$controls].options.minimumRadius)
          .to.be.greaterThan(15);
    });

    test('camera-orbit updates camera in external render method', async () => {
      const sceneVisible = waitForEvent(externalElement, 'poster-dismissed');
      externalElement[$isElementInViewport] = true;
      await sceneVisible;

      const time = performance.now();
      renderer.render(time);
      const cameraY = externalCamera.viewMatrix[13];
      expect(cameraY).to.not.eq(0);

      externalElement.cameraOrbit = '45deg 45deg 1.6m';
      await externalElement.updateComplete;

      renderer.render(time + 1000);

      expect(externalCamera.viewMatrix[13]).to.not.eq(cameraY);
    });

    test('resize forwards pixel dimensions', () => {
      const width = 200;
      const height = 400;
      externalElement[$onResize]({width, height});

      const dpr = window.devicePixelRatio;
      expect(externalWidth).to.be.eq(width * dpr);
      expect(externalHeight).to.be.eq(height * dpr);
    });
  });

  suite.skip('with two loaded scenes', () => {
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

      scene.queueRender();
      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(2, 'scene second render');
      expect(otherScene.renderCount).to.be.equal(1, 'otherScene second render');
    });

    test('renders only visible scenes', () => {
      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1, 'scene first render');
      expect(otherScene.renderCount).to.be.equal(1, 'otherScene first render');

      scene.queueRender();
      otherScene.queueRender();
      otherScene.element[$isElementInViewport] = false;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(2, 'scene second render');
      expect(otherScene.renderCount).to.be.equal(1, 'otherScene second render');
    });

    test('uses the proper canvas when unregistering scenes', () => {
      renderer.render(performance.now());

      expect(renderer.canvas3D.parentElement).to.be.not.ok;
      expect(scene.canvas.classList.contains('show'))
          .to.be.eq(true, 'scene canvas should be shown with multiple scenes.');
      expect(otherScene.canvas.classList.contains('show'))
          .to.be.eq(
              true, 'otherScene canvas should be shown with multiple scenes.');

      renderer.unregisterScene(scene);
      otherScene.queueRender();
      renderer.render(performance.now());

      expect(renderer.canvas3D.parentElement)
          .to.be.eq(
              otherScene.canvas.parentElement,
              'webgl canvas should be shown with single scene.');
      expect(otherScene.canvas.classList.contains('show'))
          .to.be.eq(
              false,
              'otherScene canvas should not be shown when it is the only scene.');
    });

    test('when unregistering, does not re-render when not dirty', () => {
      renderer.render(performance.now());
      renderer.unregisterScene(scene);
      renderer.render(performance.now());

      expect(scene.renderCount)
          .to.be.equal(1, 'scene should have rendered once');
      expect(otherScene.renderCount)
          .to.be.equal(1, 'otherScene should have rendered once');
      expect(renderer.canvas3D.parentElement).to.be.not.ok;
      expect(otherScene.canvas.classList.contains('show'))
          .to.be.eq(true, 'otherScene canvas should still be shown.');
    });

    test(
        'When registered, the scene canvas dimensions match the renderer size',
        () => {
          renderer.render(performance.now());
          const oldSize = new Vector2();
          renderer.threeRenderer.getSize(oldSize);

          renderer.unregisterScene(scene);
          otherScene.element[$updateSize]({width: 400, height: 200});
          renderer.render(performance.now());

          const size = new Vector2();
          renderer.threeRenderer.getSize(size);
          expect(size.x).to.be.greaterThan(oldSize.width, 'renderer width');
          expect(size.y).to.be.greaterThan(oldSize.height, 'renderer height');

          renderer.registerScene(scene);
          renderer.render(performance.now());
          expect(scene.canvas.width).to.be.eq(size.x, 'canvas width');
          expect(scene.canvas.height).to.be.eq(size.y, 'canvas height');
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
