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

import {Action, INITIAL_STATE, ModelViewerConfig, State} from '../../types.js';
import {radToDeg, roundToDigits} from '../utils/reducer_utils.js';

import {Limits, Vector3D} from './types.js';

const DIGITS = 4;

function getMinString(limits: Limits|undefined, suffix: string) {
  if (!limits || !limits.enabled) {
    return 'auto';
  }
  return `${roundToDigits(limits.min, DIGITS)}${suffix}`;
}

function getMaxString(limits: Limits|undefined, suffix: string) {
  if (!limits || !limits.enabled) {
    return 'auto';
  }
  return `${roundToDigits(limits.max, DIGITS)}${suffix}`;
}

function getUpdatedLimits(
    state: ModelViewerConfig, limits: Limits, position: number) {
  const DEFAULT = 'auto auto auto';
  const suffix = position === 2 ? 'm' : 'deg';
  const {minCameraOrbit, maxCameraOrbit} = state;
  const min = (minCameraOrbit == null ? DEFAULT : minCameraOrbit).split(' ');
  min[position] = getMinString(limits, suffix);
  const minString = min.join(' ');
  const max = (maxCameraOrbit == null ? DEFAULT : maxCameraOrbit).split(' ');
  max[position] = getMaxString(limits, suffix);
  const maxString = max.join(' ');
  return {
    minCameraOrbit: minString === DEFAULT ? undefined : minString,
    maxCameraOrbit: maxString === DEFAULT ? undefined : maxString
  };
}

export function getOrbitString(orbit: {theta: number, phi: number}) {
  return `${roundToDigits(radToDeg(orbit.theta), DIGITS)}deg ${
      roundToDigits(radToDeg(orbit.phi), DIGITS)}deg auto`;
}

const SET_CAMERA_CONTROLS_ENABLED = 'SET_CAMERA_CONTROLS_ENABLED';
export function dispatchCameraControlsEnabled(enabled?: boolean) {
  return {type: SET_CAMERA_CONTROLS_ENABLED, payload: !!enabled};
}

const SET_AUTO_ROTATE = 'SET_AUTO_ROTATE';
export function dispatchAutoRotate(autoRotate?: boolean) {
  return {type: SET_AUTO_ROTATE, payload: autoRotate};
}

const SET_AUTOPLAY_ENABLED = 'SET_AUTOPLAY_ENABLED';
export function dispatchAutoplayEnabled(enabled?: boolean) {
  return {type: SET_AUTOPLAY_ENABLED, payload: !!enabled};
}

const SET_ANIMATION_NAME = 'SET_ANIMATION_NAME';
export function dispatchAnimationName(animationName?: string) {
  return {type: SET_ANIMATION_NAME, payload: animationName};
}

const UPDATE_IBL = 'UPDATE_IBL';
export function dispatchEnvrionmentImage(ibl?: string) {
  return {type: UPDATE_IBL, payload: ibl};
}

const UPDATE_EXPOSURE = 'UPDATE_EXPOSURE';
export function dispatchExposure(exposure?: number) {
  return {type: UPDATE_EXPOSURE, payload: exposure};
}

const SET_USE_ENV_AS_SKYBOX = 'SET_USE_ENV_AS_SKYBOX';
export function dispatchUseEnvAsSkybox(useEnvAsSkybox?: boolean) {
  return {type: SET_USE_ENV_AS_SKYBOX, payload: useEnvAsSkybox};
}

const UPDATE_SHADOW_INTENSITY = 'UPDATE_SHADOW_INTENSITY';
export function dispatchShadowIntensity(shadowIntensity?: number) {
  return {type: UPDATE_SHADOW_INTENSITY, payload: shadowIntensity};
}

const UPDATE_SHADOW_SOFTNESS = 'UPDATE_SHADOW_SOFTNESS';
export function dispatchShadowSoftness(shadowSoftness?: number) {
  return {type: UPDATE_SHADOW_SOFTNESS, payload: shadowSoftness};
}

const SET_POSTER = 'SET_POSTER';
export function dispatchSetPoster(poster?: string) {
  return {type: SET_POSTER, payload: poster};
}

// CURRENTLY UNUSED
const SET_REVEAL = 'SET_REVEAL';
export function dispatchSetReveal(reveal?: string) {
  return {type: SET_REVEAL, payload: reveal};
}

// CAMERA //////////////

const SET_CAMERA_YAW_LIMITS = 'SET_CAMERA_YAW_LIMITS';
export function dispatchYawLimits(yawLimitsDeg?: Limits) {
  return {type: SET_CAMERA_YAW_LIMITS, payload: yawLimitsDeg};
}

