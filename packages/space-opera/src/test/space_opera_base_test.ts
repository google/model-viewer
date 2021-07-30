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

import {applyCameraEdits, Camera} from '../components/camera_settings/camera_state.js';
import {ModelViewerConfig} from '../types.js';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe('space opera base test', () => {
  it('applies camera edits correctly to a model viewer config', () => {
    const camera = {
      orbit: {thetaDeg: 1.2, phiDeg: 3.4, radius: 5.6},
      target: {x: 1, y: 2, z: 3},
      fieldOfViewDeg: 42,
    };
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.cameraOrbit).toEqual('1.2deg 3.4deg 5.6m');
    expect(config.cameraTarget).toEqual('1m 2m 3m');
    expect(config.fieldOfView).toEqual('42deg');
  });

  it('does not add config fields if the edits do not have them set', () => {
    const camera = {} as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.cameraOrbit).not.toBeDefined();
    expect(config.cameraTarget).not.toBeDefined();
    expect(config.fieldOfView).not.toBeDefined();
  });

  it('leaves config fields alone if edits do not have them set', () => {
    const camera = {} as Camera;
    const config = {
      cameraOrbit: 'some orbit',
      cameraTarget: 'some target',
      fieldOfView: 'some fov',
      minCameraOrbit: 'some min orbit',
      maxCameraOrbit: 'some max orbit',
    };
    applyCameraEdits(config, camera);
    expect(config.cameraOrbit).toEqual('some orbit');
    expect(config.cameraTarget).toEqual('some target');
    expect(config.fieldOfView).toEqual('some fov');
    expect(config.minCameraOrbit).toEqual('some min orbit');
    expect(config.maxCameraOrbit).toEqual('some max orbit');
  });

  it('sets correct attributes for disabled camera pitch limits', () => {
    const camera = {
      pitchLimitsDeg: {min: 10, max: 20, enabled: false},
    } as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.minCameraOrbit).toEqual('auto auto auto');
    expect(config.maxCameraOrbit).toEqual('auto auto auto');
  });

  it('sets correct attributes for enabled pitch limits', () => {
    const camera = {
      pitchLimitsDeg: {min: 10, max: 20, enabled: true},
    } as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.minCameraOrbit).toEqual('auto 10deg auto');
    expect(config.maxCameraOrbit).toEqual('auto 20deg auto');
  });

  it('sets correct attributes for FOV limits', () => {
    const camera = {
      fovLimitsDeg: {min: 10, max: 20, enabled: true},
    } as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.minFov).toEqual('10deg');
    expect(config.maxFov).toEqual('20deg');
  });
});
