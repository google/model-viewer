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

import {GltfModel, TextureHandle} from '@google/model-viewer-editing-adapter/lib/main.js'

import {reduxStore} from '../../space_opera_base.js';
import {applyMaterials, createMaterials, Texture} from '../materials_panel/material_state.js';
import {dispatchSetEdits} from '../materials_panel/reducer.js';

import {dispatchGltfJsonString, dispatchSetAnimationNames, dispatchSetGltf, dispatchSetOrigEdits} from './reducer.js';
import {GltfEdits, INITIAL_GLTF_EDITS} from './types.js';

/**
 * Applies the given edits to the gltf (it is mutated), but only if they differ
 * from the given oldEdits. So for any given property, if the value is the same
 * between edits and oldEdits, the corresponding GltfModel mutate calls will be
 * skipped.
 *
 * If oldEdits is not given, all mutate calls will be made to conservatively
 * ensure that 'edits' is fully applied.
 */
export async function applyEdits(
    model: GltfModel, edits: GltfEdits, oldEdits?: GltfEdits) {
  oldEdits = oldEdits ?? await getGltfEdits(model);
  if (edits === oldEdits)
    return;

  await applyMaterials(
      model, edits.materials, oldEdits.materials, edits.texturesById);
}

let lastTextureId: number = 0;
/**
 * Generate an ID that is unique within document lifetime. These are not
 * *globally* unique, so they should not be persisted to disk, etc.
 */
export function generateTextureId(): string {
  lastTextureId++;
  return String(lastTextureId);
}

/**
 * Returns a new GltfEdits object that would be a no-op if applied to the given
 * gltf. Meaning, getEditedGltf( gltf, getGltfEdits(gltf) ) ==== gltf
 */
export function getGltfEdits(model: GltfModel): GltfEdits {
  const texturesById = new Map<string, Texture>();
  const texturesByHandle = new Map<TextureHandle, Texture>();
  const textures = model.textures;
  for (const handle of textures) {
    const id = generateTextureId();
    const texture = {uri: handle.uri, id};
    texturesById.set(id, texture);
    texturesByHandle.set(handle, texture);
  }

  return {
    texturesById,
    materials: createMaterials(model, texturesByHandle),
  };
}

class DispatchGltfArgs {
  constructor(
      readonly gltf: GltfModel|undefined, readonly edits: GltfEdits,
      readonly animationNames: string[], readonly jsonString: string) {
  }
}

function dispatchGltf(args?: DispatchGltfArgs) {
  if (!args) {
    throw new Error(`No args given!`);
  }
  const gltf = args.gltf;
  if (gltf !== undefined && reduxStore.getState().gltfInfo.gltf === gltf) {
    throw new Error(`Same gltf was given! Only call this upon actual change`);
  }
  reduxStore.dispatch(dispatchSetGltf(gltf));

  const edits = args.edits;
  if (!edits) {
    throw new Error(`Must give valid edits!`);
  }
  if (reduxStore.getState().edits === edits) {
    throw new Error(`Same edits was given! Only call this upon actual change`);
  }
  reduxStore.dispatch(dispatchSetEdits(edits));
  reduxStore.dispatch(dispatchSetOrigEdits(edits));
  reduxStore.dispatch(dispatchSetAnimationNames(args.animationNames));
  reduxStore.dispatch(dispatchGltfJsonString(args.jsonString));
}

/**
 * Helper async function
 */
export function dispatchGltfAndEdits(gltf: GltfModel|undefined) {
  // NOTE: This encodes a design decision: Whether or not we reset edits
  // upon loading a new GLTF. It may be sensible to not reset edits and just
  // apply previous edits to the same, but updated, GLTF. That could be
  // later exposed as an option, and in that case we would simply apply the
  // existing edits (with null previousEdits) to this new model and not
  // dispatch new edits.
  const edits = gltf ? getGltfEdits(gltf) : {...INITIAL_GLTF_EDITS};
  dispatchGltf(new DispatchGltfArgs(
      gltf, edits, (gltf?.animationNames) ?? [], (gltf?.jsonString) ?? ''));
}