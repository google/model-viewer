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

import '../../components/ibl_selector/ibl_selector.js';

import {expect} from '@esm-bundle/chai';

import {dispatchExposure, dispatchShadowIntensity, dispatchShadowSoftness, dispatchUseEnvAsSkybox, getConfig} from '../../components/config/reducer.js';
import {IblSelector} from '../../components/ibl_selector/ibl_selector.js';
import {dispatchAddEnvironmentImage} from '../../components/ibl_selector/reducer.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';

suite('ibl selector test', () => {
  let iblSelector: IblSelector;

  setup(async () => {
    reduxStore.dispatch(dispatchReset());
    iblSelector = new IblSelector();
    document.body.appendChild(iblSelector);

    await iblSelector.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(iblSelector);
  });

  test('dispatches exposure change when slider updates', async () => {
    iblSelector.exposureSlider.clickTo(2.1);
    expect(iblSelector.config.exposure).to.be.equal(2.1);
  });

  test('updates exposure slider when receiving exposure change', async () => {
    reduxStore.dispatch(dispatchExposure(2));
    await iblSelector.updateComplete;
    expect(iblSelector.exposureSlider.value).to.be.equal(2);
  });

  test('dispatches skybox change when checkbox clicked', async () => {
    reduxStore.dispatch(dispatchUseEnvAsSkybox(false));
    expect(getConfig(reduxStore.getState()).useEnvAsSkybox).to.be.equal(false);
    await iblSelector.updateComplete;
    iblSelector.skyboxCheckbox.click();
    expect(getConfig(reduxStore.getState()).useEnvAsSkybox).to.be.equal(true);
  });

  test('updates checkbox state when receiving skybox change', async () => {
    reduxStore.dispatch(dispatchUseEnvAsSkybox(false));
    await iblSelector.updateComplete;
    expect(iblSelector.skyboxCheckbox.checked).to.be.equal(false);

    reduxStore.dispatch(dispatchUseEnvAsSkybox(true));
    await iblSelector.updateComplete;
    expect(iblSelector.skyboxCheckbox.checked).to.be.equal(true);
  });

  test('dispatches shadow-intensity change when slider moved', async () => {
    reduxStore.dispatch(dispatchShadowIntensity(0.5));
    expect(getConfig(reduxStore.getState()).shadowIntensity).to.be.equal(0.5);
    await iblSelector.updateComplete;
    for (const value of [0.5, 0.9, 0, 1]) {
      iblSelector.shadowIntensitySlider.clickTo(value);
      expect(getConfig(reduxStore.getState()).shadowIntensity)
          .to.be.equal(value);
    }
  });

  test('updates slider state after shadow-intensity change', async () => {
    for (const value of [0.5, 0.9, 0, 1]) {
      reduxStore.dispatch(dispatchShadowIntensity(value));
      await iblSelector.updateComplete;
      expect(iblSelector.shadowIntensitySlider.value).to.be.equal(value);
    }
  });

  test('dispatches shadow-softness change when slider moved', async () => {
    reduxStore.dispatch(dispatchShadowSoftness(0.5));
    expect(getConfig(reduxStore.getState()).shadowSoftness).to.be.equal(0.5);
    await iblSelector.updateComplete;
    for (const value of [0.5, 0.9, 0, 1]) {
      iblSelector.shadowSoftnessSlider.clickTo(value);
      expect(getConfig(reduxStore.getState()).shadowSoftness)
          .to.be.equal(value);
    }
  });

  test('updates slider state after shadow-softness change', async () => {
    for (const value of [0.5, 0.9, 0, 1]) {
      reduxStore.dispatch(dispatchShadowSoftness(value));
      await iblSelector.updateComplete;
      expect(iblSelector.shadowSoftnessSlider.value).to.be.equal(value);
    }
  });

  test('updates dropdown menu on environmentImages changes', async () => {
    const dropdown = iblSelector.shadowRoot!.querySelector('me-dropdown')!;
    let listItems = dropdown.querySelectorAll('paper-item');
    // Initial items are set in space_opera_base, excludes those in tests
    const initialItemsCount = listItems.length;

    reduxStore.dispatch(
        dispatchAddEnvironmentImage({uri: 'test-uri-1', name: 'test-name-1'}));
    reduxStore.dispatch(
        dispatchAddEnvironmentImage({uri: 'test-uri-2', name: 'test-name-2'}));
    await iblSelector.updateComplete;

    listItems = dropdown.querySelectorAll('paper-item');
    expect(listItems.length).to.be.equal(initialItemsCount + 2);
    expect(listItems[initialItemsCount].getAttribute('value'))
        .to.be.equal('test-uri-1');
    expect(listItems[initialItemsCount + 1].getAttribute('value'))
        .to.be.equal('test-uri-2');
  });

  test(
      'dispatches environmentImage change when selecting an item under dropdown',
      async () => {
        reduxStore.dispatch(dispatchAddEnvironmentImage(
            {uri: 'test-uri-1', name: 'test-name-1'}));
        reduxStore.dispatch(dispatchAddEnvironmentImage(
            {uri: 'test-uri-2', name: 'test-name-2'}));
        await iblSelector.updateComplete;
        const dropdown = iblSelector.shadowRoot!.querySelector('me-dropdown')!;

        // Click on an arbitrary item in dropdown sets environment image.
        const item = dropdown.querySelector('paper-item[value="test-uri-1"]') as
            HTMLElement;
        item.click();
        expect(getConfig(reduxStore.getState()).environmentImage)
            .to.be.equal('test-uri-1');

        // Click on the Default item in dropdown unsets environment image.
        const noneItem =
            dropdown.querySelectorAll('paper-item')[0] as HTMLElement;
        noneItem.click();
        expect(getConfig(reduxStore.getState()).environmentImage).not.to.be.ok;

        // Click on the Legacy item in dropdown sets 'legacy' mode.
        const neutralItem =
            dropdown.querySelectorAll('paper-item')[1] as HTMLElement;
        neutralItem.click();
        expect(getConfig(reduxStore.getState()).environmentImage)
            .to.be.equal('legacy');
      });
});
