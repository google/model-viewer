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
import { ModelViewerElement } from '@beilinson/model-viewer';
import { WebGLRenderer } from 'three';
import { $effectComposer, MVEffectComposer } from '../../effect-composer';
import { MVColorGradeEffect } from '../../model-viewer-effects';
import { createModelViewerElement, assetPath, waitForEvent, screenshot, ArraysAreEqual, timePasses } from '../utilities';
const expect = chai.expect;

suite('Bloom Effect', () => {
  let element: ModelViewerElement;
  let composer: MVEffectComposer;
  let renderer: WebGLRenderer;
  let baseScreenshot: Uint8Array;

  setup(async () => {
    element = createModelViewerElement(assetPath('models/Astronaut.glb'));
    composer = new MVEffectComposer();
    element.insertBefore(composer, element.firstChild);
    await waitForEvent(element, 'load');

    renderer = composer[$effectComposer].getRenderer();
    baseScreenshot = screenshot(renderer);
  });

  teardown(() => {
    document.body.removeChild(element);
  });

  test('Color Grade Affects Pixels', async () => {
    const colorGrade = new MVColorGradeEffect();
    colorGrade.contrast = 0.5;
    composer.insertBefore(colorGrade, composer.firstChild);
    await timePasses(5);
    const colorGradeScreenshot = screenshot(renderer);

    expect(ArraysAreEqual(baseScreenshot, colorGradeScreenshot)).to.be.false;
  });
});
