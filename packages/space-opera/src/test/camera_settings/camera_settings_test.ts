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

import '../../components/camera_settings/camera_settings.js';

import {expect} from '@esm-bundle/chai';

import {CameraSettings, CameraTargetInput} from '../../components/camera_settings/camera_settings.js';
import {dispatchAutoRotate, dispatchCameraTarget, dispatchSaveCameraOrbit, getConfig} from '../../components/config/reducer.js';
import {Vector3D} from '../../components/config/types.js';
import {ModelViewerPreview} from '../../components/model_viewer_preview/model_viewer_preview.js';
import {DraggableInput} from '../../components/shared/draggable_input/draggable_input.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';

suite('camera constraints test', () => {
  let cameraSettings: CameraSettings;
  let preview: ModelViewerPreview;

  setup(async () => {
    reduxStore.dispatch(dispatchReset());
    preview = new ModelViewerPreview();
    document.body.appendChild(preview);
    await preview.updateComplete;

    cameraSettings = new CameraSettings();
    document.body.appendChild(cameraSettings);
    await cameraSettings.updateComplete;
  });

  teardown(async () => {
    await cameraSettings.updateComplete;
    document.body.removeChild(cameraSettings);
    document.body.removeChild(preview);
  });

  test('updates the camera target on camera target change', () => {
    reduxStore.dispatch(dispatchCameraTarget({x: 1, y: 2, z: 3}));
    expect(getConfig(reduxStore.getState()).cameraTarget)
        .to.be.equal('1m 2m 3m');
  });

  test('updates camera target on UI change', async () => {
    await cameraSettings.updateComplete;
    const cameraTargetInput =
        cameraSettings.shadowRoot!.querySelector('me-camera-target-input') as
        CameraTargetInput;
    cameraTargetInput.target = {x: 0, y: 0, z: 0} as Vector3D;
    await cameraTargetInput.updateComplete;

    const x = cameraTargetInput.shadowRoot!.querySelector(
                  'me-draggable-input#camera-target-x') as DraggableInput;
    const xInput = x.shadowRoot!.querySelector('input') as HTMLInputElement;
    xInput.value = '6';
    xInput.dispatchEvent(new Event('change'));

    expect(getConfig(reduxStore.getState()).cameraTarget)
        .to.be.equal('6m 0m 0m');
  });

  test('dispatches the correct camera orbit if its UI is changed', async () => {
    const orbit = {phi: 0.5, theta: 1, radius: 56};
    reduxStore.dispatch(dispatchSaveCameraOrbit(orbit));
    await cameraSettings.updateComplete;
    expect(cameraSettings.cameraOrbitEditor).to.be.ok;
    const yawInput = cameraSettings.cameraOrbitEditor!.yawInput!;
    expect(yawInput).to.be.ok;
    expect(yawInput).to.be.not.null;
  });

  test('dispatches auto-rotate change when checkbox clicked', async () => {
    reduxStore.dispatch(dispatchAutoRotate(false));
    expect(getConfig(reduxStore.getState()).autoRotate).to.be.equal(false);
    await cameraSettings.updateComplete;
    cameraSettings.autoRotateCheckbox.click();
    expect(getConfig(reduxStore.getState()).autoRotate).to.be.equal(true);
  });

  test('updates checkbox state when receiving auto-rotate change', async () => {
    reduxStore.dispatch(dispatchAutoRotate(false));
    await cameraSettings.updateComplete;
    expect(cameraSettings.autoRotateCheckbox.checked).to.be.equal(false);

    reduxStore.dispatch(dispatchAutoRotate(true));
    await cameraSettings.updateComplete;
    expect(cameraSettings.autoRotateCheckbox.checked).to.be.equal(true);
  });
});
