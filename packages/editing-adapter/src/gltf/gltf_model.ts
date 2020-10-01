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

/**
 * @fileoverview A wrapper around a gltf model.
 */

import {ModelViewerElement, RGB, RGBA} from '@google/model-viewer/lib/model-viewer';

import {createSafeObjectURL, createSafeObjectUrlFromArrayBuffer, isObjectUrl} from '../util/create_object_url.js';

import {DEFAULT_BASE_COLOR_FACTOR, DEFAULT_EMISSIVE_FACTOR, DEFAULT_METALLIC_FACTOR, DEFAULT_ROUGHNESS_FACTOR, IMAGE_MIME_TYPES} from './gltf_constants.js';
import * as gltfSpec from './gltf_spec.js';
import {packGlb} from './pack_glb.js';
import {unpackGlb} from './unpack_glb.js';

const $getUriForImage = Symbol();
const $onModelViewerDirty = Symbol();
const $getTextureImageUri = Symbol();
const $getTextureHandle = Symbol();
const $getTextureIndex = Symbol();
const $getOrAddTextureByUri = Symbol();

const SINGLE_PIXEL_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';
const SINGLE_PIXEL_PNG_BYTES =
    Uint8Array.from(atob(SINGLE_PIXEL_PNG_BASE64), c => c.charCodeAt(0));

/** A single white pixel PNG. Should be 68-bytes. */
export const SINGLE_PIXEL_PNG_BLOB =
    new Blob([SINGLE_PIXEL_PNG_BYTES], {type: 'image/png'});

const SINGLE_PIXEL_PNG_OBJECT_URL =
    createSafeObjectURL(SINGLE_PIXEL_PNG_BLOB).unsafeUrl;

interface TextureProperty {
  // To easily iterate through texture properties, other approaches are a lot
  // more verbose.
  // tslint:disable-next-line:no-any
  object: gltfSpec.Material|gltfSpec.MaterialPbrMetallicRoughness;
  property: string;
}

function replaceBufferRange(
    buffer: ArrayBuffer,
    replaceOffset: number,
    replaceLength: number,
    newBytes: ArrayBuffer) {
  const before = new Uint8Array(buffer, 0, replaceOffset);
  const after = new Uint8Array(buffer, replaceOffset + replaceLength);
  const newBuffer = new ArrayBuffer(
      before.byteLength + newBytes.byteLength + after.byteLength);
  const newView = new Uint8Array(newBuffer);
  newView.set(before, 0);
  newView.set(new Uint8Array(newBytes), before.byteLength);
  newView.set(after, before.byteLength + newBytes.byteLength);
  return newBuffer;
}

function areRgbaEqual(a: RGBA, b: RGBA) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function areRgbEqual(a: RGB, b: RGB) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

type PbrTextureProperty = 'baseColorTexture'|'metallicRoughnessTexture';

/** Class for accessing glTF PBR properties. */
export class PbrMetallicRoughness {
  /**
   * This takes the material and not a MaterialPbrMetallicRoughness in case that
   * object does not exist yet. It's not required in the glTF spec, so we should
   * handle that case. We will only add the object if the user performs sets.
   */
  constructor(
      readonly gltfModel: GltfModel, readonly materialJson: gltfSpec.Material,
      readonly materialIndex: number) {
  }

  private getOrCreatePbr(): gltfSpec.MaterialPbrMetallicRoughness {
    return this.materialJson.pbrMetallicRoughness =
               this.materialJson.pbrMetallicRoughness || {};
  }

  async setBaseColorFactor(factor: RGBA) {
    if (this.materialJson.pbrMetallicRoughness?.baseColorFactor === undefined &&
        areRgbaEqual(factor, DEFAULT_BASE_COLOR_FACTOR)) {
      return;
    }
    this.getOrCreatePbr().baseColorFactor = [...factor];

    const model = this.gltfModel.modelViewer?.model;
    model?.materials[this.materialIndex]
        .pbrMetallicRoughness.setBaseColorFactor(factor);
  }

  get baseColorFactor(): RGBA {
    return this.materialJson.pbrMetallicRoughness?.baseColorFactor as RGBA ||
        DEFAULT_BASE_COLOR_FACTOR;
  }

  get roughnessFactor(): number {
    return this.materialJson.pbrMetallicRoughness?.roughnessFactor ??
        DEFAULT_ROUGHNESS_FACTOR;
  }

