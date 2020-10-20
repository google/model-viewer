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

import {Action} from '../../types.js';
import {CurrentCamera, INITIAL_CAMERA} from './camera_state.js';

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
  // if (!initialCamera)
  //   return;
  return {type: SET_INITIAL_CAMERA_STATE, payload: {...initialCamera}};
}

export function initialCameraReducer(
    state: Camera = INITIAL_CAMERA, action: Action): Camera {
  switch (action.type) {
    case SET_INITIAL_CAMERA_STATE:
      return action.payload;
    default:
      return state;
  }
}

// CURRENT CAMERA //////////////

/**
 * For any component to use when they need to reference the current preview
 * camera state.
 */
const SET_CURRENT_CAMERA_STATE = 'SET_CURRENT_CAMERA_STATE';
export function dispatchCurrentCameraState(currentCamera?: Camera) {
  // if (!currentCamera)
  //   return;
  return {type: SET_CURRENT_CAMERA_STATE, payload: {...currentCamera}};
}

export function currentCameraReducer(
    state: CurrentCamera = {}, action: Action): CurrentCamera {
  switch (action.type) {
    case SET_CURRENT_CAMERA_STATE:
      return {
        ...state, currentCamera: action.payload
      }
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
  // if (yawLimitsDeg === reduxStore.getState().camera.yawLimitsDeg) {
  //   throw new Error(
  //       'Do not edit yawLimitsDeg in place. You passed in the same object');
  // }
  return {type: SET_CAMERA_YAW_LIMITS, payload: yawLimitsDeg};
}

/** Dispatch change to radius limits */
const SET_CAMERA_RADIUS_LIMITS = 'SET_CAMERA_RADIUS_LIMITS';
export function dispatchRadiusLimits(radiusLimits?: Limits) {
  if (!radiusLimits) {
    throw new Error('No valid limits given');
  }
  // if (radiusLimits === reduxStore.getState().camera.radiusLimits) {
  //   throw new Error(
  //       'Do not edit radiusLimits in place. You passed in the same object');
  // }
  return {type: SET_CAMERA_RADIUS_LIMITS, payload: radiusLimits};
}

/** Dispatch change to maximum pitch */
const SET_CAMERA_PITCH_LIMITS = 'SET_CAMERA_PITCH_LIMITS';
export function dispatchPitchLimits(pitchLimitsDeg?: Limits) {
  if (!pitchLimitsDeg) {
    throw new Error('No valid limits given');
  }
  // if (pitchLimitsDeg === reduxStore.getState().camera.pitchLimitsDeg) {
  //   throw new Error(
  //       'Do not edit pitchLimitsDeg in place. You passed in the same
  //       object');
  // }
  return {type: SET_CAMERA_PITCH_LIMITS, payload: pitchLimitsDeg};
}

/** Dispatch change to maximum FOV */
const SET_CAMERA_FOV_LIMITS = 'SET_CAMERA_FOV_LIMITS';
export function dispatchFovLimits(fovLimitsDeg?: Limits) {
  if (!fovLimitsDeg) {
    throw new Error('No valid FOV limit given');
  }
  // if (fovLimitsDeg === reduxStore.getState().camera.fovLimitsDeg) {
  //   throw new Error(
  //       'Do not edit fovLimitsDeg in place. You passed in the same object');
  // }
  return {type: SET_CAMERA_FOV_LIMITS, payload: fovLimitsDeg};
}

// Orbit
const SAVE_CAMERA_ORBIT = 'SAVE_CAMERA_ORBIT';
export function dispatchSaveCameraOrbit(
    currentOrbit: SphericalPositionDeg|undefined,
    currentFieldOfViewDeg: number|undefined) {
  // if (!reduxStore.getState().currentCamera)
  //   return;
  // const currentOrbit = reduxStore.getState().currentCamera!.orbit;
  // if (!currentOrbit)
  //   return;
  // const currentFieldOfViewDeg =
  //     reduxStore.getState().currentCamera!.fieldOfViewDeg;
  return {
    type: SAVE_CAMERA_ORBIT,
    payload: {orbit: currentOrbit, fieldOfViewDeg: currentFieldOfViewDeg}
  };
}

/** Event dispatcher for changes to camera-target. */
const SET_CAMERA_TARGET = 'SET_CAMERA_TARGET';
export function dispatchCameraTarget(target?: Vector3D) {
  return {type: SET_CAMERA_TARGET, payload: target};
}

/** Dispatch initial orbit in camera state */
const SET_CAMERA_STATE_INITIAL_ORBIT = 'SET_CAMERA_STATE_INITIAL_ORBIT';
export function dispatchInitialOrbit(orbit?: SphericalPositionDeg) {
  // if (!orbit)
  //   return;
  return {type: SET_CAMERA_STATE_INITIAL_ORBIT, payload: orbit};
}

const SET_CAMERA = 'SET_CAMERA';
export function dispatchSetCamera(camera: Camera) {
  return {type: SET_CAMERA, payload: camera};
}

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
        ...state, orbit: {...action.payload.currentOrbit},
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
    default:
      return state;
  }
}