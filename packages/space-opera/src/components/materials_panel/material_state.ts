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

import {GltfModel, Material as GltfMaterial, TextureHandle} from '@google/model-viewer-editing-adapter/lib/main.js'
import {RGB, RGBA} from '@google/model-viewer/lib/model-viewer';

/**
 * A texture that can be used in materials.
 */
export interface Texture {
  // We intentionally do not store the TextureHandle here! Each handle is only
  // valid for a single GltfModel instance, but these edits need to be
  // applicable to *any* model. Not only for the update-gltf workflow, but also
  // for just updating various previews/exporters. So we generally store the
  // actual texture content.

  readonly uri: string;

  // NOTE: Eventually, 3DOM should support sampler manipulation, so we'll need
  // to store that content here too.

  // Use document-lifetime-unique IDs to avoid the book-keeping burden of
  // sequential IDs.
  readonly id: string;
}

/**
 * Convenience. Apparently, you can't just extend Map, so we do this instead.
 */
export type TexturesById = Map<string, Texture>;

/**
 * State about materials that the editor cares about. A good heuristic for what
 * goes here is, "what do you see in the material editing UI?"
 *
 * This may seem redundant given the interfaces in gltf_spec, but this let's us
 * decouple our editor from editing a GLTF JSON directly. For example, in the
 * future, the editor will operate on 3DOM instead. To achieve that, we only
 * need to create a new component that syncs this state with 3DOM calls.
 */
export interface Material {
  readonly name?: string;
  readonly baseColorTextureId?: string;
  readonly baseColorFactor: RGBA;
  readonly doubleSided?: boolean;
  readonly roughnessFactor: number;
  readonly metallicFactor: number;
  readonly metallicRoughnessTextureId?: string;
  readonly normalTextureId?: string;
  readonly emissiveTextureId?: string;
  readonly emissiveFactor: RGB;
  readonly occlusionTextureId?: string;
  readonly alphaMode?: string;
  readonly alphaCutoff?: number;
  // Add later: other textures and scales, flipNormalY, culling.
}

function createMaterial(
    domMaterial: GltfMaterial,
    texturesByHandle: Map<TextureHandle, Texture>): Material {
  const name = domMaterial.name;
  const pbr = domMaterial.pbrMetallicRoughness;
  const baseColorTexture = pbr.baseColorTexture;
  const baseColorTextureId =
      baseColorTexture ? texturesByHandle.get(baseColorTexture)?.id : undefined;
  if (!baseColorTextureId && pbr.baseColorTexture) {
    throw new Error(
        'Could not find the base color texture ID for a texture handle');
  }

  const metallicRoughnessTexture = pbr.metallicRoughnessTexture;
  const metallicRoughnessTextureId = metallicRoughnessTexture ?
      texturesByHandle.get(metallicRoughnessTexture)?.id :
      undefined;
  if (!metallicRoughnessTextureId && metallicRoughnessTexture) {
    throw new Error(
        'Could not find the roughness texture ID for a texture handle');
  }

  const normalTexture = domMaterial.normalTexture;
  const normalTextureId =
      normalTexture ? texturesByHandle.get(normalTexture)?.id : undefined;
  if (!normalTextureId && normalTexture) {
    throw new Error(
        'Could not find the normal texture ID for a texture handle');
  }

  const emissiveTexture = domMaterial.emissiveTexture;
  const emissiveTextureId =
      emissiveTexture ? texturesByHandle.get(emissiveTexture)?.id : undefined;
  if (!emissiveTextureId && emissiveTexture) {
    throw new Error(
        'Could not find the emissive texture ID for a texture handle');
  }

  const occlusionTexture = domMaterial.occlusionTexture;
  const occlusionTextureId =
      occlusionTexture ? texturesByHandle.get(occlusionTexture)?.id : undefined;
  if (!occlusionTextureId && occlusionTexture) {
    throw new Error(
        'Could not find the occlusion texture ID for a texture handle');
  }

  return {
    name,
    baseColorTextureId,
    baseColorFactor: pbr.baseColorFactor,
    doubleSided: domMaterial.doubleSided,
    roughnessFactor: pbr.roughnessFactor,
    metallicFactor: pbr.metallicFactor,
    metallicRoughnessTextureId,
    normalTextureId,
    emissiveTextureId,
    occlusionTextureId,
    emissiveFactor: domMaterial.emissiveFactor,
    alphaMode: domMaterial.alphaMode,
    alphaCutoff: domMaterial.alphaCutoff,
  };
}

