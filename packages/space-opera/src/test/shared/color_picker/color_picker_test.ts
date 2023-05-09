/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
 *
 */

import '../../../components/shared/color_picker/color_picker.js';

import {expect} from '@esm-bundle/chai';

import {ColorPicker} from '../../../components/shared/color_picker/color_picker.js';

suite('color picker test', () => {
  let colorPicker: ColorPicker;

  setup(async () => {
    colorPicker = new ColorPicker();
    document.body.appendChild(colorPicker);
    await colorPicker.updateComplete;
  });

  teardown(async () => {
    document.body.removeChild(colorPicker);
  });

  test('updates the hue on slider input', async () => {
    colorPicker.selectedColorHex = '#0000cc';
    await colorPicker.updateComplete;

    colorPicker.hueSlider.value = '30';
    colorPicker.hueSlider.dispatchEvent(new Event('input'));
    await colorPicker.updateComplete;

    expect(colorPicker.selectedColorHex).to.be.equal('#cc6600');
  });

  test('dispatches a change event on color change', () => {
    let nCalled = 0;
    const handler = () => ++nCalled;
    colorPicker.addEventListener('change', handler);

    colorPicker.onColorChange();

    expect(nCalled).to.be.eq(1);
  });

  test('dispatches a change event on hue input', () => {
    let nCalled = 0;
    const handler = () => ++nCalled;
    colorPicker.addEventListener('change', handler);

    colorPicker.onHueInput();

    expect(nCalled).to.be.eq(1);
  });

  test('updates the UI on selectedColorHex change', async () => {
    const exampleHex = '#55FF00';
    colorPicker.selectedColorHex = exampleHex;
    await colorPicker.updateComplete;

    expect(colorPicker.selectedColorHex).to.be.equal(exampleHex);
    expect(colorPicker.colorMap.hue).to.be.equal(100);
    expect(colorPicker.colorMap.saturation).to.be.equal(1);
    expect(colorPicker.colorMap.value).to.be.equal(255);


    colorPicker.colorMap.hue = 40;
    colorPicker.colorMap.dispatchEvent(new Event('change'));

    // Should be changed.
    expect(colorPicker.selectedColorHex).to.be.equal('#ffaa00');
  });
});
