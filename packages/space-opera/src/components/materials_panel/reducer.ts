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

import {RGB, RGBA} from '@google/model-viewer/lib/model-viewer';

import {Action, State} from '../../types.js';
import {TexturesById} from '../materials_panel/material_state.js';
import {generateTextureId} from '../model_viewer_preview/gltf_edits.js';
import {GltfEdits, INITIAL_GLTF_EDITS} from '../model_viewer_preview/types.js';
import {immutableArrayUpdate, immutableMapUpdate} from '../utils/reducer_utils.js';

import {Material} from './material_state.js';

/** Argument container for dispatchMaterialBaseColor. */
export interface MaterialBaseColorArgs {
  readonly index: number;
  readonly baseColorFactor: RGBA;
}

/** Argument container for dispatchRoughnessFactor. */
export interface RoughnessFactorArgs {
  readonly id: number;
  readonly roughnessFactor: number;
}

/** Argument container for dispatchMetallicFactor. */
export interface MetallicFactorArgs {
  readonly id: number;
  readonly metallicFactor: number;
}

/** Argument container for dispatchTexture. */
export interface SetTextureArgs {
  readonly id: number;          // The material id.
  readonly textureId?: string;  // Undefined to clear the texture
}

/** Argument container for dispatchAddTexture. */
export interface AddTextureArgs {
  readonly id: number;  // The material id.
  readonly uri: string;
}

/**
 * Validates and sets the material texture.
 * Note: updateMaterial must NOT mutate the arg, but rather returns a new object
 */
function setMaterialTexture(
    name: string,
    args: SetTextureArgs,
    materials: Material[],
    updateMaterial: (material: Material) => Material) {
  if (args.id >= materials.length || args.id < 0) {
    throw new Error('Given ID was out of bounds');
  }
  // TODO: Add back in, but move reduxStore out of file, so pull textureIds from
  // actions...

  // if (args.textureId !== undefined &&
  //     !reduxStore.getState().edits.texturesById.has(args.textureId)) {
  //   throw new Error(
  //       `Tried to use a texture ID that does not exist: ${args.textureId}`);
  // }

  const newMaterial = updateMaterial(materials[args.id]);
  if (newMaterial === materials[args.id]) {
    throw new Error('updateMaterial returns same object');
  }

  return {
    type: name,
    payload: immutableArrayUpdate(materials, args.id, newMaterial)
  };
}

/**
 * Creates a texture by uri, then sets the texture on given material.
 * Note: updateMaterial must NOT mutate the arg, but rather returns a new object
 */
function addMaterialTexture(
    name: string,
    args: AddTextureArgs,
    materials: Material[],
    texturesById: TexturesById,
    updateMaterial: (material: Material, textureId: string) => Material) {
  if (args.id >= materials.length || args.id < 0) {
    throw new Error('Given ID is out of bounds');
  }
  const textureId = generateTextureId();
  const texture = {id: textureId, uri: args.uri};
  const newMaterial = updateMaterial(materials[args.id], textureId);
  if (newMaterial === materials[args.id]) {
    throw new Error('updateMaterial returns same object');
  }
  return {
    type: name,
    payload: {
      texturesById: immutableMapUpdate(texturesById, textureId, texture),
      materials: immutableArrayUpdate(materials, args.id, newMaterial)
    }
  };
}

/**
 * Dispatch an edit to a material's base color factor.
 */
const SET_MATERIAL_BASE_COLOR_FACTOR = 'SET_MATERIAL_BASE_COLOR_FACTOR';
export function dispatchMaterialBaseColor(
    materials: Material[], args: MaterialBaseColorArgs) {
  const index = args.index;
  const baseColorFactor = args.baseColorFactor;
  if (index >= materials.length || index < 0) {
    throw new Error('Given ID is out of bounds');
  }
  return {
    type: SET_MATERIAL_BASE_COLOR_FACTOR,
    payload: immutableArrayUpdate(
        materials, index, {...materials[index], baseColorFactor})
  };
}

/**
 * Dispatch an edit to a material's roughness factor.
 */