/**
 * Creates material state representative of the given gltf's materials.
 */
export function createMaterials(
    model: GltfModel,
    texturesByHandle: Map<TextureHandle, Texture>): Material[] {
  const modelMaterials = model.materials;
  const editMaterials: Material[] = [];
  for (const m of modelMaterials) {
    editMaterials.push(createMaterial(m, texturesByHandle));
  }
  return editMaterials;
}

async function isTextureHandleValid(
    model: GltfModel, queryHandle: TextureHandle) {
  return (await model.textures)
      .some((handle: TextureHandle) => handle === queryHandle);
}

/**
 * Applies the given material state to the given model. 'model' will be mutated.
 */
export async function applyMaterials(
    model: GltfModel,
    materials: Material[],
    oldMaterials: Material[],
    texturesById: TexturesById) {
  if (materials === oldMaterials)
    return;
  const modelMaterials = await model.materials;

  if (materials.length !== modelMaterials.length) {
    throw new Error(
        'Material edits array length does not match model material count');
  }
  if (materials.length !== oldMaterials.length) {
    throw new Error('Material edits arrays are not of the same length');
  }
  if ([...texturesById.values()].some(tex => tex.uri === undefined)) {
    throw new Error(`Some textures don't have defined URIs`);
  }

  const textureHandleCache =
      await TextureHandleCache.create(model, texturesById);

  for (const [i, mat] of materials.entries()) {
    const oldMat = oldMaterials[i];

    if (mat === oldMat)
      continue;
    const materialApi = modelMaterials[i];
    const pbrApi = modelMaterials[i].pbrMetallicRoughness;
    if (mat.doubleSided !== oldMat.doubleSided) {
      await materialApi.setDoubleSided(mat.doubleSided);
    }
    if (mat.baseColorFactor !== oldMat.baseColorFactor) {
      await pbrApi.setBaseColorFactor(mat.baseColorFactor);
    }
    if (mat.roughnessFactor !== oldMat.roughnessFactor) {
      await pbrApi.setRoughnessFactor(mat.roughnessFactor);
    }
    if (mat.metallicFactor !== oldMat.metallicFactor) {
      await pbrApi.setMetallicFactor(mat.metallicFactor);
    }
    if (mat.baseColorTextureId !== oldMat.baseColorTextureId) {
      const texId = mat.baseColorTextureId;
      if (!texId) {
        await pbrApi.setBaseColorTexture(null);
      } else {
        const texture = texturesById.get(texId);
        if (!texture) {
          throw new Error(
              `Could not find texture with ID ${texId} used by material ${i}`);
        }

        const handle =
            await textureHandleCache.getOrSetTextureHandle(texId, async () => {
              await pbrApi.setBaseColorTexture(texture.uri);
              return pbrApi.baseColorTexture;
            });

        await pbrApi.setBaseColorTexture(handle);
      }
    }
    if (mat.metallicRoughnessTextureId !== oldMat.metallicRoughnessTextureId) {
      const texId = mat.metallicRoughnessTextureId;
      if (!texId) {
        await pbrApi.setMetallicRoughnessTexture(null);
      } else {
        const texture = texturesById.get(texId);
        if (!texture) {
          throw new Error(
              `Could not find texture with ID ${texId} used by material ${i}`);
        }

        const handle =
            await textureHandleCache.getOrSetTextureHandle(texId, async () => {
              await pbrApi.setMetallicRoughnessTexture(texture.uri);
              return pbrApi.metallicRoughnessTexture;
            });

        await pbrApi.setMetallicRoughnessTexture(handle);
      }
    }
    if (mat.normalTextureId !== oldMat.normalTextureId) {
      const texId = mat.normalTextureId;
      if (!texId) {
        await materialApi.setNormalTexture(null);
      } else {
        const texture = texturesById.get(texId);
        if (!texture) {
          throw new Error(
              `Could not find texture with ID ${texId} used by material ${i}`);
        }

        const handle =
            await textureHandleCache.getOrSetTextureHandle(texId, async () => {
              await materialApi.setNormalTexture(texture.uri);
              return materialApi.normalTexture;
            });

        await materialApi.setNormalTexture(handle);
      }
    }
    if (mat.emissiveTextureId !== oldMat.emissiveTextureId) {
      const texId = mat.emissiveTextureId;
      if (!texId) {
        await materialApi.setEmissiveTexture(null);
      } else {
        const texture = texturesById.get(texId);
        if (!texture) {
          throw new Error(
              `Could not find texture with ID ${texId} used by material ${i}`);
        }

        const handle =
            await textureHandleCache.getOrSetTextureHandle(texId, async () => {
              await materialApi.setEmissiveTexture(texture.uri);
              return materialApi.emissiveTexture;
            });

        await materialApi.setEmissiveTexture(handle);
      }
    }
    if (mat.occlusionTextureId !== oldMat.occlusionTextureId) {
      const texId = mat.occlusionTextureId;
      if (!texId) {
        await materialApi.setOcclusionTexture(null);
      } else {
        const texture = texturesById.get(texId);
        if (!texture) {
          throw new Error(
              `Could not find texture with ID ${texId} used by material ${i}`);
        }

        const handle =
            await textureHandleCache.getOrSetTextureHandle(texId, async () => {
              await materialApi.setOcclusionTexture(texture.uri);
              return materialApi.occlusionTexture;
            });

        await materialApi.setOcclusionTexture(handle);
      }
    }
    if (mat.emissiveFactor !== oldMat.emissiveFactor) {
      await materialApi.setEmissiveFactor(mat.emissiveFactor);
    }
    if (mat.alphaMode !== oldMat.alphaMode) {
      await materialApi.setAlphaMode(mat.alphaMode);
    }
    if (mat.alphaCutoff !== oldMat.alphaCutoff) {
      await materialApi.setAlphaCutoff(mat.alphaCutoff);
    }
  }

  // NOTE: In the future, we may actually support changing texture *values*,
  // such as the sampler. In which case, we'll need to diff the textures
  // themselves, independent of the materials. But right now, ThreeDom doesn't
  // even support that, so we'll punt.
}

