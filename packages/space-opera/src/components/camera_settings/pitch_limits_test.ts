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


import './pitch_limits.js';

import {degToRad} from '@google/model-viewer-editing-adapter/lib/util/math.js'
import {dispatchCurrentCameraState, reduxStore} from '../../redux/space_opera_base.js';

import {DEFAULT_MAX_PITCH, dispatchPitchLimits, PitchLimits} from './pitch_limits.js';

describe('pitch limits editor test', () => {
  let pitchLimits: PitchLimits;

  beforeEach(async () => {
    pitchLimits = new PitchLimits();
    document.body.appendChild(pitchLimits);
    dispatchPitchLimits({enabled: false, min: 0, max: 0});
    await pitchLimits.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(pitchLimits);
  });

  it('correctly loads pitch limits', async () => {
    dispatchPitchLimits({enabled: true, min: 12, max: 34});
    await pitchLimits.updateComplete;
    expect(pitchLimits.inputLimits.enabled).toEqual(true);
    expect(pitchLimits.inputLimits.min).toEqual(12);
    expect(pitchLimits.inputLimits.max).toEqual(34);
  });

  it('correctly dispatches when I click set and clear', async () => {
    dispatchPitchLimits({enabled: true, min: 0, max: degToRad(99)});
    dispatchCurrentCameraState(
        {orbit: {theta: 0, radius: 10, phi: degToRad(33)}});
    await pitchLimits.updateComplete;

    (pitchLimits.shadowRoot!.querySelector('#set-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.pitchLimits!.max).toEqual(33);

    (pitchLimits.shadowRoot!.querySelector('#clear-max-button')! as
     HTMLInputElement)
        .click();
    expect(reduxStore.getState().camera.pitchLimits!.max)
        .toEqual(DEFAULT_MAX_PITCH);
  });
});
