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

import {CameraSettings, CameraTargetInput} from '../../components/camera_settings/camera_settings.js';
import {dispatchAutoRotate, dispatchCameraTarget, dispatchSaveCameraOrbit, getConfig} from '../../components/config/reducer.js';
import {Vector3D} from '../../components/config/types.js';
import {getModelViewer} from '../../components/model_viewer_preview/reducer.js';
import {DraggableInput} from '../../components/shared/draggable_input/draggable_input.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';

describe('camera constraints test', () => {
  let cameraSettings: CameraSettings;

  beforeEach(async () => {
    reduxStore.dispatch(dispatchReset());
    expect(getModelViewer()).toBeUndefined();
    // Mock for the ModelViewerPreview component
    document.body.innerHTML += `
    <model-viewer-preview>
      <model-viewer>
      </model-viewer>
    </model-viewer-preview>
    `;

    cameraSettings = new CameraSettings();
    document.body.appendChild(cameraSettings);
    await cameraSettings.updateComplete;
  });

  afterEach(() => {
    cameraSettings.config = {};
    document.body.removeChild(cameraSettings);
    const preview = document.querySelector('model-viewer-preview')!;
    document.body.removeChild(preview);
  });

  it('updates the camera target on camera target change', () => {
    reduxStore.dispatch(dispatchCameraTarget({x: 1, y: 2, z: 3}));
    expect(getConfig(reduxStore.getState()).cameraTarget).toEqual('1m 2m 3m');
  });

  it('updates camera target on UI change', async () => {
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

    expect(getConfig(reduxStore.getState()).cameraTarget).toEqual('6m 0m 0m');
  });

  it('reflects the correct camera orbit in its editor UI', async () => {
    const orbit = {phiDeg: 12, thetaDeg: 34, radius: 56};
    reduxStore.dispatch(dispatchSaveCameraOrbit(orbit));
    await cameraSettings.updateComplete;
    const actualOrbit = cameraSettings.cameraOrbitEditor!.currentOrbit;
    expect(actualOrbit.phiDeg).toBeCloseTo(orbit.phiDeg);
    expect(actualOrbit.thetaDeg).toBeCloseTo(orbit.thetaDeg);
  });

  it('dispatches the correct camera orbit if its UI is changed', async () => {
    const orbit = {phiDeg: 12, thetaDeg: 34, radius: 56};
    reduxStore.dispatch(dispatchSaveCameraOrbit(orbit));
    await cameraSettings.updateComplete;
    expect(cameraSettings.cameraOrbitEditor).toBeDefined();
    const yawInput = cameraSettings.cameraOrbitEditor!.yawInput!;
    expect(yawInput).toBeDefined();
    expect(yawInput).not.toBeNull();
    // Now has a dependency on model-viewer via onCameraOrbitEditorChange()
  });

  it('dispatches auto-rotate change when checkbox clicked', async () => {
    reduxStore.dispatch(dispatchAutoRotate(false));
    expect(getConfig(reduxStore.getState()).autoRotate).toBe(false);
    await cameraSettings.updateComplete;
    cameraSettings.autoRotateCheckbox.click();
    expect(getConfig(reduxStore.getState()).autoRotate).toBe(true);
  });

  it('updates checkbox state when receiving auto-rotate change', async () => {
    reduxStore.dispatch(dispatchAutoRotate(false));
    await cameraSettings.updateComplete;
    expect(cameraSettings.autoRotateCheckbox.checked).toBe(false);

    reduxStore.dispatch(dispatchAutoRotate(true));
    await cameraSettings.updateComplete;
    expect(cameraSettings.autoRotateCheckbox.checked).toBe(true);
  });
});
