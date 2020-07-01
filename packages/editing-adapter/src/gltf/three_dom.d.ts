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
 * istributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * @fileoverview This should eventually get replaced with types generated from
 * model-viewer/3DOM
 */

/**
 * Used in baseColorFactor. Values are in linear color
 * space.
 */
export type RGBA = [number, number, number, number];

/**
 * Used in emissiveFactor. Values are in linear color space.
 */
export type RGB = [number, number, number];

/**
 * Unit quaternion, used for node rotation.
 */
export type Quaternion = [number, number, number, number];

/**
 * XYZ Euler angles, in degrees. For convenience.
 */
export type EulerDegrees = [number, number, number];

/**
 * A reference to an existing texture. These are only stable for the lifetime of
 * a Model instance.
 */
export interface TextureHandle {
  readonly uri: string;
}

/**
 * 3DOM API for the glTF PBR material block.
 */
export interface PBRMetallicRoughness {
  readonly baseColorFactor: RGBA;
  setBaseColorFactor(factor: RGBA): Promise<void>;
  readonly roughnessFactor: number;
  setRoughnessFactor(factor: number): Promise<void>;
  readonly metallicFactor: number;
  setMetallicFactor(factor: number): Promise<void>;
  readonly baseColorTexture: TextureHandle|null;
  readonly metallicRoughnessTexture: TextureHandle|null;
  /** newTexture can be an existing handle, a URI string, or null to clear */
  setBaseColorTexture(newTexture: TextureHandle|string|null): Promise<void>;
  setMetallicRoughnessTexture(newTexture: TextureHandle|string|
                              null): Promise<void>;
}

/**
 * 3DOM API for glTF materials.
 */
export interface Material {
  readonly name?: string;
  readonly pbrMetallicRoughness: PBRMetallicRoughness;
  readonly normalTexture: TextureHandle|null;
  setNormalTexture(newTexture: TextureHandle|string|null): Promise<void>;
  readonly doubleSided?: boolean;
  setDoubleSided(doubleSided: boolean|undefined): Promise<void>;
}

/**
 * The root 3DOM interface.
 */
export interface Model {
  readonly materials: Material[];
  readonly textures: TextureHandle[];
}
