/* @license
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
 */

import {AlphaMode, MagFilter, MinFilter, WrapMode} from '../../three-components/gltf-instance/gltf-2.0.js';


/**
 * All constructs in a 3DOM scene graph have a corresponding string name.
 * This is similar in spirit to the concept of a "tag name" in HTML, and exists
 * in support of looking up 3DOM elements by type.
 */
export declare interface ThreeDOMElementMap {
  'model': Model;
  'material': Material;
  'pbr-metallic-roughness': PBRMetallicRoughness;
  'sampler': Sampler;
  'image': Image;
  'texture': Texture;
  'texture-info': TextureInfo;
}

/** A 2D Cartesian coordinate */
export interface Vector2DInterface {
  u: number;
  v: number;
}

/**
 * A Model is the root element of a 3DOM scene graph. It gives scripts access
 * to the sub-elements found without the graph.
 */
export declare interface Model {
  /**
   * An ordered set of unique Materials found in this model. The Materials
   * correspond to the listing of materials in the glTF, with the possible
   * addition of a default material at the end.
   */
  readonly materials: Readonly<Material[]>;

  /**
   * Gets a material(s) by name.
   * @param name the name of the material to return.
   * @returns the first material to whose name matches `name`
   */
  getMaterialByName(name: string): Material|null;

  /**
   * Creates a new material variant from an existing material.
   * @param originalMaterialIndex index of the material to clone the variant
   *     from.
   * @param materialName the name of the new material
   * @param variantName the name of the variant
   * @param activateVariant activates this material variant, i.e. the variant
   *     material is rendered, not the existing material.
   * @returns returns a clone of the original material, returns `null` if the
   *     material instance for this variant already exists.
   */
  createMaterialInstanceForVariant(
      originalMaterialIndex: number, newMaterialName: string,
      variantName: string, activateVariant: boolean): Material|null;

  /**
   * Adds a variant name to the model.
   * @param variantName
   */
  createVariant(variantName: string): void;

  /**
   * Adds an existing material to a variant name.
   * @param materialIndex
   * @param targetVariantName
   */
  setMaterialToVariant(materialIndex: number, targetVariantName: string): void;

  /**
   * Removes the variant name from the model.
   * @param variantName the variant to remove.
   */
  deleteVariant(variantName: string): void;
}

/**
 * A Material gives the script access to modify a single, unique material found
 * in a model's scene graph.
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-material
 */
export declare interface Material {
  /**
   * The name of the material, if any.
   */
  name: string;

  readonly normalTexture: TextureInfo|null;
  readonly occlusionTexture: TextureInfo|null;
  readonly emissiveTexture: TextureInfo|null;

  readonly emissiveFactor: Readonly<RGB>;
  setEmissiveFactor(rgb: RGB|string): void;
  setAlphaCutoff(cutoff: number): void;
  getAlphaCutoff(): number;
  setDoubleSided(doubleSided: boolean): void;
  getDoubleSided(): boolean;
  setAlphaMode(alphaMode: AlphaMode): void;
  getAlphaMode(): AlphaMode;

  /**
   * PBR Next properties.
   */
  readonly emissiveStrength: number;
  readonly clearcoatFactor: number;
  readonly clearcoatRoughnessFactor: number;
  readonly clearcoatTexture: TextureInfo;
  readonly clearcoatRoughnessTexture: TextureInfo;
  readonly clearcoatNormalTexture: TextureInfo;
  readonly clearcoatNormalScale: number;
  readonly ior: number;
  readonly sheenColorFactor: Readonly<RGB>;
  readonly sheenColorTexture: TextureInfo;
  readonly sheenRoughnessFactor: number;
  readonly sheenRoughnessTexture: TextureInfo;
  readonly transmissionFactor: number;
  readonly transmissionTexture: TextureInfo;
  readonly thicknessFactor: number;
  readonly thicknessTexture: TextureInfo;
  readonly attenuationDistance: number;
  readonly attenuationColor: Readonly<RGB>;
  readonly specularFactor: number;
  readonly specularTexture: TextureInfo;
  readonly specularColorFactor: Readonly<RGB>;
  readonly specularColorTexture: TextureInfo;
  readonly iridescenceFactor: number;
  readonly iridescenceTexture: TextureInfo;
  readonly iridescenceIor: number;
  readonly iridescenceThicknessMinimum: number;
  readonly iridescenceThicknessMaximum: number;
  readonly iridescenceThicknessTexture: TextureInfo;
  readonly anisotropyStrength: number;
  readonly anisotropyRotation: number;
  readonly anisotropyTexture: TextureInfo;

