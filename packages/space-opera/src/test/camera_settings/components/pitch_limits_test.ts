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


import '../../../components/camera_settings/components/pitch_limits.js';

import {DEFAULT_MAX_PITCH, dispatchPitchLimits, PitchLimits} from '../../../components/camera_settings/components/pitch_limits.js';
import {dispatchCurrentCameraState, reduxStore} from '../../../space_opera_base.js';

describe('pitch limits editor test', () => {
  let pitchLimitsDeg: PitchLimits;

  beforeEach(async () => {
    pitchLimitsDeg = new PitchLimits();
    document.body.appendChild(pitchLimitsDeg);
    dispatchPitchLimits({enabled: false, min: 0, max: 0});
    await pitchLimitsDeg.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(pitchLimitsDeg);
  });

  it('correctly loads pitch limits', async () => {
    dispatchPitchLimits({enabled: true, min: 12, max: 34});
    await pitchLimitsDeg.updateComplete;
    expect(pitchLimitsDeg.inputLimits.enabled).toEqual(true);
    expect(pitchLimitsDeg.inputLimits.min).toEqual(12);
    expect(pitchLimitsDeg.inputLimits.max).toEqual(34);
  });

  it('correctly dispatches when I click set and clear', async () => {
    dispatchPitchLimits({enabled: true, min: 0, max: 99});
    dispatchCurrentCameraState({orbit: {thetaDeg: 0, radius: 10, phiDeg: 33}});
    await pitchLimitsDeg.updateComplete;

    (pitchLimitsDeg.shadowRoot!.querySelector('#set-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.pitchLimitsDeg!.max).toEqual(33);

    (pitchLimitsDeg.shadowRoot!.querySelector('#clear-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.pitchLimitsDeg!.max)
        .toEqual(DEFAULT_MAX_PITCH);
  });
});
