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
 * istributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */


import './fov_limits.js';

import {dispatchCurrentCameraState, reduxStore} from '../../redux/space_opera_base.js';

import {DEFAULT_MAX_FOV, dispatchFovLimits, FovLimits} from './fov_limits.js';

describe('fov limits editor test', () => {
  let fovLimits: FovLimits;

  beforeEach(async () => {
    fovLimits = new FovLimits();
    document.body.appendChild(fovLimits);
    dispatchFovLimits({enabled: false, min: 0, max: 0});
    await fovLimits.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(fovLimits);
  });

  it('correctly loads fov limits', async () => {
    dispatchFovLimits({enabled: true, min: 12, max: 34});
    await fovLimits.updateComplete;
    expect(fovLimits.inputLimits.enabled).toEqual(true);
    expect(fovLimits.inputLimits.min).toEqual(12);
    expect(fovLimits.inputLimits.max).toEqual(34);
  });

  it('correctly dispatches when I click set and clear', async () => {
    dispatchFovLimits({enabled: true, min: 0, max: 99});
    dispatchCurrentCameraState({fieldOfView: 42});
    await fovLimits.updateComplete;

    (fovLimits.shadowRoot!.querySelector('#set-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.fovLimits!.max).toEqual(42);

    (fovLimits.shadowRoot!.querySelector('#clear-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.fovLimits!.max)
        .toEqual(DEFAULT_MAX_FOV);
  });
});
