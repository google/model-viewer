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

import {expect} from '@esm-bundle/chai';
import {ModelViewerElement} from '@google/model-viewer';

import {ColorGradeEffect, EffectComposer} from '../../model-viewer-effects.js';
import {ArraysAreEqual, assetPath, AverageHSL, CompareArrays, createModelViewerElement, rafPasses, screenshot, waitForEvent} from '../utilities';

suite('Color Grade Effect', () => {
  let element: ModelViewerElement;
  let composer: EffectComposer;
  let baseScreenshot: Uint8Array;
  let colorGrade: ColorGradeEffect;

  setup(async () => {
    element = createModelViewerElement(assetPath('models/Astronaut.glb'));
    composer = new EffectComposer();
    element.insertBefore(composer, element.firstChild);
    await waitForEvent(element, 'load');

    baseScreenshot = screenshot(element);
    colorGrade = new ColorGradeEffect();
    composer.insertBefore(colorGrade, composer.firstChild);
  });

  teardown(() => {
    document.body.removeChild(element);
  });

  test('Color Grade Affects Pixels', async () => {
    colorGrade.contrast = 1.0;
    await composer.updateComplete;
    await rafPasses();
    const colorGradeScreenshot = screenshot(element);

    expect(ArraysAreEqual(baseScreenshot, colorGradeScreenshot)).to.be.false;
    expect(CompareArrays(baseScreenshot, colorGradeScreenshot))
        .to.be.lessThan(0.98);
  });

  test('Saturation = 0', async () => {
    colorGrade.saturation = -1;
    await composer.updateComplete;
    await rafPasses();
    const colorGradeScreenshot = screenshot(element);
    const hslBefore = AverageHSL(baseScreenshot);
    const hslAfter = AverageHSL(colorGradeScreenshot);
    expect(hslBefore.s).to.be.greaterThan(hslAfter.s);
    expect(hslAfter.s).to.be.closeTo(0, 0.01);
  });

  test('Brightness = 0', async () => {
    colorGrade.brightness = -1;
    await composer.updateComplete;
    await rafPasses();
    const colorGradeScreenshot = screenshot(element);
    const hslBefore = AverageHSL(baseScreenshot);
    const hslAfter = AverageHSL(colorGradeScreenshot);
    expect(hslBefore.l).to.be.greaterThan(hslAfter.l);
    expect(hslAfter.l).to.be.eq(0);
  });

  test('Hue difference', async () => {
    colorGrade.brightness = colorGrade.contrast = colorGrade.saturation = 0;
    colorGrade.hue = 2;
    await composer.updateComplete;
    await rafPasses();
    const colorGradeScreenshot = screenshot(element);
    const hslBefore = AverageHSL(baseScreenshot);
    const hslAfter = AverageHSL(colorGradeScreenshot);
    expect(hslBefore.h).to.not.eq(hslAfter.h);
  });
});