const SET_MATERIAL_ROUGHNESS = 'SET_MATERIAL_ROUGHNESS';
export function dispatchRoughnessFactor(
    materials: Material[], args: RoughnessFactorArgs) {
  const id = args.id;
  const roughnessFactor = args.roughnessFactor;
  if (id >= materials.length || id < 0) {
    throw new Error('Given ID was out of bounds');
  }
  return {
    type: SET_MATERIAL_ROUGHNESS,
    payload:
        immutableArrayUpdate(materials, id, {...materials[id], roughnessFactor})
  };
}

/** Dispatch an edit to a material's metallic factor. */
const SET_MATERIAL_METALLIC = 'SET_MATERIAL_METALLIC';
export function dispatchMetallicFactor(
    materials: Material[], args: MetallicFactorArgs) {
  const id = args.id;
  const metallicFactor = args.metallicFactor;
  if (id >= materials.length || id < 0) {
    throw new Error('Given ID was out of bounds');
  }
  return {
    type: SET_MATERIAL_METALLIC,
    payload:
        immutableArrayUpdate(materials, id, {...materials[id], metallicFactor})
  };
}

/** Dispatch an edit to a material's base color texture */
const SET_BASE_COLOR_TEXTURE = 'SET_BASE_COLOR_TEXTURE';
export function dispatchBaseColorTexture(
    materials: Material[], args: SetTextureArgs) {
  return setMaterialTexture(
      SET_BASE_COLOR_TEXTURE, args, materials, (material: Material) => {
        return {
          ...material,
          baseColorTextureId: args.textureId,
        };
      });
}

/** Dispatch to create a new texture and assign it to the given material */
const ADD_BASE_COLOR_TEXTURE = 'ADD_BASE_COLOR_TEXTURE';
export function dispatchAddBaseColorTexture(
    materials: Material[], texturesById: TexturesById, args: AddTextureArgs) {
  return addMaterialTexture(
      ADD_BASE_COLOR_TEXTURE,
      args,
      materials,
      texturesById,
      (material: Material, textureId: string) => {
        return {...material, baseColorTextureId: textureId};
      });
}

/** Dispatch an edit to a material's Metallic-Roughness texture. */
const SET_METALLIC_ROUGHNESS_TEXTURE = 'SET_METALLIC_ROUGHNESS_TEXTURE';
export function dispatchMetallicRoughnessTexture(
    materials: Material[], args: SetTextureArgs) {
  return setMaterialTexture(
      SET_METALLIC_ROUGHNESS_TEXTURE, args, materials, (material: Material) => {
        return {...material, metallicRoughnessTextureId: args.textureId};
      });
}

/** Dispatch to create a new texture and assign it to the given material. */
const ADD_METALLIC_ROUGHNESS_TEXTURE = 'ADD_METALLIC_ROUGHNESS_TEXTURE';
export function dispatchAddMetallicRoughnessTexture(
    materials: Material[], texturesById: TexturesById, args: AddTextureArgs) {
  return addMaterialTexture(
      ADD_METALLIC_ROUGHNESS_TEXTURE,
      args,
      materials,
      texturesById,
      (material: Material, textureId: string) => {
        return {...material, metallicRoughnessTextureId: textureId};
      });
}

/** Dispatch an edit to a material's normal texture. */
const SET_NORMAL_TEXTURE = 'SET_NORMAL_TEXTURE';
export function dispatchNormalTexture(
    materials: Material[], args: SetTextureArgs) {
  return setMaterialTexture(
      SET_NORMAL_TEXTURE, args, materials, (material: Material) => {
        return {...material, normalTextureId: args.textureId};
      });
}

/** Dispatch to create a new texture and assign it to the given material. */
const ADD_NORMAL_TEXTURE = 'ADD_NORMAL_TEXTURE';
export function dispatchAddNormalTexture(
    materials: Material[], texturesById: TexturesById, args: AddTextureArgs) {
  return addMaterialTexture(
      ADD_NORMAL_TEXTURE,
      args,
      materials,
      texturesById,
      (material: Material, textureId: string) => {
        return {...material, normalTextureId: textureId};
      });
}

