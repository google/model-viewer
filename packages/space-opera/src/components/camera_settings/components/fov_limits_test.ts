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


import './fov_limits.js';

import {dispatchCurrentCameraState, reduxStore} from '../../../redux/space_opera_base.js';

import {DEFAULT_MAX_FOV, dispatchFovLimits, FovLimits} from './fov_limits.js';

describe('fov limits editor test', () => {
  let fovLimitsDeg: FovLimits;

  beforeEach(async () => {
    fovLimitsDeg = new FovLimits();
    document.body.appendChild(fovLimitsDeg);
    dispatchFovLimits({enabled: false, min: 0, max: 0});
    await fovLimitsDeg.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(fovLimitsDeg);
  });

  it('correctly loads fov limits', async () => {
    dispatchFovLimits({enabled: true, min: 12, max: 34});
    await fovLimitsDeg.updateComplete;
    expect(fovLimitsDeg.inputLimits.enabled).toEqual(true);
    expect(fovLimitsDeg.inputLimits.min).toEqual(12);
    expect(fovLimitsDeg.inputLimits.max).toEqual(34);
  });

  it('correctly dispatches when I click set and clear', async () => {
    dispatchFovLimits({enabled: true, min: 0, max: 99});
    dispatchCurrentCameraState({fieldOfViewDeg: 42});
    await fovLimitsDeg.updateComplete;

    (fovLimitsDeg.shadowRoot!.querySelector('#set-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.fovLimitsDeg!.max).toEqual(42);

    (fovLimitsDeg.shadowRoot!.querySelector('#clear-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.fovLimitsDeg!.max)
        .toEqual(DEFAULT_MAX_FOV);
  });
});
