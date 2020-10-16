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


import '../../../components/camera_settings/components/radius_limits.js';

import {DEFAULT_MIN_RADIUS, dispatchRadiusLimits, RadiusLimits} from '../../../components/camera_settings/components/radius_limits.js';
import {dispatchInitialCameraState} from '../../../components/camera_settings/reducer.js';
import {dispatchCurrentCameraState} from '../../../components/camera_settings/reducer.js';
import {reduxStore} from '../../../space_opera_base.js';

describe('radius limits editor test', () => {
  let radiusLimits: RadiusLimits;

  beforeEach(async () => {
    radiusLimits = new RadiusLimits();
    document.body.appendChild(radiusLimits);
    dispatchRadiusLimits({enabled: false, min: 0, max: 0});
    await radiusLimits.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(radiusLimits);
  });

  it('correctly loads radius limits', async () => {
    // Needed to even allow max of 34
    dispatchInitialCameraState({orbit: {thetaDeg: 0, phiDeg: 0, radius: 10}});
    dispatchRadiusLimits({enabled: true, min: 12, max: 34});
    await radiusLimits.updateComplete;
    expect(radiusLimits.inputLimits.enabled).toEqual(true);
    expect(radiusLimits.inputLimits.min).toEqual(12);
    expect(radiusLimits.inputLimits.max).toEqual(34);
  });

  it('correctly dispatches when I click set and clear', async () => {
    // Enable to show the buttons
    dispatchRadiusLimits({enabled: true, min: 0, max: 99});
    dispatchCurrentCameraState({orbit: {thetaDeg: 0, radius: 10, phiDeg: 33}});
    await radiusLimits.updateComplete;

    (radiusLimits.shadowRoot!.querySelector('#set-min-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.radiusLimits!.min).toEqual(10);

    (radiusLimits.shadowRoot!.querySelector('#clear-min-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.radiusLimits!.min)
        .toEqual(DEFAULT_MIN_RADIUS);
  });
});
