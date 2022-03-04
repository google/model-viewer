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

import {TextureInfo} from '@google/model-viewer/lib/features/scene-graph/texture-info.js';
import {Image} from '@google/model-viewer/lib/three-components/gltf-instance/gltf-2.0.js';

import {Action, BestPracticesState, INITIAL_STATE, State} from '../../types.js';
import {renderARButton, renderARPrompt, renderProgressBar} from '../best_practices/render_best_practices.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {ModelState, Thumbnail} from '../model_viewer_preview/types.js';
import {renderHotspots} from '../utils/hotspot/render_hotspots.js';



const THUMBNAIL_SIZE = 256;

export function getModelViewer() {
  return document.querySelector('model-viewer-preview')!.modelViewer;
}

export async function getUpdatedModelViewer() {
  const preview = document.querySelector('model-viewer-preview')!;
  const viewer = preview.modelViewer;
  await preview.updateComplete;
  await viewer.updateComplete;
  return viewer;
}

export function renderCommonChildElements(
    hotspots: HotspotConfig[],
    bestPractices?: BestPracticesState,
    isEditor?: boolean) {
  const childElements: any[] = [
    ...renderHotspots(hotspots),
  ];
  if (bestPractices?.progressBar) {
    childElements.push(renderProgressBar(isEditor));
  }
  if (bestPractices?.arButton && !isEditor) {
    childElements.push(renderARButton());
  }
  if (bestPractices?.arPrompt && !isEditor) {
    childElements.push(renderARPrompt());
  }
  return childElements;
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

export function getTextureId(gltfImage: Image): string {
  return gltfImage.uri ?? gltfImage.bufferView!.toString();
}

export async function pushThumbnail(
    thumbnailsById: Map<string, Thumbnail>,
    textureInfo: TextureInfo): Promise<string|null> {
  const {texture} = textureInfo;
  if (texture == null) {
    return null;
  }
  const {source} = texture;
  const id = getTextureId(source);
  if (!thumbnailsById.has(id)) {
    thumbnailsById.set(id, {
      objectUrl: await source.createThumbnail(THUMBNAIL_SIZE, THUMBNAIL_SIZE),
      texture
    });
  }
  return id;
}

async function createThumbnails(): Promise<Map<string, Thumbnail>> {
  const thumbnailsById = new Map<string, Thumbnail>();
  for (const material of getModelViewer()!.model?.materials!) {
    await material.ensureLoaded();
    const {
      pbrMetallicRoughness,
      normalTexture,
      emissiveTexture,
      occlusionTexture
    } = material;
    const {baseColorTexture, metallicRoughnessTexture} = pbrMetallicRoughness;
    await pushThumbnail(thumbnailsById, normalTexture);
    await pushThumbnail(thumbnailsById, emissiveTexture);
    await pushThumbnail(thumbnailsById, occlusionTexture);
    await pushThumbnail(thumbnailsById, baseColorTexture);
    await pushThumbnail(thumbnailsById, metallicRoughnessTexture);
  }
  return thumbnailsById;
}

const SET_GLTF_URL = 'SET_GLTF_URL';
export function dispatchGltfUrl(gltfUrl?: string|undefined) {
  return {type: SET_GLTF_URL, payload: gltfUrl};
}

const SET_ROOT_PATH = 'SET_ROOT_PATH';
export function dispatchRootPath(path: string) {
  return {type: SET_ROOT_PATH, payload: path};
}

const SET_FILE_MAP = 'SET_FILE_MAP';
export function dispatchFileMap(fileMap: Map<string, File>) {
  return {type: SET_FILE_MAP, payload: fileMap};
}

const SET_MODEL = 'SET_MODEL';
export async function dispatchModel() {
  const thumbnailsById = await createThumbnails();
  const originalGltfJson =
      JSON.stringify(getModelViewer()?.originalGltfJson, null, 2);
  // Make a deep copy of the JSON so changes are not reflected.
  const originalGltf = JSON.parse(originalGltfJson);
  return {
    type: SET_MODEL,
    payload: {thumbnailsById, originalGltf, originalGltfJson}
  };
}

const SET_MODEL_DIRTY = 'SET_MODEL_DIRTY';
export function dispatchModelDirty(isDirty: boolean = true) {
  return {type: SET_MODEL_DIRTY, payload: {isDirty}};
}

export const getGltfUrl = (state: State) => state.entities.model.gltfUrl;
export const getFileMap = (state: State) => state.entities.model.fileMap;
export const getModel = (state: State) => state.entities.model;
export const isLoaded = (state: State) => !!state.entities.model.originalGltf;

export function modelReducer(
    state: ModelState = INITIAL_STATE.entities.model,
    action: Action): ModelState {
  switch (action.type) {
    case SET_GLTF_URL:
      return {...state, gltfUrl: action.payload};
    case SET_ROOT_PATH:
      return {...state, rootPath: action.payload};
    case SET_FILE_MAP:
      return {...state, fileMap: action.payload};
    case SET_MODEL:
      return {...state, ...action.payload};
    case SET_MODEL_DIRTY:
      return {...state, ...action.payload};
    default:
      return state;
  }
}
