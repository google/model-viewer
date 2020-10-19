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

import {Action, reduxStore} from '../../space_opera_base.js';

import {Camera} from './camera_state.js';
import {SphericalPositionDeg, Vector3D} from './types.js';

// INITIAL CAMERA //////////////

/**
 * Used to initialize camera state with model-viewer's initial state. This means
 * we can rely on it to parse things like camera orbit strings, rather than
 * doing it ourselves.
 */
const SET_INITIAL_CAMERA_STATE = 'SET_INITIAL_CAMERA_STATE';
export function dispatchInitialCameraState(initialCamera?: Camera) {
  if (!initialCamera)
    return;
  reduxStore.dispatch(
      {type: SET_INITIAL_CAMERA_STATE, payload: {...initialCamera}})
}

export function initialCameraReducer(state: Camera, action: Action): Camera {
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
  if (!currentCamera)
    return;
  reduxStore.dispatch(
      {type: SET_CURRENT_CAMERA_STATE, payload: {...currentCamera}})
}

export function currentCameraReducer(state: Camera, action: Action): Camera {
  switch (action.type) {
    case SET_CURRENT_CAMERA_STATE:
      return action.payload;
    default:
      return state;
  }
}

// CAMERA //////////////

// Orbit
const SAVE_CAMERA_ORBIT = 'SAVE_CAMERA_ORBIT';
export function dispatchSaveCameraOrbit() {
  if (!reduxStore.getState().currentCamera)
    return;
  const currentOrbit = reduxStore.getState().currentCamera.orbit;
  if (!currentOrbit)
    return;
  const currentFieldOfViewDeg =
      reduxStore.getState().currentCamera.fieldOfViewDeg;
  reduxStore.dispatch({
    type: SAVE_CAMERA_ORBIT,
    payload: {orbit: currentOrbit, fieldOfViewDeg: currentFieldOfViewDeg}
  });
}

/** Event dispatcher for changes to camera-target. */
const SET_CAMERA_TARGET = 'SET_CAMERA_TARGET';
export function dispatchCameraTarget(target?: Vector3D) {
  reduxStore.dispatch({type: SET_CAMERA_TARGET, payload: target})
}

/** Dispatch initial orbit in camera state */
const SET_CAMERA_STATE_INITIAL_ORBIT = 'SET_CAMERA_STATE_INITIAL_ORBIT';
export function dispatchInitialOrbit(orbit?: SphericalPositionDeg) {
  if (!orbit)
    return;
  reduxStore.dispatch({type: SET_CAMERA_STATE_INITIAL_ORBIT, payload: orbit})
}

const SET_CAMERA = 'SET_CAMERA';
export function dispatchSetCamera(camera: Camera) {
  reduxStore.dispatch({type: SET_CAMERA, payload: camera})
}

export function cameraReducer(state: Camera, action: Action): Camera {
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
    default:
      return state;
  }
}