  async setRoughnessFactor(factor: number) {
    if (this.materialJson.pbrMetallicRoughness?.roughnessFactor === undefined &&
        factor === DEFAULT_ROUGHNESS_FACTOR) {
      return;
    }
    this.getOrCreatePbr().roughnessFactor = factor;

    const model = this.gltfModel.modelViewer?.model;
    model?.materials[this.materialIndex]
        .pbrMetallicRoughness.setRoughnessFactor(factor);
  }

  get metallicFactor(): number {
    return this.materialJson.pbrMetallicRoughness?.metallicFactor ??
        DEFAULT_METALLIC_FACTOR;
  }

  async setMetallicFactor(factor: number) {
    if (this.materialJson.pbrMetallicRoughness?.metallicFactor === undefined &&
        factor === DEFAULT_METALLIC_FACTOR) {
      return;
    }
    this.getOrCreatePbr().metallicFactor = factor;

    const model = this.gltfModel.modelViewer?.model;
    model?.materials[this.materialIndex].pbrMetallicRoughness.setMetallicFactor(
        factor);
  }

  get baseColorTexture(): TextureHandle|null {
    const index =
        this.materialJson.pbrMetallicRoughness?.baseColorTexture?.index;
    return this.gltfModel[$getTextureHandle](index);
  }

  async setBaseColorTexture(handle: TextureHandle|string|null) {
    if (await this.baseColorTexture === handle) {
      return;
    }
    await this.setTexture('baseColorTexture', handle);
  }

  get metallicRoughnessTexture(): TextureHandle|null {
    const index =
        this.materialJson.pbrMetallicRoughness?.metallicRoughnessTexture?.index;
    return this.gltfModel[$getTextureHandle](index);
  }

  async setMetallicRoughnessTexture(handle: TextureHandle|string|null) {
    if (await this.metallicRoughnessTexture === handle) {
      return;
    }
    await this.setTexture('metallicRoughnessTexture', handle);
  }

  private async setTexture(
      textureProperty: PbrTextureProperty, handle: TextureHandle|string|null) {
    const getOrCreateTexInfo = () => {
      return this.getOrCreatePbr()[textureProperty] =
                 this.getOrCreatePbr()[textureProperty] || {index: -1};
    };

    const pbr = this.gltfModel.modelViewer?.model?.materials[this.materialIndex]
                    .pbrMetallicRoughness;
    const wasEmpty = !(textureProperty in this.getOrCreatePbr());

    if (handle === null) {
      delete this.getOrCreatePbr()[textureProperty];
      // TODO: Using 3DOM does not work yet, but it would be like this:
      // pbr?.[textureProperty]?.setTexture(null);
      await this.gltfModel[$onModelViewerDirty]();
    } else if (handle instanceof TextureHandle) {
      getOrCreateTexInfo().index = this.gltfModel[$getTextureIndex](handle);
      if (wasEmpty) {
        await this.gltfModel[$onModelViewerDirty]();
      } else {
        pbr?.[textureProperty]?.texture?.source?.setURI(handle.uri);
      }
    } else if (typeof handle === 'string') {
      getOrCreateTexInfo().index =
          this.gltfModel[$getOrAddTextureByUri](handle);
      if (wasEmpty) {
        await this.gltfModel[$onModelViewerDirty]();
      } else {
        pbr?.[textureProperty]?.texture?.source?.setURI(handle);
      }
    }
  }
}

type MaterialTextureProperty =
    'normalTexture'|'emissiveTexture'|'occlusionTexture';

/** Class for accessing material properties. */
export class Material {
  // NOTE: No need for this to be async. This is just a wrapper object.
  readonly pbrMetallicRoughness: PbrMetallicRoughness;

  constructor(
      readonly gltfModel: GltfModel, readonly materialJson: gltfSpec.Material,
      readonly materialIndex: number) {
    this.pbrMetallicRoughness = new PbrMetallicRoughness(
        this.gltfModel, this.materialJson, this.materialIndex);
  }

  get name(): string {
    return this.materialJson.name;
  }

  get normalTexture(): TextureHandle|null {
    const index = this.materialJson.normalTexture?.index;
    return this.gltfModel[$getTextureHandle](index);
  }

  get emissiveTexture(): TextureHandle|null {
    const index = this.materialJson.emissiveTexture?.index;
    return this.gltfModel[$getTextureHandle](index);
  }

  get occlusionTexture(): TextureHandle|null {
    const index = this.materialJson.occlusionTexture?.index;
    return this.gltfModel[$getTextureHandle](index);
  }

  get emissiveFactor(): RGB|undefined {
    return this.materialJson.emissiveFactor as RGB;
  }

