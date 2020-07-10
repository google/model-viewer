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


import './yaw_limits.js';

import {degToRad} from '@google/model-viewer-editing-adapter/lib/util/math.js'
import {dispatchCurrentCameraState, reduxStore} from '../../redux/space_opera_base.js';

import {DEFAULT_MAX_YAW, dispatchYawLimits, YawLimits} from './yaw_limits.js';

describe('yaw limits editor test', () => {
  let yawLimits: YawLimits;

  beforeEach(async () => {
    yawLimits = new YawLimits();
    document.body.appendChild(yawLimits);
    dispatchYawLimits({enabled: false, min: 0, max: 0});
    await yawLimits.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(yawLimits);
  });

  it('correctly loads yaw limits', async () => {
    dispatchYawLimits({enabled: true, min: 12, max: 34});
    await yawLimits.updateComplete;
    expect(yawLimits.inputLimits.enabled).toEqual(true);
    expect(yawLimits.inputLimits.min).toEqual(12);
    expect(yawLimits.inputLimits.max).toEqual(34);
  });

  it('correctly dispatches when I click set and clear', async () => {
    dispatchYawLimits({enabled: true, min: 0, max: degToRad(99)});
    dispatchCurrentCameraState(
        {orbit: {theta: degToRad(33), radius: 10, phi: 0}});
    await yawLimits.updateComplete;

    (yawLimits.shadowRoot!.querySelector('#set-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.yawLimits!.max).toEqual(33);

    (yawLimits.shadowRoot!.querySelector('#clear-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.yawLimits!.max)
        .toEqual(DEFAULT_MAX_YAW);
  });
});