  setEmissiveStrength(emissiveStrength: number): void;
  setClearcoatFactor(clearcoatFactor: number): void;
  setClearcoatRoughnessFactor(clearcoatRoughnessFactor: number): void;
  setClearcoatNormalScale(clearcoatNormalScale: number): void;
  setIor(ior: number): void;
  setSheenColorFactor(rgb: RGB|string): void;
  setSheenRoughnessFactor(roughness: number): void;
  setTransmissionFactor(transmission: number): void;
  setThicknessFactor(thickness: number): void;
  setAttenuationDistance(attenuationDistance: number): void;
  setAttenuationColor(rgb: RGB|string): void;
  setSpecularFactor(specularFactor: number): void;
  setSpecularColorFactor(rgb: RGB|string): void;
  setIridescenceFactor(iridescence: number): void;
  setIridescenceIor(ior: number): void;
  setIridescenceThicknessMinimum(thicknessMin: number): void;
  setIridescenceThicknessMaximum(thicknessMax: number): void;
  setAnisotropyStrength(strength: number): void;
  setAnisotropyRotation(rotation: number): void;

  /**
   * The PBRMetallicRoughness configuration of the material.
   */
  readonly pbrMetallicRoughness: PBRMetallicRoughness;

  /**
   * Asynchronously loads the underlying material resource if it's currently
   * unloaded, otherwise the method is a noop.
   */
  ensureLoaded(): void;

  /**
   * Returns true if the material participates in the variant.
   * @param name the variant name.
   */
  hasVariant(name: string): boolean;

  /**
   * Returns true if the material is loaded.
   */
  readonly isLoaded: boolean;

  /**
   * Returns true if the material is participating in scene renders.
   */
  readonly isActive: boolean;

  /**
   * Returns the glTF index of this material.
   */
  readonly index: number;
}

/**
 * The PBRMetallicRoughness encodes the PBR properties of a material
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-pbrmetallicroughness
 */
export declare interface PBRMetallicRoughness {
  /**
   * The base color factor of the material, represented as RGBA values
   */
  readonly baseColorFactor: Readonly<RGBA>;

  /**
   * Metalness factor of the material, represented as number between 0 and 1
   */
  readonly metallicFactor: number;

  /**
   * Roughness factor of the material, represented as number between 0 and 1
   */
  readonly roughnessFactor: number;

  /**
   * A texture reference, associating an image with color information and
   * a sampler for describing base color factor for a UV coordinate space.
   */
  readonly baseColorTexture: TextureInfo|null;

  /**
   * A texture reference, associating an image with color information and
   * a sampler for describing metalness (B channel) and roughness (G channel)
   * for a UV coordinate space.
   */
  readonly metallicRoughnessTexture: TextureInfo|null;

  /**
   * Changes the base color factor of the material to the given value.
   */
  setBaseColorFactor(rgba: RGBA|string): void;

  /**
   * Changes the metalness factor of the material to the given value.
   */
  setMetallicFactor(value: number): void;

  /**
   * Changes the roughness factor of the material to the given value.
   */
  setRoughnessFactor(value: number): void;
}

/**
 * A TextureInfo is a pointer to a specific Texture in use on a Material
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-textureinfo
 */