const SET_CAMERA_RADIUS_LIMITS = 'SET_CAMERA_RADIUS_LIMITS';
export function dispatchRadiusLimits(radiusLimits?: Limits) {
  return {type: SET_CAMERA_RADIUS_LIMITS, payload: radiusLimits};
}

const SET_CAMERA_PITCH_LIMITS = 'SET_CAMERA_PITCH_LIMITS';
export function dispatchPitchLimits(pitchLimitsDeg?: Limits) {
  return {type: SET_CAMERA_PITCH_LIMITS, payload: pitchLimitsDeg};
}

const SET_CAMERA_FOV_LIMITS = 'SET_CAMERA_FOV_LIMITS';
export function dispatchFovLimits(fovLimitsDeg?: Limits) {
  return {type: SET_CAMERA_FOV_LIMITS, payload: fovLimitsDeg};
}

const SET_MIN_ZOOM = 'SET_MIN_ZOOM';
export function dispatchSetMinZoom(fovDeg?: number, radius?: number) {
  return {
    type: SET_MIN_ZOOM, payload: {radius: radius, fov: fovDeg}
  }
}

const SAVE_CAMERA_ORBIT = 'SAVE_CAMERA_ORBIT';
export function dispatchSaveCameraOrbit(orbit: {theta: number, phi: number}|
                                        undefined) {
  return {type: SAVE_CAMERA_ORBIT, payload: orbit};
}

const SET_CAMERA_TARGET = 'SET_CAMERA_TARGET';
export function dispatchCameraTarget(target?: Vector3D) {
  return {type: SET_CAMERA_TARGET, payload: target};
}

const SET_CONFIG = 'SET_CONFIG';
export function dispatchConfig(config: ModelViewerConfig) {
  return {type: SET_CONFIG, payload: config};
}

export const getConfig = (state: State) =>
    state.entities.modelViewerSnippet.config;

export function configReducer(
    state: ModelViewerConfig = INITIAL_STATE.entities.modelViewerSnippet.config,
    action: Action): ModelViewerConfig {
  switch (action.type) {
    case SET_CONFIG:
      return action.payload;
    case SET_REVEAL:
      return {...state, reveal: action.payload};
    case SET_POSTER:
      return {...state, poster: action.payload};
    case UPDATE_SHADOW_SOFTNESS:
      return {...state, shadowSoftness: action.payload};
    case UPDATE_SHADOW_INTENSITY:
      return {...state, shadowIntensity: action.payload};
    case SET_USE_ENV_AS_SKYBOX:
      return {...state, useEnvAsSkybox: action.payload};
    case UPDATE_EXPOSURE:
      return {...state, exposure: action.payload};
    case UPDATE_IBL:
      return {...state, environmentImage: action.payload};
    case SET_AUTOPLAY_ENABLED:
      return {...state, autoplay: action.payload};
    case SET_ANIMATION_NAME:
      return {...state, animationName: action.payload};
    case SET_CAMERA_CONTROLS_ENABLED:
      return {...state, cameraControls: action.payload};
    case SET_AUTO_ROTATE:
      return {...state, autoRotate: action.payload};
    case SET_CAMERA_TARGET:
      const target = action.payload;
      const cameraTarget = target == null ?
          undefined :
          `${roundToDigits(target.x, DIGITS)}m ${
              roundToDigits(
                  target.y, DIGITS)}m ${roundToDigits(target.z, DIGITS)}m`;
      return {...state, cameraTarget};
    case SAVE_CAMERA_ORBIT:
      const orbit = action.payload;
      const cameraOrbit =
          orbit == null ? undefined : getOrbitString(action.payload);
      return {...state, cameraOrbit};
    case SET_CAMERA_FOV_LIMITS:
      return {
        ...state,
        minFov: getMinString(action.payload, 'deg'),
        maxFov: getMaxString(action.payload, 'deg')
      };
    case SET_CAMERA_PITCH_LIMITS:
      return {...state, ...getUpdatedLimits(state, action.payload, 1)};
    case SET_CAMERA_RADIUS_LIMITS:
      return {...state, ...getUpdatedLimits(state, action.payload, 2)};
    case SET_CAMERA_YAW_LIMITS:
      return {...state, ...getUpdatedLimits(state, action.payload, 0)};
    case SET_MIN_ZOOM:
      const orbitLimits = getUpdatedLimits(
          state,
          {
            enabled: action.payload.fov != null,
            min: action.payload.radius,
            max: -1
          },
          2);

      const minFov = getMinString(
          {
            enabled: action.payload.fov != null,
            min: action.payload.fov,
            max: -1
          },
          'deg');

      return {
        ...state,
        minCameraOrbit: orbitLimits.minCameraOrbit,
        minFov: minFov === 'auto' ? undefined : minFov
      };
    default:
      return state;
  }
}