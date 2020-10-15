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


import './camera_settings.js';

import {dispatchAutoRotate, dispatchCameraTarget, dispatchInitialOrbit} from '../../redux/reducers/camera_settings.js';
import {dispatchCurrentCameraState} from '../../redux/space_opera_base.js';
import {reduxStore} from '../../redux/space_opera_base.js';
import {Vector3D} from '../../redux/state_types.js';

import {CameraSettings, CameraTargetInput} from './camera_settings.js';

describe('camera constraints test', () => {
  let cameraSettings: CameraSettings;

  beforeEach(async () => {
    cameraSettings = new CameraSettings();
    document.body.appendChild(cameraSettings);
  });

  afterEach(() => {
    cameraSettings.config = {};
    document.body.removeChild(cameraSettings);
  });

  it('dispatches save camera orbit state mutator on click', async () => {
    dispatchCurrentCameraState({orbit: {thetaDeg: 12, phiDeg: 34, radius: 56}});

    await cameraSettings.updateComplete;
    const saveCameraOrbitButton =
        cameraSettings.shadowRoot!.querySelector(
            'mwc-button#save-camera-angle') as HTMLInputElement;
    saveCameraOrbitButton.click();

    const orbit = reduxStore.getState().camera.orbit!;
    expect(orbit.thetaDeg).toBeCloseTo(12);
    expect(orbit.phiDeg).toBeCloseTo(34);
    expect(orbit.radius).toBeCloseTo(56);
  });

  it('updates the camera target on camera target change', () => {
    dispatchCameraTarget({x: 1, y: 2, z: 3});
    expect(cameraSettings.camera.target!.x).toEqual(1);
    expect(cameraSettings.camera.target!.y).toEqual(2);
    expect(cameraSettings.camera.target!.z).toEqual(3);
  });

  it('updates camera target on UI change', async () => {
    await cameraSettings.updateComplete;
    const cameraTargetInput =
        cameraSettings.shadowRoot!.querySelector('me-camera-target-input') as
        CameraTargetInput;
    cameraTargetInput.target = {x: 0, y: 0, z: 0} as Vector3D;
    await cameraTargetInput.updateComplete;

    const xInput =
        cameraTargetInput.shadowRoot!.querySelector(
            'me-draggable-input#camera-target-x') as HTMLInputElement;
    xInput.value = '6';
    xInput.dispatchEvent(new Event('change'));

    expect(cameraSettings.camera.target!.x).toEqual(6);
  });

  it('reflects the correct camera orbit in its editor UI', async () => {
    const orbit = {phiDeg: 12, thetaDeg: 34, radius: 56};
    dispatchInitialOrbit(orbit);
    await cameraSettings.updateComplete;
    await cameraSettings.cameraOrbitEditor!.updateComplete;
    const actualOrbit = cameraSettings.cameraOrbitEditor!.currentOrbit;
    expect(actualOrbit.phiDeg).toBeCloseTo(orbit.phiDeg);
    expect(actualOrbit.thetaDeg).toBeCloseTo(orbit.thetaDeg);
    expect(actualOrbit.radius).toBeCloseTo(orbit.radius);
  });

  it('dispatches the correct camera orbit if its UI is changed', async () => {
    const orbit = {phiDeg: 12, thetaDeg: 34, radius: 56};
    dispatchInitialOrbit(orbit);
    await cameraSettings.updateComplete;
    await cameraSettings.cameraOrbitEditor!.updateComplete;
    expect(cameraSettings.cameraOrbitEditor).toBeDefined();
    const yawInput = cameraSettings.cameraOrbitEditor!.yawInput!;
    expect(yawInput).toBeDefined();
    expect(yawInput).not.toBeNull();
    yawInput.setValue(42);
    const stateOrbit = reduxStore.getState().camera.orbit;
    expect(stateOrbit!.thetaDeg).toBeCloseTo(42);
  });

  it('dispatches auto-rotate change when checkbox clicked', async () => {
    dispatchAutoRotate(false);
    expect(reduxStore.getState().config.autoRotate).toBe(false);
    await cameraSettings.updateComplete;
    cameraSettings.autoRotateCheckbox.click();
    expect(reduxStore.getState().config.autoRotate).toBe(true);
  });

  it('updates checkbox state when receiving auto-rotate change', async () => {
    dispatchAutoRotate(false);
    await cameraSettings.updateComplete;
    expect(cameraSettings.autoRotateCheckbox.checked).toBe(false);

    dispatchAutoRotate(true);
    await cameraSettings.updateComplete;
    expect(cameraSettings.autoRotateCheckbox.checked).toBe(true);
  });
});