  get alphaMode(): string|undefined {
    return this.materialJson.alphaMode;
  }

  get alphaCutoff(): number|undefined {
    return this.materialJson.alphaCutoff;
  }

  get doubleSided(): boolean|undefined {
    return this.materialJson.doubleSided;
  }

  async setDoubleSided(doubleSided: boolean|undefined) {
    if (await this.doubleSided === doubleSided) {
      return;
    }
    this.materialJson.doubleSided = doubleSided;

    await this.gltfModel[$onModelViewerDirty]();
  }

  async setNormalTexture(handle: TextureHandle|string|null) {
    if (await this.normalTexture === handle) {
      return;
    }
    await this.setTexture('normalTexture', handle);
  }

  async setEmissiveTexture(handle: TextureHandle|string|null) {
    if (await this.emissiveTexture === handle) {
      return;
    }
    await this.setTexture('emissiveTexture', handle);
  }

  async setEmissiveFactor(emissiveFactor: RGB|undefined) {
    if (this.materialJson.emissiveFactor === undefined && emissiveFactor &&
        areRgbEqual(emissiveFactor, DEFAULT_EMISSIVE_FACTOR)) {
      return;
    }

    this.materialJson.emissiveFactor = emissiveFactor;
    await this.gltfModel[$onModelViewerDirty]();
  }

  async setOcclusionTexture(handle: TextureHandle|string|null) {
    if (await this.occlusionTexture === handle) {
      return;
    }
    await this.setTexture('occlusionTexture', handle);
  }

  async setAlphaMode(alphaMode: string|undefined) {
    if (await this.alphaMode === alphaMode) {
      return;
    }

    this.materialJson.alphaMode = alphaMode;

    await this.gltfModel[$onModelViewerDirty]();
  }

  async setAlphaCutoff(alphaCutoff: number|undefined) {
    if (await this.alphaCutoff === alphaCutoff) {
      return;
    }

    this.materialJson.alphaCutoff = alphaCutoff;

    await this.gltfModel[$onModelViewerDirty]();
  }

  private async setTexture(
      textureProperty: MaterialTextureProperty,
      handle: TextureHandle|string|null) {
    const getOrCreateTexInfo = () => {
      // This string cast is necessary to pass type checks.
      return (
          this.materialJson[textureProperty as string] =
              this.materialJson[textureProperty] || {index: -1});
    };

    const material =
        this.gltfModel.modelViewer?.model?.materials[this.materialIndex];
    const wasEmpty = !(textureProperty in this.materialJson);

    if (handle === null) {
      delete this.materialJson[textureProperty];
      // TODO: Using 3DOM does not work yet, but it would be like this:
      // material?.[textureProperty]?.setTexture(null);
      await this.gltfModel[$onModelViewerDirty]();
    } else if (handle instanceof TextureHandle) {
      getOrCreateTexInfo().index = this.gltfModel[$getTextureIndex](handle);
      if (wasEmpty) {
        await this.gltfModel[$onModelViewerDirty]();
      } else {
        material?.[textureProperty]?.texture?.source?.setURI(handle.uri);
      }
    } else if (typeof handle === 'string') {
      getOrCreateTexInfo().index =
          this.gltfModel[$getOrAddTextureByUri](handle);
      if (wasEmpty) {
        await this.gltfModel[$onModelViewerDirty]();
      } else {
        material?.[textureProperty]?.texture?.source?.setURI(handle);
      }
    }
  }
}

/** An object for referencing a texture. */
export class TextureHandle {
  constructor(readonly gltfModel: GltfModel) {
  }

  get uri() {
    return this.gltfModel[$getTextureImageUri](this);
  }

  // Deletes this texture from the GLTF.
  async delete() {
    this.gltfModel.deleteTexture(this);
  }

  isUsed() {
    return this.gltfModel.isTextureUsed(this);
  }
}

/**
 * A GLTF file with JSON and bin chunks, and the images parsed from the bin
 * data.
 */
export class GltfModel {
  static fromGlb(glbBuffer: ArrayBuffer): GltfModel {
    const {gltfJson, gltfBuffer} = unpackGlb(glbBuffer);
    return new GltfModel(gltfJson, gltfBuffer);
  }

