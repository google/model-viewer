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

import {applyMaterials, createMaterials, Material, Texture, TexturesById} from './material_state.js';

/**
 * All the state that the user can edit. It's important to capture all that in a
 * single object so components can easily subscribe to changes on a single
 * object.
 */
export interface GltfEdits {
  texturesById: TexturesById;
  materials: Material[];
}

/**
 * Use this to initialize references in components.
 */
export const INITIAL_GLTF_EDITS: GltfEdits = {
  texturesById: new Map<string, Texture>(),
  materials: [],
};

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
  if (edits === oldEdits) return;

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
export async function getGltfEdits(model: GltfModel): Promise<GltfEdits> {
  const texturesById = new Map<string, Texture>();
  const texturesByHandle = new Map<TextureHandle, Texture>();
  const textures = await model.textures;
  for (const handle of textures) {
    const id = generateTextureId();
    const texture = {uri: handle.uri, id};
    texturesById.set(id, texture);
    texturesByHandle.set(handle, texture);
  }

  return {
    texturesById,
    materials: await createMaterials(model, texturesByHandle),
  };
}
