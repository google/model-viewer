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

import {PitchLimits} from '../../../components/camera_settings/components/pitch_limits.js';
import {getConfig} from '../../../components/config/reducer.js';
import {ModelViewerPreview} from '../../../components/model_viewer_preview/model_viewer_preview.js';
import {getModelViewer} from '../../../components/model_viewer_preview/reducer.js';
import {dispatchReset} from '../../../reducers.js';
import {reduxStore} from '../../../space_opera_base.js';
import {rafPasses} from '../../utils/test_utils.js';

describe('pitch limits editor test', () => {
  let pitchLimitsDeg: PitchLimits;
  let preview: ModelViewerPreview;

  beforeEach(async () => {
    reduxStore.dispatch(dispatchReset());
    preview = new ModelViewerPreview();
    document.body.appendChild(preview);
    await preview.updateComplete;

    pitchLimitsDeg = new PitchLimits();
    document.body.appendChild(pitchLimitsDeg);
    await pitchLimitsDeg.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(pitchLimitsDeg);
    document.body.removeChild(preview);
  });

  it('correctly dispatches when I click set', async () => {
    (pitchLimitsDeg.shadowRoot!.querySelector('#limit-enabled') as any).click();
    const modelViewer = getModelViewer()!;
    modelViewer.cameraOrbit = 'auto 33deg auto';
    modelViewer.jumpCameraToGoal();
    await rafPasses();
    await pitchLimitsDeg.updateComplete;

    (pitchLimitsDeg.shadowRoot!.querySelector('#set-max-button')! as
     HTMLInputElement)
        .click();
    await pitchLimitsDeg.updateComplete;
    expect(getConfig(reduxStore.getState()).maxCameraOrbit)
        .toEqual('auto 33deg auto');
  });
});