  // Convenience method that creates an adapter mounted to a given model viewer
  // element, which already has a src attribute.
  static async fromModelViewer(modelViewer: ModelViewerElement) {
    if (!modelViewer.src) {
      throw new Error('Given modelViewer instance does not have src set');
    }

    const response = await fetch(modelViewer.src);
    if (!response.ok) {
      throw new Error(`Failed to fetch src ${modelViewer.src}`);
    }
    const blob = await response.blob();
    if (!blob) {
      throw new Error(
          `Could not extract binary blob from response of ${modelViewer.src}`);
    }

    const glbContents = await blob.arrayBuffer();
    const {gltfJson, gltfBuffer} = unpackGlb(glbContents);
    return new GltfModel(gltfJson, gltfBuffer, modelViewer);
  }

  get materials(): Material[] {
    return this.materialInstances;
  }

  private readonly materialInstances: Material[];

  get textures(): TextureHandle[] {
    return this.textureInstances;
  }

  // Although it is not required by the API, for simpilicity, the order of this
  // array should match the order of root.textures.
  private readonly textureInstances: TextureHandle[];

  // Cache of object URLs for images that are stored in the buffer. The keys are
  // image indices. We never add images to the buffer, in-place, so this should
  // not be modified after construction.
  private readonly bufferImageUrls = new Map<number, string>();

  private glbObjectUrl?: string;

  /**
   * By default, all arguments passed in will be mutated.
   *
   * Pass in 'reusableBufferImageUrls' to reuse object URLs. This will not
   * be mutated.
   */
  constructor(
      private readonly root: gltfSpec.GlTf, private buffer: ArrayBuffer|null,
      // If provided, this modelViewer instance will be dynamically updated as
      // mutations are made to this GltfModel.
      readonly modelViewer?: ModelViewerElement,
      reusableBufferImageUrls?: Map<number, string>) {
    this.materialInstances = (this.root.materials ?? [])
                                 .map(
                                     (materialJson, index) => new Material(
                                         this, materialJson, index));

    const imageJsons = this.root.images ?? [];

    if (reusableBufferImageUrls) {
      this.bufferImageUrls = reusableBufferImageUrls;
    } else {
      for (const [i, imageJson] of imageJsons.entries()) {
        if (!imageJson.uri) {
          this.bufferImageUrls.set(
              i, this.generateBufferImageObjectUrl(imageJson));
        }
      }
    }

    const textureJsons = this.root.textures ?? [];
    this.textureInstances =
        [...textureJsons.keys()].map(() => new TextureHandle(this));
  }

  // This may yield undefined properties.
  private * textureInfoPropertiesHelper() {
    for (const mat of (this.root.materials ?? [])) {
      yield {object: mat.pbrMetallicRoughness, property: 'baseColorTexture'} as
          TextureProperty;
      yield {
        object: mat.pbrMetallicRoughness,
        property: 'metallicRoughnessTexture'
      } as TextureProperty;
      yield {object: mat, property: 'normalTexture'} as TextureProperty;
      yield {object: mat, property: 'occlusionTexture'} as TextureProperty;
      yield {object: mat, property: 'emissiveTexture'} as TextureProperty;
    }
  }

  * textureInfoProperties() {
    for (const pair of this.textureInfoPropertiesHelper()) {
      if (pair.object && pair.property in pair.object) {
        yield pair;
      }
    }
  }

  deleteTexture(handle: TextureHandle) {
    const texId = this.textureInstances.indexOf(handle);
    if (texId === -1) {
      throw new Error('Could not find given texture handle');
    }
    if (!this.root.textures) {
      throw new Error('JSON textures out of sync');
    }
    const texJson = this.root.textures[texId];
    this.root.textures.splice(texId, 1);
    this.textureInstances.splice(texId, 1);

    // Update/offset any references to this texture.
    for (const {object, property} of this.textureInfoProperties()) {
      if (object[property].index === texId) {
        // Remove the texture info entirely.
        delete object[property];
      } else if (object[property].index > texId) {
        // Update the index.
        object[property].index--;
      }
    }

    if (texJson.source === undefined) {
      throw new Error('Texture does not have source image?');
    }
    this.garbageCollectForImage(texJson.source);
  }

  isTextureUsed(handle: TextureHandle) {
    const texId = this.textureInstances.indexOf(handle);
    if (texId === -1) {
      throw new Error('Could not find given texture handle');
    }
    for (const {object, property} of this.textureInfoProperties()) {
      if (object[property].index === texId) {
        return true;
      }
    }
    return false;
  }

  // If this model is mounted to a model-viewer instance, this is the URL that
  // should be used as its "src" attribute.
  getModelViewerSource(): string|undefined {
    if (!this.modelViewer) {
      throw new Error(
          'Invalid to call if not mounted to a model-viewer instance.');
    }
    return this.glbObjectUrl;
  }

