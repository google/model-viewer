/* @license
 * Copyright 2023 Google LLC. All Rights Reserved.
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

import { ModelViewerElement } from '@google/model-viewer';
import { Renderer } from '@google/model-viewer/lib/three-components/Renderer.js';
import { expect } from 'chai';

import { $effectComposer } from '../effect-composer.js';
import { EffectComposer } from '../model-viewer-effects.js';
import { getOwnPropertySymbolValue } from '../utilities.js';

import { CompareArrays, assetPath, createModelViewerElement, rafPasses, screenshot, waitForEvent } from './utilities.js';

suite('Screenshot Baseline Test', () => {
  let element: ModelViewerElement;
  let baseScreenshot: Uint8Array;

  suiteSetup(function () {
    if (!Renderer.singleton.canRender) {
      this.skip();
    }
  });

  setup(async () => {
    element = createModelViewerElement(assetPath('models/Astronaut.glb'));
    await waitForEvent(element, 'load');
  });

  teardown(() => {
    document.body.removeChild(element);
  });

  test('Compare ModelViewer to Self', async () => {
    const renderer =
      getOwnPropertySymbolValue<Renderer>(element, 'renderer') as Renderer;
    expect(renderer).to.not.be.undefined;
    expect(renderer.threeRenderer).to.not.be.undefined;
    await element.updateComplete;
    element.jumpCameraToGoal();
    await rafPasses();
    baseScreenshot = screenshot(element);
    await rafPasses();
    const screenshot2 = screenshot(element);

    const similarity = CompareArrays(baseScreenshot, screenshot2);
    if (!Number.isNaN(similarity)) {
      expect(similarity).to.be.greaterThan(0.999);
    }
  });

  suite('<effect-composer>', () => {
    let composer: EffectComposer;
    let composerScreenshot: Uint8Array;

    setup(async () => {
      composer = new EffectComposer();
      composer.renderMode = 'quality';
      composer.msaa = 8;
      element.insertBefore(composer, element.firstChild);
      await element.updateComplete;
      await composer.updateComplete;
      await rafPasses();
      await rafPasses();
    });

    test('Compare Self', async () => {
      const renderer = composer[$effectComposer].getRenderer();
      expect(renderer).to.not.be.undefined;
      element.jumpCameraToGoal();
      await rafPasses();
      composerScreenshot = screenshot(element);
      await rafPasses();
      const screenshot2 = screenshot(element);

      const similarity = CompareArrays(composerScreenshot, screenshot2);
      if (!Number.isNaN(similarity)) {
        expect(similarity).to.be.greaterThan(0.999);
      }
    });

    test('Empty EffectComposer and base Renderer are identical', () => {
      const similarity = CompareArrays(baseScreenshot, composerScreenshot);
      if (!Number.isNaN(similarity)) {
        expect(similarity).to.be.greaterThan(0.999);
      }
    });
  });
});
