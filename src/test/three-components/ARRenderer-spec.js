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

import {IS_AR_CANDIDATE} from '../../constants.js';
import ModelViewerElementBase, {$renderer, $scene} from '../../model-viewer-base.js';
import {ARRenderer} from '../../three-components/ARRenderer.js';
import ModelScene from '../../three-components/ModelScene.js';
import {$arRenderer} from '../../three-components/Renderer.js';
import {waitForEvent} from '../helpers.js';

const expect = chai.expect;

customElements.define('model-viewer-element', ModelViewerElementBase);


const stubWebXrInterface = (arRenderer) => {
  arRenderer.resolveARSession = () => {
    class FakeSession extends EventTarget {
      requestFrameOfReference() {
        return {};
      }

      requestAnimationFrame() {
        return 1;
      }

      cancelAnimationFrame() {
      }

      end() {
        this.dispatchEvent(new CustomEvent('end'));
      }
    }

    return new FakeSession();
  };
};

suite('ARRenderer', () => {
  let element;
  let scene;
  let renderer;
  let arRenderer;

  setup(() => {
    element = new ModelViewerElementBase();
    renderer = element[$renderer];
    arRenderer = ARRenderer.fromInlineRenderer(renderer);
  });

  teardown(async () => {
    renderer.scenes.clear();
    await arRenderer.stopPresenting().catch(() => {});
  });

  // NOTE(cdata): It will be a notable day when this test fails
  test('does not support presenting to AR on any browser', async () => {
    expect(await arRenderer.supportsPresentation()).to.be.equal(false);
  });

  test('is not presenting if present has not been invoked', () => {
    expect(arRenderer.isPresenting).to.be.equal(false);
  });

  suite('when presenting a scene', () => {
    let modelScene;

    if (!IS_AR_CANDIDATE) {
      return;
    }

    setup(async () => {
      element.src = './examples/assets/Astronaut.glb';
      await waitForEvent(element, 'load');
      modelScene = element[$scene];
      stubWebXrInterface(arRenderer);
    });

    test('presents the model at its natural scale', async () => {
      const model = modelScene.model;

      await arRenderer.present(modelScene);

      expect(model.scale.x).to.be.equal(1);
      expect(model.scale.y).to.be.equal(1);
      expect(model.scale.z).to.be.equal(1);
    });

    suite('presentation ends', () => {
      test('restores the original model scale', async () => {
        const model = modelScene.model;
        const originalModelScale = model.scale.clone();

        await arRenderer.present(modelScene);
        await arRenderer.stopPresenting();

        expect(originalModelScale.x).to.be.equal(model.scale.x);
        expect(originalModelScale.y).to.be.equal(model.scale.y);
        expect(originalModelScale.z).to.be.equal(model.scale.z);
      });
    });
  });
});