  async packGlb(): Promise<ArrayBuffer> {
    return packGlb(this.root, this.buffer);
  }

  private getOrCreateImages() {
    return this.root.images = (this.root.images ?? []);
  }

  private getOrCreateSamplers() {
    return this.root.samplers = (this.root.samplers ?? []);
  }

  // NOTE: This deals with the textures JSON array, not the this.textures
  // handles array.
  private getOrCreateTextures(): gltfSpec.Texture[] {
    return this.root.textures = (this.root.textures ?? []);
  }

  [$getTextureHandle](index?: number): TextureHandle|null {
    if (index === undefined)
      return null;
    return this.textureInstances[index];
  }

  private findImageForUri(uri: string): number {
    // Could be accelerated, but let's keep it simple.
    if (!this.root.images) {
      throw new Error('Called, but no images in glTF');
    }
    return this.root.images.findIndex(
        // Needed for NPM build
        // tslint:disable-next-line:enforce-name-casing
        (_, i) => this[$getUriForImage](i) === uri);
  }

  private findTextureForUri(uri: string): number {
    if (!this.root.textures) {
      return -1;
    }

    // Find the image for this URI, then find a texture
    // that uses it.
    const imageId = this.findImageForUri(uri);
    if (imageId === -1) {
      return -1;
    }

    return this.root.textures.findIndex(tex => tex.source === imageId);
  }

  [$getOrAddTextureByUri](uri: string) {
    const existingIndex = this.findTextureForUri(uri);
    if (existingIndex !== -1) {
      return existingIndex;
    }

    // This is new, so we need to create the image and the texture entries.

    const source = this.getOrCreateImages().length;
    // NOTE: This could be an object URL, which is only valid for the
    // web-document's life time. But we only need to worry about that upon
    // export, so just use it directly here.
    this.getOrCreateImages().push({uri});

    // TODO: Probably should not hard-code sampler settings.
    const sampler = this.getOrCreateSamplers().length;
    this.getOrCreateSamplers().push(
        {magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497});

    const index = this.getOrCreateTextures().length;
    this.getOrCreateTextures().push({sampler, source});

    this.textureInstances.push(new TextureHandle(this));

    if (this.textureInstances.length !== this.getOrCreateTextures().length) {
      throw new Error('Somehow our texture arrays have gotten out of sync');
    }

    return index;
  }

  private generateBufferImageObjectUrl(image: gltfSpec.Image): string {
    if (image.uri) {
      throw new Error(
          `Only valid to call for buffer images. Given image has a URI.`);
    }
    if (image.bufferView === undefined) {
      throw new Error(`Presumed buffer image does not have a buffer view`);
    }
    if (image.mimeType === undefined ||
        !IMAGE_MIME_TYPES.includes(image.mimeType)) {
      throw new Error(
          `Unsupported mime type for image data: ${image.mimeType}`);
    }
    if (!this.buffer) {
      throw new Error(
          `Image spec referenced a bufferView, but the gltf has no buffer`);
    }
    // Find the buffer view at the specified location.
    const bufferView = this.root.bufferViews?.[image.bufferView];
    if (!bufferView) {
      throw new Error(
          `Image spec referenced an in valid bufferView: ${image.bufferView}`);
    }
    const imageBytes = new Uint8Array(
        this.buffer, bufferView.byteOffset ?? 0, bufferView.byteLength);
    const blob = new Blob([imageBytes], {type: image.mimeType});
    return createSafeObjectURL(blob).unsafeUrl;
  }

  [$getUriForImage](imageIndex: number): string {
    if (!this.root.images) {
      throw new Error('No images array');
    }
    const jsonUri = this.root.images[imageIndex].uri;
    if (jsonUri !== undefined) {
      return jsonUri;
    } else {
      const uri = this.bufferImageUrls.get(imageIndex);
      if (!uri) {
        throw new Error(`Missing object URL for buffer image ${imageIndex}`);
      }
      return uri;
    }
  }

  [$getTextureIndex](handle: TextureHandle): number {
    const index = this.textureInstances.indexOf(handle);
    if (index === -1) {
      throw new Error('Given handle was not created by this instance');
    }
    return index;
  }

  [$getTextureImageUri](handle: TextureHandle): string {
    if (!this.root.textures) {
      throw new Error('No textures array?');
    }
    const index = this[$getTextureIndex](handle);
    const imageIndex = this.root.textures[index].source;
    if (imageIndex === undefined) {
      throw new Error(`Invalid source for texture ${index}`);
    }
    return this[$getUriForImage](imageIndex);
  }

