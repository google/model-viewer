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


import './ibl_selector.js';

import {reduxStore} from '../../redux/space_opera_base.js';
import {dispatchAddEnvironmentImage, dispatchExposure, dispatchShadowIntensity, dispatchShadowSoftness, dispatchUseEnvAsSkybox, IblSelector} from './ibl_selector.js';

describe('ibl selector test', () => {
  let iblSelector: IblSelector;

  beforeEach(async () => {
    iblSelector = new IblSelector();
    document.body.appendChild(iblSelector);

    await iblSelector.updateComplete;
  });

  it('dispatches exposure change when slider updates', async () => {
    iblSelector.exposureSlider.clickTo(2.1);
    expect(iblSelector.config.exposure).toBe(2.1);
  });

  it('updates exposure slider when receiving exposure change', async () => {
    dispatchExposure(2);
    await iblSelector.updateComplete;
    expect(iblSelector.exposureSlider.value).toBe(2);
  });

  it('dispatches skybox change when checkbox clicked', async () => {
    dispatchUseEnvAsSkybox(false);
    expect(reduxStore.getState().config.useEnvAsSkybox).toBe(false);
    await iblSelector.updateComplete;
    iblSelector.skyboxCheckbox.click();
    expect(reduxStore.getState().config.useEnvAsSkybox).toBe(true);
  });

  it('updates checkbox state when receiving skybox change', async () => {
    dispatchUseEnvAsSkybox(false);
    await iblSelector.updateComplete;
    expect(iblSelector.skyboxCheckbox.checked).toBe(false);

    dispatchUseEnvAsSkybox(true);
    await iblSelector.updateComplete;
    expect(iblSelector.skyboxCheckbox.checked).toBe(true);
  });

  it('dispatches shadow-intensity change when slider moved', async () => {
    dispatchShadowIntensity(0.5);
    expect(reduxStore.getState().config.shadowIntensity).toBe(0.5);
    await iblSelector.updateComplete;
    for (const value of [0.5, 0.9, 0, 1]) {
      iblSelector.shadowIntensitySlider.clickTo(value);
      expect(reduxStore.getState().config.shadowIntensity).toBe(value);
    }
  });

  it('updates slider state after shadow-intensity change', async () => {
    for (const value of [0.5, 0.9, 0, 1]) {
      dispatchShadowIntensity(value);
      await iblSelector.updateComplete;
      expect(iblSelector.shadowIntensitySlider.value).toBe(value);
    }
  });

  it('dispatches shadow-softness change when slider moved', async () => {
    dispatchShadowSoftness(0.5);
    expect(reduxStore.getState().config.shadowSoftness).toBe(0.5);
    await iblSelector.updateComplete;
    for (const value of [0.5, 0.9, 0, 1]) {
      iblSelector.shadowSoftnessSlider.clickTo(value);
      expect(reduxStore.getState().config.shadowSoftness).toBe(value);
    }
  });

  it('updates slider state after shadow-softness change', async () => {
    for (const value of [0.5, 0.9, 0, 1]) {
      dispatchShadowSoftness(value);
      await iblSelector.updateComplete;
      expect(iblSelector.shadowSoftnessSlider.value).toBe(value);
    }
  });

  it('updates dropdown menu on environmentImages changes', async () => {
    const dropdown = iblSelector.shadowRoot!.querySelector('me-dropdown')!;
    let listItems = dropdown.querySelectorAll('paper-item');
    // Initial items are set in space_opera_base, excludes those in tests
    const initialItemsCount = listItems.length;

    dispatchAddEnvironmentImage({uri: 'test-uri-1', name: 'test-name-1'});
    dispatchAddEnvironmentImage({uri: 'test-uri-2', name: 'test-name-2'});
    await iblSelector.updateComplete;

    listItems = dropdown.querySelectorAll('paper-item');
    expect(listItems.length).toBe(initialItemsCount + 2);
    expect(listItems[initialItemsCount].getAttribute('value'))
        .toBe('test-uri-1');
    expect(listItems[initialItemsCount + 1].getAttribute('value'))
        .toBe('test-uri-2');
  });

  it('dispatches environmentImage change when selecting an item under dropdown',
     async () => {
       dispatchAddEnvironmentImage({uri: 'test-uri-1', name: 'test-name-1'});
       dispatchAddEnvironmentImage({uri: 'test-uri-2', name: 'test-name-2'});
       await iblSelector.updateComplete;
       const dropdown = iblSelector.shadowRoot!.querySelector('me-dropdown')!;

       // Click on an arbitrary item in dropdown sets environment image.
       const item = dropdown.querySelector('paper-item[value="test-uri-1"]') as
           HTMLElement;
       item.click();
       expect(reduxStore.getState().config.environmentImage).toBe('test-uri-1');

       // Click on the Default item in dropdown unsets environment image.
       const noneItem =
           dropdown.querySelectorAll('paper-item')[0] as HTMLElement;
       noneItem.click();
       expect(reduxStore.getState().config.environmentImage).not.toBeDefined();
     });
});