// For the sake of minimizing GLB size, make sure we re-use texture handles if
// two materials/textures use the same texture ID.
class TextureHandleCache {
  static async create(model: GltfModel, texturesById: TexturesById) {
    const textureHandlesById = new Map<string, TextureHandle>();
    const texIdByUri = new Map<string, string>();
    // Add the textures from the model so we can reuse URIs.
    for (const [id, texture] of texturesById) {
      texIdByUri.set(texture.uri, id);
    }

    const textureHandles = await model.textures;
    for (const textureHandle of textureHandles) {
      const id = texIdByUri.get(textureHandle.uri);
      if (id) {
        textureHandlesById.set(id, textureHandle);
      }
    }

    return new TextureHandleCache(model, texturesById, textureHandlesById);
  }

  private constructor(
      readonly model: GltfModel, readonly texturesById: TexturesById,
      readonly textureHandlesById: Map<string, TextureHandle>) {
  }

  async getOrSetTextureHandle(
      texId: string, createNewHandle: () => Promise<TextureHandle|null>) {
    let finalHandle: TextureHandle|null;
    const cachedHandle = this.textureHandlesById.get(texId);
    // Handles may become invalid if they were garbage collected, so check
    // that.
    if (cachedHandle && await isTextureHandleValid(this.model, cachedHandle)) {
      finalHandle = cachedHandle;
    } else {
      // Set by content and get new handle.
      finalHandle = await createNewHandle();
    }
    if (!finalHandle ||
        !(await isTextureHandleValid(this.model, finalHandle))) {
      throw new Error(`Could not get a valid handle for texId ${texId}`);
    }
    this.textureHandlesById.set(texId, finalHandle);

    return finalHandle;
  }
}
