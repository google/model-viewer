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

import {RGB, RGBA} from '@google/model-viewer-editing-adapter/lib/main.js'

import {generateTextureId} from './gltf_edits.js';
import {Material} from './material_state.js';
import {immutableArrayUpdate, immutableMapUpdate} from './reducer_utils.js';
import {registerStateMutator, State} from './space_opera_base.js';

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
    state: State, args: SetTextureArgs|undefined,
    updateMaterial: (material: Material) => Material) {
  if (!args) return;
  const materials = state.edits.materials;
  if (args.id >= materials.length || args.id < 0) {
    throw new Error('Given ID was out of bounds');
  }
  if (args.textureId !== undefined &&
      !state.edits.texturesById.has(args.textureId)) {
    throw new Error(
        `Tried to use a texture ID that does not exist: ${args.textureId}`);
  }

  const newMaterial = updateMaterial(materials[args.id]);
  if (newMaterial === materials[args.id]) {
    throw new Error('updateMaterial returns same object');
  }

  state.edits = {
    ...state.edits,
    materials: immutableArrayUpdate(materials, args.id, newMaterial)
  };
}

/**
 * Creates a texture by uri, then sets the texture on given material.
 * Note: updateMaterial must NOT mutate the arg, but rather returns a new object
 */
function addMaterialTexture(
    state: State, args: AddTextureArgs|undefined,
    updateMaterial: (material: Material, textureId: string) => Material) {
  if (!args) return;
  const materials = state.edits.materials;
  if (args.id >= materials.length || args.id < 0) {
    throw new Error('Given ID is out of bounds');
  }

  const textureId = generateTextureId();
  const texture = {id: textureId, uri: args.uri};

  const newMaterial = updateMaterial(materials[args.id], textureId);
  if (newMaterial === materials[args.id]) {
    throw new Error('updateMaterial returns same object');
  }

  state.edits = {
    ...state.edits,
    texturesById:
        immutableMapUpdate(state.edits.texturesById, textureId, texture),
    materials: immutableArrayUpdate(materials, args.id, newMaterial)
  };
}

/**
 * Dispatch an edit to a material's base color factor.
 */
export const dispatchMaterialBaseColor = registerStateMutator(
    'SET_MATERIAL_BASE_COLOR_FACTOR',
    (state: State, args?: MaterialBaseColorArgs) => {
      if (!args) return;
      const index = args.index;
      const baseColorFactor = args.baseColorFactor;
      const materials = state.edits.materials;
      if (index >= materials.length || index < 0) {
        throw new Error('Given ID is out of bounds');
      }

      state.edits = {
        ...state.edits,
        materials: immutableArrayUpdate(
            materials, index, {...materials[index], baseColorFactor})
      };
    });

/**
 * Dispatch an edit to a material's roughness factor.
 */
export const dispatchRoughnessFactor = registerStateMutator(
    'SET_MATERIAL_ROUGHNESS', (state: State, args?: RoughnessFactorArgs) => {
      if (!args) return;
      const id = args.id;
      const roughnessFactor = args.roughnessFactor;
      const materials = state.edits.materials;
      if (id >= materials.length || id < 0) {
        throw new Error('Given ID was out of bounds');
      }

      state.edits = {
        ...state.edits,
        materials: immutableArrayUpdate(
            materials, id, {...materials[id], roughnessFactor})
      };
    });

/** Dispatch an edit to a material's metallic factor. */
export const dispatchMetallicFactor = registerStateMutator(
    'SET_MATERIAL_METALLIC', (state: State, args?: MetallicFactorArgs) => {
      if (!args) return;
      const id = args.id;
      const metallicFactor = args.metallicFactor;
      const materials = state.edits.materials;
      if (id >= materials.length || id < 0) {
        throw new Error('Given ID was out of bounds');
      }

      state.edits = {
        ...state.edits,
        materials: immutableArrayUpdate(
            materials, id, {...materials[id], metallicFactor})
      };
    });

/** Dispatch an edit to a material's base color texture */
export const dispatchBaseColorTexture = registerStateMutator(
    'SET_BASE_COLOR_TEXTURE', (state: State, args?: SetTextureArgs) => {
      if (!args) return;
      setMaterialTexture(state, args, (material: Material) => {
        return {
          ...material,
          baseColorTextureId: args.textureId,
        };
      });
    });

/** Dispatch to create a new texture and assign it to the given material */
export const dispatchAddBaseColorTexture = registerStateMutator(
    'ADD_BASE_COLOR_TEXTURE', (state: State, args?: AddTextureArgs) => {
      addMaterialTexture(
          state, args, (material: Material, textureId: string) => {
            return {...material, baseColorTextureId: textureId};
          });
    });

/** Dispatch an edit to a material's Metallic-Roughness texture. */
export const dispatchMetallicRoughnessTexture = registerStateMutator(
    'SET_METALLIC_ROUGHNESS_TEXTURE', (state: State, args?: SetTextureArgs) => {
      if (!args) return;
      setMaterialTexture(state, args, (material: Material) => {
        return {...material, metallicRoughnessTextureId: args.textureId};
      });
    });

/** Dispatch to create a new texture and assign it to the given material. */
export const dispatchAddMetallicRoughnessTexture = registerStateMutator(
    'ADD_METALLIC_ROUGHNESS_TEXTURE', (state: State, args?: AddTextureArgs) => {
      addMaterialTexture(
          state, args, (material: Material, textureId: string) => {
            return {...material, metallicRoughnessTextureId: textureId};
          });
    });