/** Dispatch an edit to a material's normal texture. */
const SET_EMISSIVE_TEXTURE = 'SET_EMISSIVE_TEXTURE';
export function dispatchEmissiveTexture(
    materials: Material[], args: SetTextureArgs) {
  return setMaterialTexture(
      SET_EMISSIVE_TEXTURE, args, materials, (material: Material) => {
        return {...material, emissiveTextureId: args.textureId};
      });
}

/** Dispatch to create a new texture and assign it to the given material. */
const ADD_EMISSIVE_TEXTURE = 'ADD_EMISSIVE_TEXTURE';
export function dispatchAddEmissiveTexture(
    materials: Material[], texturesById: TexturesById, args: AddTextureArgs) {
  return addMaterialTexture(
      ADD_EMISSIVE_TEXTURE,
      args,
      materials,
      texturesById,
      (material: Material, textureId: string) => {
        return {...material, emissiveTextureId: textureId};
      });
}

/** Dispatch an edit to a material's occlusion texture. */
const SET_OCCLUSION_TEXTURE = 'SET_OCCLUSION_TEXTURE';
export function dispatchOcclusionTexture(
    materials: Material[], args: SetTextureArgs) {
  return setMaterialTexture(
      SET_OCCLUSION_TEXTURE, args, materials, (material: Material) => {
        return {...material, occlusionTextureId: args.textureId};
      });
}

/** Dispatch to create a new texture and assign it to the given material. */
const ADD_OCCLUSION_TEXTURE = 'ADD_OCCLUSION_TEXTURE';
export function dispatchAddOcclusionTexture(
    materials: Material[], texturesById: TexturesById, args: AddTextureArgs) {
  return addMaterialTexture(
      ADD_OCCLUSION_TEXTURE,
      args,
      materials,
      texturesById,
      (material: Material, textureId: string) => {
        return {...material, occlusionTextureId: textureId};
      });
}

/** Argument container for dispatchEmissiveFactor. */
export interface EmissiveFactorArgs {
  readonly id: number;
  readonly emissiveFactor?: RGB;
}

/** Dispatch an edit to a material's emissiveFactor. */
const SET_EMISSIVE_FACTOR = 'SET_EMISSIVE_FACTOR';
export function dispatchSetEmissiveFactor(
    materials: Material[], args: EmissiveFactorArgs) {
  const id = args.id;
  const emissiveFactor = args.emissiveFactor;
  if (id >= materials.length || id < 0) {
    throw new Error('Given ID is out of bounds');
  }
  return {
    type: SET_EMISSIVE_FACTOR,
    payload:
        immutableArrayUpdate(materials, id, {...materials[id], emissiveFactor})
  };
}

/** Argument container for dispatchDoubleSided. */
export interface DoubleSidedArgs {
  readonly id: number;
  readonly doubleSided?: boolean;
}

/** Dispatch an edit to a material's doublesidedness. */
const SET_DOUBLESIDED = 'SET_DOUBLESIDED';
export function dispatchDoubleSided(
    materials: Material[], args: DoubleSidedArgs) {
  const id = args.id;
  const doubleSided = args.doubleSided;
  if (id >= materials.length || id < 0) {
    throw new Error('Given ID was out of bounds');
  }

  return {
    type: SET_DOUBLESIDED,
    payload:
        immutableArrayUpdate(materials, id, {...materials[id], doubleSided})
  };
}

/** Argument container for dispatch alpha mode. */
export interface AlphaModeArgs {
  id: number;
  alphaMode?: string;
}

/** Dispatch an edit to a material's alpha mode. */
const SET_ALPHA_MODE = 'SET_ALPHA_MODE';
export function dispatchSetAlphaMode(
    materials: Material[], args: AlphaModeArgs) {
  const id = args.id;
  const alphaMode = args.alphaMode;
  if (id >= materials.length || id < 0) {
    throw new Error('Given ID was out of bounds');
  }
  return {
    type: SET_ALPHA_MODE,
    payload: immutableArrayUpdate(materials, id, {...materials[id], alphaMode})
  };
}

