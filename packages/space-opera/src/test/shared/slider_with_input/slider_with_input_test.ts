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


import '../../../components/shared/slider_with_input/slider_with_input.js';

import {expect} from '@esm-bundle/chai';

import {SliderWithInputElement} from '../../../components/shared/slider_with_input/slider_with_input.js';

suite('slider with input test', () => {
  let sliderWithInput: SliderWithInputElement;

  setup(async () => {
    sliderWithInput = new SliderWithInputElement();
    document.body.appendChild(sliderWithInput);

    await sliderWithInput.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(sliderWithInput);
  });

  test('exists', () => {
    expect(sliderWithInput instanceof HTMLElement).to.be.equal(true);
    expect(sliderWithInput.tagName).to.be.equal('ME-SLIDER-WITH-INPUT');
  });

  test('dispatches an event when input changed', () => {
    let nCalled = 0;
    const handler = () => ++nCalled;
    sliderWithInput.addEventListener('change', handler);

    const input =
        sliderWithInput.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.value = String(6);
    input.dispatchEvent(new Event('change'));

    expect(nCalled).to.be.eq(1);
  });
});