export declare interface TextureInfo {
  /**
   * The Texture being referenced by this TextureInfo.
   */
  readonly texture: Texture|null;

  /**
   * Sets the texture, or removes it if argument is null. Note you cannot build
   * your own Texture object, but must either use one from another TextureInfo,
   * or create one with the createTexture method.
   */
  setTexture(texture: Texture|null): void;
}

/**
 * A Texture pairs an Image and a Sampler for use in a Material
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-texture
 */
export declare interface Texture {
  /**
   * The name of the texture, if any.
   */
  readonly name: string;

  /**
   * The Sampler for this Texture
   */
  readonly sampler: Sampler;

  /**
   * The source Image for this Texture
   */
  readonly source: Image;
}

/**
 * A Sampler describes how to filter and wrap textures
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-sampler
 */
export declare interface Sampler {
  /**
   * The name of the sampler, if any.
   */
  readonly name: string;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplerminfilter
   */
  readonly minFilter: MinFilter;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplermagfilter
   */
  readonly magFilter: MagFilter;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplerwraps
   */
  readonly wrapS: WrapMode;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplerwrapt
   */
  readonly wrapT: WrapMode;

  /**
   * The texture rotation in radians.
   */
  readonly rotation: number|null;

  /**
   * The texture scale.
   */
  readonly scale: Vector2DInterface|null;

  /**
   * The texture offset.
   */
  readonly offset: Vector2DInterface|null;

  /**
   * Configure the minFilter value of the Sampler.
   */
  setMinFilter(filter: MinFilter): void;

  /**
   * Configure the magFilter value of the Sampler.
   */
  setMagFilter(filter: MagFilter): void;

  /**
   * Configure the S (U) wrap mode of the Sampler.
   */
  setWrapS(mode: WrapMode): void;

  /**
   * Configure the T (V) wrap mode of the Sampler.
   */
  setWrapT(mode: WrapMode): void;

  /**
   * Sets the texture rotation, or resets it to zero if argument is null.
   * Rotation is in radians, positive for counter-clockwise.
   */
  setRotation(rotation: number|null): void;

  /**
   * Sets the texture scale, or resets it to (1, 1) if argument is null.
   * As the scale value increases, the repetition of the texture will increase.
   */
  setScale(scale: Vector2DInterface|null): void;

  /**
   * Sets the texture offset, or resets it to (0, 0) if argument is null.
   */
  setOffset(offset: Vector2DInterface|null): void;
}


/**
 * An Image represents an embedded or external image used to provide texture
 * color data.
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-image
 */
export declare interface Image {
  /**
   * The name of the image, if any.
   */
  readonly name: string;

  /**
   * The type is 'external' if the image has a configured URI. Otherwise, it is
   * considered to be 'embedded'. Note: this distinction is only implied by the
   * glTF spec, and is made explicit here for convenience.
   */
  readonly type: 'embedded'|'external';

  /**
   * The URI of the image, if it is external.
   */
  readonly uri?: string;

  /**
   * The bufferView of the image, if it is embedded.
   */
  readonly bufferView?: number;

  /**
   * The backing HTML element, if this is a video or canvas texture.
   */
  readonly element?: HTMLVideoElement|HTMLCanvasElement;

  /**
   * The Lottie animation object, if this is a Lottie texture. You may wish to
   * do image.animation as import('lottie-web').AnimationItem; to get its type
   * info.
   */
  readonly animation?: any;

  /**
   * A method to create an object URL of this image at the desired
   * resolution. Especially useful for KTX2 textures which are GPU compressed,
   * and so are unreadable on the CPU without a method like this.
   */
  createThumbnail(width: number, height: number): Promise<string>;

  /**
   * Only applies to canvas textures. Call when the content of the canvas has
   * been updated and should be reflected in the model.
   */
  update(): void;
}

/**
 * An RGBA-encoded color, with channels represented as floating point values
 * from [0,1].
 */
export declare type RGBA = [number, number, number, number];
export declare type RGB = [number, number, number];