/** Dispatch an edit to a material's normal texture. */
export const dispatchNormalTexture = registerStateMutator(
    'SET_NORMAL_TEXTURE', (state: State, args?: SetTextureArgs) => {
      if (!args) return;
      setMaterialTexture(state, args, (material: Material) => {
        return {...material, normalTextureId: args.textureId};
      });
    });

/** Dispatch to create a new texture and assign it to the given material. */
export const dispatchAddNormalTexture = registerStateMutator(
    'ADD_NORMAL_TEXTURE', (state: State, args?: AddTextureArgs) => {
      addMaterialTexture(
          state, args, (material: Material, textureId: string) => {
            return {...material, normalTextureId: textureId};
          });
    });

/** Dispatch an edit to a material's normal texture. */
export const dispatchEmissiveTexture = registerStateMutator(
    'SET_EMISSIVE_TEXTURE', (state: State, args?: SetTextureArgs) => {
      if (!args) return;
      setMaterialTexture(state, args, (material: Material) => {
        return {...material, emissiveTextureId: args.textureId};
      });
    });

/** Dispatch to create a new texture and assign it to the given material. */
export const dispatchAddEmissiveTexture = registerStateMutator(
    'ADD_EMISSIVE_TEXTURE', (state: State, args?: AddTextureArgs) => {
      addMaterialTexture(
          state, args, (material: Material, textureId: string) => {
            return {...material, emissiveTextureId: textureId};
          });
    });

/** Dispatch an edit to a material's occlusion texture. */
export const dispatchOcclusionTexture = registerStateMutator(
    'SET_OCCLUSION_TEXTURE', (state: State, args?: SetTextureArgs) => {
      if (!args) return;
      setMaterialTexture(state, args, (material: Material) => {
        return {...material, occlusionTextureId: args.textureId};
      });
    });

/** Dispatch to create a new texture and assign it to the given material. */
export const dispatchAddOcclusionTexture = registerStateMutator(
    'ADD_OCCLUSION_TEXTURE', (state: State, args?: AddTextureArgs) => {
      addMaterialTexture(
          state, args, (material: Material, textureId: string) => {
            return {...material, occlusionTextureId: textureId};
          });
    });

/** Argument container for dispatchEmissiveFactor. */
export interface EmissiveFactorArgs {
  readonly id: number;
  readonly emissiveFactor?: RGB;
}

/** Dispatch an edit to a material's emissiveFactor. */
export const dispatchSetEmissiveFactor = registerStateMutator(
    'SET_EMISSIVE_FACTOR', (state: State, args?: EmissiveFactorArgs) => {
      if (!args) return;
      const id = args.id;
      const emissiveFactor = args.emissiveFactor;
      const materials = state.edits.materials;
      if (id >= materials.length || id < 0) {
        throw new Error('Given ID is out of bounds');
      }

      state.edits = {
        ...state.edits,
        materials: immutableArrayUpdate(
            materials, id, {...materials[id], emissiveFactor})
      };
    });

/** Argument container for dispatchDoubleSided. */
export interface DoubleSidedArgs {
  readonly id: number;
  readonly doubleSided?: boolean;
}

/** Dispatch an edit to a material's doublesidedness. */
export const dispatchDoubleSided = registerStateMutator(
    'SET_DOUBLESIDED', (state: State, args?: DoubleSidedArgs) => {
      if (!args) return;
      const id = args.id;
      const doubleSided = args.doubleSided;
      const materials = state.edits.materials;
      if (id >= materials.length || id < 0) {
        throw new Error('Given ID was out of bounds');
      }

      state.edits = {
        ...state.edits,
        materials:
            immutableArrayUpdate(materials, id, {...materials[id], doubleSided})
      };
    });

/** Argument container for dispatch alpha mode. */
export interface AlphaModeArgs {
  id: number;
  alphaMode?: string;
}

/** Dispatch an edit to a material's alpha mode. */
export const dispatchSetAlphaMode = registerStateMutator(
    'SET_ALPHA_MODE', (state: State, args?: AlphaModeArgs) => {
      if (!args) return;
      const id = args.id;
      const alphaMode = args.alphaMode;
      const materials = state.edits.materials;
      if (id >= materials.length || id < 0) {
        throw new Error('Given ID was out of bounds');
      }

      state.edits = {
        ...state.edits,
        materials:
            immutableArrayUpdate(materials, id, {...materials[id], alphaMode})
      };
    });

/** Argument container for dispatch alpha cutoff. */
export interface AlphaCutoffArgs {
  id: number;
  alphaCutoff?: number;
}

/** Dispatch an edit to a material's alpha cutoff. */
export const dispatchSetAlphaCutoff = registerStateMutator(
    'SET_ALPHA_CUTOFF', (state: State, args?: AlphaCutoffArgs) => {
      if (!args) return;
      const id = args.id;
      const alphaCutoff = args.alphaCutoff;
      const materials = state.edits.materials;
      if (id >= materials.length || id < 0) {
        throw new Error('Given ID was out of bounds');
      }
      state.edits = {
        ...state.edits,
        materials:
            immutableArrayUpdate(materials, id, {...materials[id], alphaCutoff})
      };
    });
