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

import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {radToDeg} from '@google/model-viewer-editing-adapter/lib/util/math.js'
import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';

import {Action, BestPracticesState, State} from '../../types.js';
import {renderARButton, renderProgressBar} from '../best_practices/render_best_practices.js';
import {Camera} from '../camera_settings/camera_state.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {GltfState} from '../model_viewer_preview/types.js';
import {renderHotspots} from '../utils/hotspot/render_hotspots.js';

export function getModelViewer() {
  return document.querySelector('model-viewer-preview')?.modelViewer;
}

export function renderCommonChildElements(
    hotspots: HotspotConfig[], bestPractices: BestPracticesState) {
  const childElements: any[] = [
    ...renderHotspots(hotspots),
  ];
  if (bestPractices?.progressBar) {
    childElements.push(renderProgressBar());
  }
  if (bestPractices?.arButton) {
    childElements.push(renderARButton());
  }
  return childElements;
}

export function getCameraState(viewer: ModelViewerElement) {
  const orbitRad = viewer.getCameraOrbit();
  return {
    orbit: {
      thetaDeg: radToDeg(orbitRad.theta),
      phiDeg: radToDeg(orbitRad.phi),
      radius: orbitRad.radius
    },
    target: viewer.getCameraTarget(),
    fieldOfViewDeg: viewer.getFieldOfView(),
  } as Camera;
}

export async function downloadContents(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch url ${url}`);
  }
  const blob = await response.blob();
  if (!blob) {
    throw new Error(`Could not extract binary blob from response of ${url}`);
  }

  return blob.arrayBuffer();
}

/** The user has requested a new GLTF/GLB for editing. */
const SET_GLTF = 'SET_GLTF'
export function dispatchSetGltf(gltf: GltfModel|undefined) {
  return {type: SET_GLTF, payload: gltf};
}

const SET_GLTF_URL = 'SET_GLTF_URL'
export function dispatchGltfUrl(gltfUrl?: string|undefined) {
  return {type: SET_GLTF_URL, payload: gltfUrl};
}

const SET_GLTF_JSON_STRING = 'SET_GLTF_JSON_STRING'
export function dispatchGltfJsonString(gltfJsonString?: string) {
  return {type: SET_GLTF_JSON_STRING, payload: gltfJsonString};
}

export const getGltfUrl = (state: State) => state.entities.gltf.gltfUrl;
export const getGltfJsonString = (state: State) =>
    state.entities.gltf.gltfJsonString;
export const getGltfModel = (state: State) => state.entities.gltf.gltf;

export function gltfReducer(
    state: GltfState = {
      gltfJsonString: ''
    },
    action: Action): GltfState {
  switch (action.type) {
    case SET_GLTF:
      return {
        ...state, gltf: action.payload
      }
    case SET_GLTF_URL:
      return {
        ...state, gltfUrl: action.payload
      }
    case SET_GLTF_JSON_STRING:
      return {
        ...state, gltfJsonString: action.payload
      }
    default:
      return state;
  }
}