  // Mutation code should call this whenever a mutation could not be applied to
  // model-viewer directly.
  async[$onModelViewerDirty]() {
    if (!this.modelViewer) {
      return;
    }

    // Immediately refresh. In the future, we could batch this up and provide a
    // "syncIfNeeded" function so we don't refresh the GLB for every mutation.
    await this.refreshModelViewerGlb();
  }

  private async refreshModelViewerGlb() {
    if (!this.modelViewer) {
      throw new Error('Invalid to call without modelViewer reference');
    }

    if (this.glbObjectUrl) {
      URL.revokeObjectURL(this.glbObjectUrl);
      delete this.glbObjectUrl;
    }

    const glbBuffer = await this.packGlb();
    if (!glbBuffer) {
      throw new Error(`Could not pack gltf into a glb!`);
    }

    this.glbObjectUrl = createSafeObjectUrlFromArrayBuffer(glbBuffer).unsafeUrl;
    this.modelViewer.src = this.glbObjectUrl;
  }

  get animationNames(): string[] {
    return (this.root.animations ?? []).map(anim => anim.name);
  }

  get jsonString(): string {
    return JSON.stringify(this.root, null, 2);
  }

  get images(): gltfSpec.Image[]|undefined {
    return this.root.images;
  }

  get bufferByteLength(): number|undefined {
    return this.buffer?.byteLength;
  }

  private garbageCollectForImage(imageId: number) {
    // We're assuming that 1) only a single image references a single view, and
    // 2) only textures reference images.

    if (!this.root.images) {
      return;
    }

    const image = this.root.images[imageId];
    if (!image) {
      throw new Error(`Invalid image object for index ${imageId}`);
    }

    // Is the image still used by any texture?
    const usedImageIds = new Set<number>();
    for (const tex of (this.root.textures ?? [])) {
      if (tex.source === undefined) {
        throw new Error('Texture had no valid source');
      }
      usedImageIds.add(tex.source);
    }

    if (usedImageIds.has(imageId)) {
      // Still in use - don't free.
      return;
    }

    if (image.uri) {
      // A URI - replace it with a single-pixel PNG.
      if (isObjectUrl(image.uri)) {
        // We generated this ourselves - cleanup.
        URL.revokeObjectURL(image.uri);
      }
      image.uri = SINGLE_PIXEL_PNG_OBJECT_URL;
      return;
    }

    // Is this *bufferView* being used by any image (that itself is in use)?
    const bufferViewId = image.bufferView;
    if (bufferViewId === undefined) {
      throw new Error(`Image ${imageId} had no valid uri or bufferView`);
    }

    for (const otherImageId of usedImageIds) {
      if (this.root.images[otherImageId].bufferView === bufferViewId) {
        // bufferView still in use - can't free bytes
        return;
      }
    }

    if (!this.root.bufferViews || !this.buffer) {
      throw new Error(`Image ${
          imageId} was a buffer image, but the glTF had no buffer or views?`);
    }

    // Free some bytes! To avoid changing indices of other views, which may be
    // referenced by who knows what, we will still keep the view around but just
    // shrink it down to a single-pixel PNG (so it's still valid). The most
    // important thing is to save space and minimize change to the glTF
    // structures.

    const view = this.root.bufferViews[bufferViewId];
    const dummyBuffer: ArrayBuffer = SINGLE_PIXEL_PNG_BYTES.buffer;
    this.buffer = replaceBufferRange(
        this.buffer, view.byteOffset!, view.byteLength, dummyBuffer);

    // Update the view and all views after it.
    const bytesSaved = view.byteLength - dummyBuffer.byteLength;
    view.byteLength = dummyBuffer.byteLength;
    for (let i = bufferViewId + 1; i < this.root.bufferViews.length; i++) {
      if (this.root.bufferViews[i]?.byteOffset === undefined) {
        throw new Error(`Invalid bufferView at index ${i}?`);
      }
      this.root.bufferViews[i].byteOffset! -= bytesSaved;
    }
    image.mimeType = SINGLE_PIXEL_PNG_BLOB.type;

    // Make sure we update the URL cache
    const prevUrl = this.bufferImageUrls.get(imageId);
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }
    this.bufferImageUrls.set(
        imageId, createSafeObjectURL(SINGLE_PIXEL_PNG_BLOB).unsafeUrl);
  }
}
