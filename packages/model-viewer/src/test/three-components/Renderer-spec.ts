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
import ModelViewerElementBase, {$canvas, $loaded, $onResize, $scene, $userInputElement} from '../../model-viewer-base.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {Renderer} from '../../three-components/Renderer.js';
import {assetPath, waitForEvent} from '../helpers.js';

const expect = chai.expect;

const ModelViewerElement = class extends ModelViewerElementBase {
  static get is() {
    return 'model-viewer-renderer';
  }
};

// Ensure tests are not rescaling
ModelViewerElement.minimumRenderScale = 1;

interface TestScene {
  renderCount?: number;
}

customElements.define('model-viewer-renderer', ModelViewerElement);

async function createScene(): Promise<ModelScene&TestScene> {
  const element = new ModelViewerElement();
  document.body.insertBefore(element, document.body.firstChild);
  const sourceLoads = waitForEvent(element, 'load');
  element.src = assetPath('models/Astronaut.glb');
  await sourceLoads;

  const scene = element[$scene] as ModelScene & TestScene;
  scene.renderCount = 0;

  scene.createContext();
  const {context} = scene;
  if (context instanceof CanvasRenderingContext2D) {
    const drawImage = context.drawImage;
    context.drawImage = (...args: any[]) => {
      scene.renderCount!++;
      (drawImage as any).call(context, ...args);
    };
  } else if (context instanceof ImageBitmapRenderingContext) {
    const transferFromImageBitmap = context.transferFromImageBitmap;
    context.transferFromImageBitmap = (...args: any[]) => {
      scene.renderCount!++;
      (transferFromImageBitmap as any).call(context, ...args);
    }
  } else {
    throw new Error(
        'context is neither a CanvasRenderingContext2D nor an ImageBitmapRenderingContext.');
  }

  return scene;
}

suite('Renderer', () => {
  let scene: ModelScene&TestScene;
  let renderer: Renderer;

  setup(async () => {
    renderer = Renderer.singleton;
    scene = await createScene();
  });

  teardown(() => {
    renderer.unregisterScene(scene);
    renderer.render(performance.now());
  });

  suite('render', () => {
    let otherScene: ModelScene&TestScene;

    setup(async () => {
      otherScene = await createScene();
    });

    teardown(() => {
      renderer.unregisterScene(otherScene);
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
      expect(scene.isDirty).to.be.ok;

      scene.element[$loaded] = true;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1);
      expect(!scene.isDirty).to.be.ok;
    });

    test('uses the proper canvas when unregsitering scenes', () => {
      renderer.render(performance.now());

      expect(renderer.canvasElement.classList.contains('show')).to.be.eq(false);
      expect(scene.element[$canvas].classList.contains('show')).to.be.eq(true);
      expect(otherScene.element[$canvas].classList.contains('show'))
          .to.be.eq(true);

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
            .to.be.eq(true);
        expect(otherScene.element[$canvas].classList.contains('show'))
            .to.be.eq(false);
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

      test('updates effective DPR', async () => {
        const {element} = scene;
        const initialDpr = renderer.dpr;
        const {width, height} = scene.getSize();

        element[$onResize]({width, height});

        Object.defineProperty(
            self, 'devicePixelRatio', {value: initialDpr + 1});

        await new Promise(resolve => requestAnimationFrame(resolve));

        const newDpr = renderer.dpr;

        expect(newDpr).to.be.equal(initialDpr + 1);
      });
    });
  });
});
