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

import {createSafeObjectUrlFromArrayBuffer} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'

import {Action, reduxStore, registerStateMutator} from '../../space_opera_base.js';

import {EnvironmentImage} from './lighting_state.js';

/**
 * Creates a blob url from an uploaded file, should be used only for
 * environment image.
 */
export async function createBlobUrlFromEnvironmentImage(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const safeObjectUrl = createSafeObjectUrlFromArrayBuffer(arrayBuffer);
  const unsafeUrl = file.name.match(/\.(hdr)$/i) ?
      safeObjectUrl.unsafeUrl + '#.hdr' :
      safeObjectUrl.unsafeUrl;
  return unsafeUrl;
}

/** Dispatch an edit to model viewer environmentImage attribute. */
const UPDATE_IBL = 'UPDATE_IBL';
export const dispatchEnvrionmentImage =
    registerStateMutator(UPDATE_IBL, (state, ibl?: string) => {
      state.config = {...state.config, environmentImage: ibl};
    });

/** Dispatch an edit to model viewer exposure attribute. */
const UPDATE_EXPOSURE = 'UPDATE_EXPOSURE';
export const dispatchExposure =
    registerStateMutator(UPDATE_EXPOSURE, (state, exposure?: number) => {
      state.config = {...state.config, exposure};
    });

/** Dispatch an edit to model viewer exposure attribute. */
const SET_USE_ENV_AS_SKYBOX = 'SET_USE_ENV_AS_SKYBOX';
export const dispatchUseEnvAsSkybox = registerStateMutator(
    SET_USE_ENV_AS_SKYBOX, (state, useEnvAsSkybox?: boolean) => {
      state.config = {...state.config, useEnvAsSkybox};
    });

/** Dispatch an edit to model viewer shadow intensity. */
const UPDATE_SHADOW_INTENSITY = 'UPDATE_SHADOW_INTENSITY';
export const dispatchShadowIntensity = registerStateMutator(
    UPDATE_SHADOW_INTENSITY, (state, shadowIntensity?: number) => {
      state.config = {...state.config, shadowIntensity};
    });


/** Dispatch an edit to model viewer shadow softness. */
const UPDATE_SHADOW_SOFTNESS = 'UPDATE_SHADOW_SOFTNESS';
export const dispatchShadowSoftness = registerStateMutator(
    UPDATE_SHADOW_SOFTNESS, (state, shadowSoftness?: number) => {
      state.config = {...state.config, shadowSoftness};
    });

// EnvironmentImages //////////////////

interface EvironmentImageState {
  environmentImages: EnvironmentImage[];
}

/** Dispatch an edit to potential environment images to select. */
const UPLOAD_ENVIRONMENT_IMAGE = 'UPLOAD_ENVIRONMENT_IMAGE';
export function dispatchAddEnvironmentImage(image?: EnvironmentImage) {
  if (!image) {
    return;
  }
  reduxStore.dispatch({type: UPLOAD_ENVIRONMENT_IMAGE, payload: image})
}

function addEnvironmentImage(
    state: EvironmentImageState, image: EnvironmentImage) {
  const environmentImages = [...state.environmentImages, image];
  return environmentImages;
}

export function environmentImagesReducer(
    state: EvironmentImageState, action: Action) {
  switch (action.type) {
    case UPLOAD_ENVIRONMENT_IMAGE:
      return addEnvironmentImage(state, action.payload);
    default:
      return state;
  }
}