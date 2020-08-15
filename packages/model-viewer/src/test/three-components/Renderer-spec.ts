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
import ModelViewerElementBase, {$canvas, $context, $createContext, $loaded, $needsRender, $onResize, $scene, $userInputElement} from '../../model-viewer-base.js';
import {Renderer} from '../../three-components/Renderer.js';
import {assetPath, waitForEvent} from '../helpers.js';

const expect = chai.expect;

const ModelViewerElement = class extends ModelViewerElementBase {
  static get is() {
    return 'model-viewer-renderer';
  }
};

interface TestScene {
  renderCount?: number;
}

customElements.define('model-viewer-renderer', ModelViewerElement);

async function createScene(): Promise<ModelViewerElementBase&TestScene> {
  const element =
      new ModelViewerElement() as ModelViewerElementBase & TestScene;
  document.body.insertBefore(element, document.body.firstChild);
  const sourceLoads = waitForEvent(element, 'load');
  element.src = assetPath('models/Astronaut.glb');
  await sourceLoads;

  element.renderCount = 0;

  element[$createContext]();
  const context = element[$context];
  if (context instanceof CanvasRenderingContext2D) {
    const drawImage = context.drawImage;
    context.drawImage = (...args: any[]) => {
      element.renderCount!++;
      (drawImage as any).call(context, ...args);
    };
  } else if (context instanceof ImageBitmapRenderingContext) {
    const transferFromImageBitmap = context.transferFromImageBitmap;
    context.transferFromImageBitmap = (...args: any[]) => {
      element.renderCount!++;
      (transferFromImageBitmap as any).call(context, ...args);
    }
  } else {
    throw new Error(
        'context is neither a CanvasRenderingContext2D nor an ImageBitmapRenderingContext.');
  }

  return element;
}

suite('Renderer', () => {
  let element: ModelViewerElementBase&TestScene;
  let renderer: Renderer;

  setup(async () => {
    renderer = Renderer.singleton;
    element = await createScene();
  });

  teardown(() => {
    renderer.unregisterElement(element);
    renderer.render(performance.now());
  });

  suite('render', () => {
    let otherElement: ModelViewerElementBase&TestScene;

    setup(async () => {
      otherElement = await createScene();
    });

    teardown(() => {
      renderer.unregisterElement(otherElement);
      renderer.render(performance.now());
    });

    test('renders only dirty scenes', () => {
      renderer.render(performance.now());
      expect(element.renderCount).to.be.equal(1);
      expect(otherElement.renderCount).to.be.equal(1);

      element[$needsRender]();
      renderer.render(performance.now());
      expect(element.renderCount).to.be.equal(2);
      expect(otherElement.renderCount).to.be.equal(1);
    });

    test('does not render scenes that have not been loaded', () => {
      element[$loaded] = false;
      element[$needsRender]();

      renderer.render(performance.now());
      expect(element.renderCount).to.be.equal(0);
      expect(element[$scene].isDirty).to.be.ok;

      element[$loaded] = true;

      renderer.render(performance.now());
      expect(element.renderCount).to.be.equal(1);
      expect(!element[$scene].isDirty).to.be.ok;
    });

    test('uses the proper canvas when unregsitering scenes', () => {
      renderer.render(performance.now());

      expect(renderer.canvasElement.classList.contains('show')).to.be.eq(false);
      expect(element[$canvas].classList.contains('show')).to.be.eq(true);
      expect(otherElement[$canvas].classList.contains('show')).to.be.eq(true);

      renderer.unregisterElement(element);
      renderer.render(performance.now());

      if (USE_OFFSCREEN_CANVAS) {
        expect(renderer.canvasElement.classList.contains('show'))
            .to.be.eq(false);
        expect(otherElement[$canvas].classList.contains('show')).to.be.eq(true);
      } else {
        expect(renderer.canvasElement.parentElement)
            .to.be.eq(otherElement[$userInputElement]);
        expect(renderer.canvasElement.classList.contains('show'))
            .to.be.eq(true);
        expect(otherElement[$canvas].classList.contains('show'))
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
        const initialDpr = renderer.dpr;
        const {width, height} = element[$scene].getSize();

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
