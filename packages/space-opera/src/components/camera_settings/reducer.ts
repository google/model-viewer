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

import {Action, State} from '../../types.js';
import {INITIAL_CAMERA} from './camera_state.js';

import {Camera} from './camera_state.js';
import {SphericalPositionDeg, Vector3D} from './types.js';
import {Limits} from './types.js';

// INITIAL CAMERA //////////////

/**
 * Used to initialize camera state with model-viewer's initial state. This means
 * we can rely on it to parse things like camera orbit strings, rather than
 * doing it ourselves.
 */
const SET_INITIAL_CAMERA_STATE = 'SET_INITIAL_CAMERA_STATE';
export function dispatchInitialCameraState(initialCamera?: Camera) {
  return {type: SET_INITIAL_CAMERA_STATE, payload: {...initialCamera}};
}

export const getInitialCamera = (state: State) => state.entities.initialCamera;

export function initialCameraReducer(
    state: Camera = INITIAL_CAMERA, action: Action): Camera {
  switch (action.type) {
    case SET_INITIAL_CAMERA_STATE:
      return action.payload;
    default:
      return state;
  }
}

// DIRTY CAMERA//////////////

const IS_DIRTY_CAMERA = 'IS_DIRTY_CAMERA';
export function dispatchCameraIsDirty() {
  return {type: IS_DIRTY_CAMERA};
}

export const getIsDirtyCamera = (state: State) => state.entities.isDirtyCamera;

export function isDirtyCameraReducer(
    state: boolean = false, action: Action): boolean {
  switch (action.type) {
    case IS_DIRTY_CAMERA:
      return !state;
    default:
      return state;
  }
}

// CAMERA //////////////

/** Dispatch change to maximum pitch */
const SET_CAMERA_YAW_LIMITS = 'SET_CAMERA_YAW_LIMITS';
export function dispatchYawLimits(yawLimitsDeg?: Limits) {
  if (!yawLimitsDeg) {
    throw new Error('No limits given');
  }
  return {type: SET_CAMERA_YAW_LIMITS, payload: yawLimitsDeg};
}

/** Dispatch change to radius limits */
const SET_CAMERA_RADIUS_LIMITS = 'SET_CAMERA_RADIUS_LIMITS';
export function dispatchRadiusLimits(radiusLimits?: Limits) {
  return {type: SET_CAMERA_RADIUS_LIMITS, payload: radiusLimits};
}

/** Dispatch change to maximum pitch */
const SET_CAMERA_PITCH_LIMITS = 'SET_CAMERA_PITCH_LIMITS';
export function dispatchPitchLimits(pitchLimitsDeg?: Limits) {
  return {type: SET_CAMERA_PITCH_LIMITS, payload: pitchLimitsDeg};
}

/** Dispatch change to maximum FOV */
const SET_CAMERA_FOV_LIMITS = 'SET_CAMERA_FOV_LIMITS';
export function dispatchFovLimits(fovLimitsDeg?: Limits) {
  return {type: SET_CAMERA_FOV_LIMITS, payload: fovLimitsDeg};
}

const SET_MIN_ZOOM = 'SET_MIN_ZOOM';
export function dispatchSetMinZoom(
    fovDeg: number|string, radius: number|string) {
  return {
    type: SET_MIN_ZOOM, payload: {radius: radius, fov: fovDeg}
  }
}

const SET_MAX_ZOOM = 'SET_MAX_ZOOM';
export function dispatchSetMaxZoom(
    fovDeg: number|string, radius: number|string) {
  return {
    type: SET_MAX_ZOOM, payload: {radius: radius, fov: fovDeg}
  }
}

const SET_ZOOM_ENABLED = 'SET_ZOOM_ENABLED';
export function dispatchZoomEnabled(isEnabled: boolean) {
  return {
    type: SET_ZOOM_ENABLED, payload: isEnabled
  }
}

// Orbit
const SAVE_CAMERA_ORBIT = 'SAVE_CAMERA_ORBIT';
export function dispatchSaveCameraOrbit(
    currentOrbit: SphericalPositionDeg|undefined,
    currentFieldOfViewDeg: number|undefined) {
  return {
    type: SAVE_CAMERA_ORBIT,
    payload: {orbit: {...currentOrbit}, fieldOfViewDeg: currentFieldOfViewDeg}
  };
}

/** Event dispatcher for changes to camera-target. */
const SET_CAMERA_TARGET = 'SET_CAMERA_TARGET';
export function dispatchCameraTarget(target?: Vector3D) {
  return {type: SET_CAMERA_TARGET, payload: target};
}

/** Dispatch initial orbit in camera state */
const SET_CAMERA_STATE_INITIAL_ORBIT = 'SET_CAMERA_STATE_INITIAL_ORBIT';
export function dispatchInitialOrbit(orbit: SphericalPositionDeg) {
  return {type: SET_CAMERA_STATE_INITIAL_ORBIT, payload: orbit};
}

const SET_CAMERA = 'SET_CAMERA';
export function dispatchSetCamera(camera: Camera) {
  return {type: SET_CAMERA, payload: camera};
}

export const getCamera = (state: State) =>
    state.entities.modelViewerSnippet.camera;

export function cameraReducer(
    state: Camera = INITIAL_CAMERA, action: Action): Camera {
  switch (action.type) {
    case SET_CAMERA:
      return action.payload;
    case SET_CAMERA_STATE_INITIAL_ORBIT:
      return {...state, orbit: action.payload};
    case SET_CAMERA_TARGET:
      return {
        ...state, target: action.payload
      }
    case SAVE_CAMERA_ORBIT:
      return {
        ...state, orbit: {...action.payload.orbit},
            fieldOfViewDeg: action.payload.fieldOfViewDeg,
      }
    case SET_CAMERA_FOV_LIMITS:
      return {
        ...state, fovLimitsDeg: action.payload
      }
    case SET_CAMERA_PITCH_LIMITS:
      return {
        ...state, pitchLimitsDeg: action.payload
      }
    case SET_CAMERA_RADIUS_LIMITS:
      return {
        ...state, radiusLimits: action.payload
      }
    case SET_CAMERA_YAW_LIMITS:
      return {
        ...state, yawLimitsDeg: action.payload
      }
    case SET_MIN_ZOOM:
      return {
        ...state,
            radiusLimits: {...state.radiusLimits!, min: action.payload.radius},
            fovLimitsDeg: {...state.fovLimitsDeg!, min: action.payload.fov}
      }
    case SET_MAX_ZOOM:
      return {
        ...state,
            radiusLimits: {...state.radiusLimits!, max: action.payload.radius},
            fovLimitsDeg: {...state.fovLimitsDeg!, max: action.payload.fov}
      }
    case SET_ZOOM_ENABLED:
      return {
        ...state,
            radiusLimits: {...state.radiusLimits!, enabled: action.payload},
            fovLimitsDeg: {...state.fovLimitsDeg!, enabled: action.payload}
      }
    default:
      return state;
  }
}