/** Argument container for dispatch alpha cutoff. */
export interface AlphaCutoffArgs {
  id: number;
  alphaCutoff?: number;
}

/** Dispatch an edit to a material's alpha cutoff. */
const SET_ALPHA_CUTOFF = 'SET_ALPHA_CUTOFF';
export function dispatchSetAlphaCutoff(
    materials: Material[], args: AlphaCutoffArgs) {
  const id = args.id;
  const alphaCutoff = args.alphaCutoff;
  if (id >= materials.length || id < 0) {
    throw new Error('Given ID was out of bounds');
  }
  return {
    type: SET_ALPHA_CUTOFF,
    payload:
        immutableArrayUpdate(materials, id, {...materials[id], alphaCutoff})
  };
}

const SET_EDITS = 'SET_EDITS';
export function dispatchSetEdits(edits: GltfEdits) {
  return {type: SET_EDITS, payload: edits};
}

export const getEdits = (state: State) => state.entities.gltfEdits.edits;
export const getEditsMaterials = (state: State) =>
    state.entities.gltfEdits.edits.materials;
export const getEditsTextures = (state: State) =>
    state.entities.gltfEdits.edits.texturesById;

export function editsReducer(
    state: GltfEdits = INITIAL_GLTF_EDITS, action: Action): GltfEdits {
  switch (action.type) {
    case SET_ALPHA_CUTOFF:
      return {...state, materials: action.payload};
    case SET_ALPHA_MODE:
      return {...state, materials: action.payload};
    case SET_DOUBLESIDED:
      return {...state, materials: action.payload};
    case SET_EMISSIVE_FACTOR:
      return {...state, materials: action.payload};
    case ADD_OCCLUSION_TEXTURE:
      return {
        ...state,
        texturesById: action.payload.texturesById,
        materials: action.payload.materials
      };
    case SET_OCCLUSION_TEXTURE:
      return {...state, materials: action.payload};
    case ADD_EMISSIVE_TEXTURE:
      return {
        ...state,
        texturesById: action.payload.texturesById,
        materials: action.payload.materials
      };
    case SET_EMISSIVE_TEXTURE:
      return {...state, materials: action.payload};
    case ADD_NORMAL_TEXTURE:
      return {
        ...state,
        texturesById: action.payload.texturesById,
        materials: action.payload.materials
      };
    case SET_NORMAL_TEXTURE:
      return {...state, materials: action.payload};
    case ADD_METALLIC_ROUGHNESS_TEXTURE:
      return {
        ...state,
        texturesById: action.payload.texturesById,
        materials: action.payload.materials
      };
    case SET_METALLIC_ROUGHNESS_TEXTURE:
      return {...state, materials: action.payload};
    case ADD_BASE_COLOR_TEXTURE:
      return {
        ...state,
        texturesById: action.payload.texturesById,
        materials: action.payload.materials
      };
    case SET_BASE_COLOR_TEXTURE:
      return {...state, materials: action.payload};
    case SET_MATERIAL_METALLIC:
      return {...state, materials: action.payload};
    case SET_MATERIAL_ROUGHNESS:
      return {...state, materials: action.payload};
    case SET_MATERIAL_BASE_COLOR_FACTOR:
      return {...state, materials: action.payload};
    case SET_EDITS:
      return action.payload;
    default:
      return state;
  }
}

// Orig Edits //////////////

const SET_ORIG_EDITS = 'SET_ORIG_EDITS';
export function dispatchSetOrigEdits(origEdits: GltfEdits) {
  return {type: SET_ORIG_EDITS, payload: origEdits};
}

export const getOrigEdits = (state: State) =>
    state.entities.gltfEdits.origEdits;

export function origEditsReducer(
    state: GltfEdits = INITIAL_GLTF_EDITS, action: Action): GltfEdits {
  switch (action.type) {
    case SET_ORIG_EDITS:
      return action.payload;
    default:
      return state;
  }
}