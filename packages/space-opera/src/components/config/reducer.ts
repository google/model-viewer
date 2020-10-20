import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'

import {Action, reduxStore} from '../../space_opera_base.js';

const SET_CAMERA_CONTROLS_ENABLED = 'SET_CAMERA_CONTROLS_ENABLED';
export function dispatchCameraControlsEnabled(enabled?: boolean) {
  reduxStore.dispatch({type: SET_CAMERA_CONTROLS_ENABLED, payload: !!enabled})
}

/** Dispatch changes to auto rotate */
const SET_AUTO_ROTATE = 'SET_AUTO_ROTATE';
export function dispatchAutoRotate(autoRotate?: boolean) {
  reduxStore.dispatch({type: SET_CAMERA_CONTROLS_ENABLED, payload: autoRotate})
}

/** Set auto play enabled or not */
const SET_AUTOPLAY_ENABLED = 'SET_AUTOPLAY_ENABLED';
export function dispatchAutoplayEnabled(enabled?: boolean) {
  reduxStore.dispatch({type: SET_AUTOPLAY_ENABLED, payload: !!enabled})
}

/** Set animation name */
const SET_ANIMATION_NAME = 'SET_ANIMATION_NAME';
export function dispatchAnimationName(animationName?: string) {
  if (!(animationName &&
        reduxStore.getState().animationNames.indexOf(animationName) === -1)) {
    reduxStore.dispatch({type: SET_AUTOPLAY_ENABLED, payload: animationName});
  }
}

/** Dispatch an edit to model viewer environmentImage attribute. */
const UPDATE_IBL = 'UPDATE_IBL';
export function dispatchEnvrionmentImage(ibl?: string) {
  reduxStore.dispatch({type: UPDATE_IBL, payload: ibl})
}

/** Dispatch an edit to model viewer exposure attribute. */
const UPDATE_EXPOSURE = 'UPDATE_EXPOSURE';
export function dispatchExposure(exposure?: number) {
  reduxStore.dispatch({type: UPDATE_EXPOSURE, payload: exposure})
}

/** Dispatch an edit to model viewer exposure attribute. */
const SET_USE_ENV_AS_SKYBOX = 'SET_USE_ENV_AS_SKYBOX';
export function dispatchUseEnvAsSkybox(useEnvAsSkybox?: boolean) {
  reduxStore.dispatch({type: SET_USE_ENV_AS_SKYBOX, payload: useEnvAsSkybox})
}

/** Dispatch an edit to model viewer shadow intensity. */
const UPDATE_SHADOW_INTENSITY = 'UPDATE_SHADOW_INTENSITY';
export function dispatchShadowIntensity(shadowIntensity?: number) {
  reduxStore.dispatch({type: UPDATE_SHADOW_INTENSITY, payload: shadowIntensity})
}


/** Dispatch an edit to model viewer shadow softness. */
const UPDATE_SHADOW_SOFTNESS = 'UPDATE_SHADOW_SOFTNESS';
export function dispatchShadowSoftness(shadowSoftness?: number) {
  reduxStore.dispatch({type: UPDATE_SHADOW_SOFTNESS, payload: shadowSoftness})
}

/** Dispatch a state mutator to set model-viewer poster. */
const SET_POSTER = 'SET_POSTER';
export function dispatchSetPoster(poster?: string) {
  reduxStore.dispatch({type: SET_POSTER, payload: poster})
}

/** Dispatch a state mutator to set setPosterTrigger. */
// CURRENTLY UNUSED
const SET_REVEAL = 'SET_REVEAL';
export function dispatchSetReveal(reveal?: string) {
  reduxStore.dispatch({type: SET_REVEAL, payload: reveal})
}

const SET_CONFIG = 'SET_CONFIG'
export function dispatchSetConfig(config: ModelViewerConfig) {
  reduxStore.dispatch({type: SET_CONFIG, payload: config})
}

export function configReducer(state: ModelViewerConfig = {}, action: Action):
    ModelViewerConfig {
      switch (action.type) {
        case SET_CONFIG: {
          return action.payload;
        }
        case SET_REVEAL:
          return {...state, reveal: action.payload};
        case SET_POSTER:
          return {
            ...state, poster: action.payload
          }
        case UPDATE_SHADOW_SOFTNESS:
          return {
            ...state, shadowSoftness: action.payload
          }
        case UPDATE_SHADOW_INTENSITY:
          return {
            ...state, shadowIntensity: action.payload
          }
        case SET_USE_ENV_AS_SKYBOX:
          return {
            ...state, useEnvAsSkybox: action.payload
          }
        case UPDATE_EXPOSURE:
          return {
            ...state, exposure: action.payload
          }
        case UPDATE_IBL:
          return {
            ...state, environmentImage: action.payload
          }
        case SET_AUTOPLAY_ENABLED:
          return {
            ...state, autoplay: action.payload
          }
        case SET_ANIMATION_NAME:
          return {...state, animationName: action.payload};
        case SET_CAMERA_CONTROLS_ENABLED:
          return {
            ...state, cameraControls: action.payload
          }
        case SET_AUTO_ROTATE:
          return {
            ...state, autoRotate: action.payload
          }
        default:
          return state;
      }
    }