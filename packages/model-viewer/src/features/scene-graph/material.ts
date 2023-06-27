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

import {Color, ColorRepresentation, DoubleSide, FrontSide, MeshPhysicalMaterial, Vector2} from 'three';

import {AlphaMode, RGB} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Material as MaterialInterface} from './api.js';
import {LazyLoader, VariantData} from './model.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo, TextureUsage} from './texture-info.js';
import {$correlatedObjects, $onUpdate, ThreeDOMElement} from './three-dom-element.js';



const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');
const $backingThreeMaterial = Symbol('backingThreeMaterial');
const $applyAlphaCutoff = Symbol('applyAlphaCutoff');
const $getAlphaMode = Symbol('getAlphaMode');
export const $lazyLoadGLTFInfo = Symbol('lazyLoadGLTFInfo');
const $initialize = Symbol('initialize');
export const $getLoadedMaterial = Symbol('getLoadedMaterial');
export const $ensureMaterialIsLoaded = Symbol('ensureMaterialIsLoaded');
export const $gltfIndex = Symbol('gltfIndex');
export const $setActive = Symbol('setActive');
export const $variantIndices = Symbol('variantIndices');
const $isActive = Symbol('isActive');
export const $variantSet = Symbol('variantSet');
const $modelVariants = Symbol('modelVariants');
const $name = Symbol('name');

/**
 * PBR Next properties.
 */
const $clearcoatTexture = Symbol('clearcoatTexture');
const $clearcoatRoughnessTexture = Symbol('clearcoatRoughnessTexture');
const $clearcoatNormalTexture = Symbol('clearcoatNormalTexture');

/**
 * Material facade implementation for Three.js materials
 */
export class Material extends ThreeDOMElement implements MaterialInterface {
  private[$pbrMetallicRoughness]!: PBRMetallicRoughness;
  private[$normalTexture]!: TextureInfo;
  private[$occlusionTexture]!: TextureInfo;
  private[$emissiveTexture]!: TextureInfo;
  private[$lazyLoadGLTFInfo]?: LazyLoader;
  private[$gltfIndex]: number;
  private[$isActive]: boolean;
  private[$variantSet] = new Set<number>();
  private[$name]?: string;
  readonly[$modelVariants]: Map<string, VariantData>;

  /**
   * PBR Next properties.
   */
  private[$clearcoatTexture]!: TextureInfo;
  private[$clearcoatRoughnessTexture]!: TextureInfo;
  private[$clearcoatNormalTexture]!: TextureInfo;

  get[$backingThreeMaterial](): MeshPhysicalMaterial {
    return (this[$correlatedObjects] as Set<MeshPhysicalMaterial>)
        .values()
        .next()
        .value;
  }

  constructor(
      onUpdate: () => void,
      gltfIndex: number,
      isActive: boolean,
      modelVariants: Map<string, VariantData>,
      correlatedMaterials: Set<MeshPhysicalMaterial>,
      name: string|undefined,
      lazyLoadInfo: LazyLoader|undefined = undefined,
  ) {
    super(onUpdate, correlatedMaterials);
    this[$gltfIndex] = gltfIndex;
    this[$isActive] = isActive;
    this[$modelVariants] = modelVariants;
    this[$name] = name;

    if (lazyLoadInfo == null) {
      this[$initialize]();
    } else {
      this[$lazyLoadGLTFInfo] = lazyLoadInfo;
    }
  }

  private[$initialize](): void {
    const onUpdate = this[$onUpdate] as () => void;
    const correlatedMaterials =
        this[$correlatedObjects] as Set<MeshPhysicalMaterial>;

    this[$pbrMetallicRoughness] =
        new PBRMetallicRoughness(onUpdate, correlatedMaterials);

    const {normalMap, aoMap, emissiveMap} =
        correlatedMaterials.values().next().value;

    this[$normalTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Normal,
        normalMap,
        correlatedMaterials,
    );

    this[$occlusionTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Occlusion,
        aoMap,
        correlatedMaterials,
    );

    this[$emissiveTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Emissive,
        emissiveMap,
        correlatedMaterials,
    );

    this[$clearcoatTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Clearcoat,
        null,
        correlatedMaterials,
    );

    this[$clearcoatRoughnessTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.ClearcoatRoughness,
        null,
        correlatedMaterials,
    );

    this[$clearcoatNormalTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.ClearcoatNormal,
        null,
        correlatedMaterials,
    );
  }

  async[$getLoadedMaterial](): Promise<MeshPhysicalMaterial> {
    if (this[$lazyLoadGLTFInfo] != null) {
      const {set, material} = await this[$lazyLoadGLTFInfo]!.doLazyLoad();

      // Fills in the missing data.
      this[$correlatedObjects] = set as Set<MeshPhysicalMaterial>;

      this[$initialize]();
      // Releases lazy load info.
      this[$lazyLoadGLTFInfo] = undefined;
      // Redefines the method as a noop method.
      this.ensureLoaded = async () => {};
      return material as MeshPhysicalMaterial;
    }
    return this[$correlatedObjects]!.values().next().value;
  }

  [$ensureMaterialIsLoaded]() {
    if (this[$lazyLoadGLTFInfo] == null) {
      return;
    }
    throw new Error(`Material "${this.name}" has not been loaded, call 'await
    myMaterial.ensureLoaded()' before using an unloaded material.`);
  }

  async ensureLoaded() {
    await this[$getLoadedMaterial]();
  }

  get isLoaded() {
    return this[$lazyLoadGLTFInfo] == null;
  }

  get isActive(): boolean {
    return this[$isActive];
  }

  [$setActive](isActive: boolean) {
    this[$isActive] = isActive;
  }

  get name(): string {
    return this[$name] || '';
  }

  set name(name: string) {
    this[$name] = name;
    if (this[$correlatedObjects] != null) {
      for (const threeMaterial of this[$correlatedObjects]!) {
        threeMaterial.name = name;
      }
    }
  }

  get pbrMetallicRoughness(): PBRMetallicRoughness {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrMetallicRoughness];
  }

  get normalTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$normalTexture];
  }

  get occlusionTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$occlusionTexture];
  }

  get emissiveTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$emissiveTexture];
  }

  get emissiveFactor(): RGB {
    this[$ensureMaterialIsLoaded]();
    return (
        this[$backingThreeMaterial]
            .emissive.toArray() as [number, number, number]);
  }

  get index(): number {
    return this[$gltfIndex];
  }

  [$variantIndices]() {
    return this[$variantSet];
  }

  hasVariant(name: string): boolean {
    const variantData = this[$modelVariants].get(name);
    return variantData != null && this[$variantSet].has(variantData.index);
  }

  setEmissiveFactor(rgb: RGB|string) {
    this[$ensureMaterialIsLoaded]();
    const color = new Color();
    if (rgb instanceof Array) {
      color.fromArray(rgb);
    } else {
      color.set(rgb as ColorRepresentation);
    }
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.emissive.set(color);
    }
    this[$onUpdate]();
  }

  [$getAlphaMode](): string {
    // Follows implementation of GLTFExporter from three.js
    if (this[$backingThreeMaterial].transparent) {
      return 'BLEND';
    } else {
      if (this[$backingThreeMaterial].alphaTest > 0.0) {
        return 'MASK';
      }
    }
    return 'OPAQUE';
  }

  [$applyAlphaCutoff]() {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      if (this[$getAlphaMode]() === 'MASK') {
        if (material.alphaTest == undefined) {
          material.alphaTest = 0.5;
        }
      } else {
        (material.alphaTest as number | undefined) = undefined;
      }

      material.needsUpdate = true;
    }
  }

  setAlphaCutoff(cutoff: number): void {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.alphaTest = cutoff;
      material.needsUpdate = true;
    }
    // Set AlphaCutoff to undefined if AlphaMode is not MASK.
    this[$applyAlphaCutoff]();
    this[$onUpdate]();
  }

  getAlphaCutoff(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].alphaTest;
  }

  setDoubleSided(doubleSided: boolean): void {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      // When double-sided is disabled gltf spec dictates that Back-Face culling
      // must be disabled, in three.js parlance that would mean FrontSide
      // rendering only.
      // https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#double-sided
      material.side = doubleSided ? DoubleSide : FrontSide;
      material.needsUpdate = true;
    }
    this[$onUpdate]();
  }

  getDoubleSided(): boolean {
    this[$ensureMaterialIsLoaded]();
    // 0 for FrontSide, 2 for DoubleSide.
    return this[$backingThreeMaterial].side == 2;
  }

  setAlphaMode(alphaMode: AlphaMode): void {
    this[$ensureMaterialIsLoaded]();
    const enableTransparency =
        (material: MeshPhysicalMaterial, enabled: boolean): void => {
          material.transparent = enabled;
          material.depthWrite = !enabled;
        };

    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      enableTransparency(material, alphaMode === 'BLEND');
      if (alphaMode === 'MASK') {
        material.alphaTest = 0.5;
      } else {
        (material.alphaTest as number | undefined) = undefined;
      }
      material.needsUpdate = true;
    }
    this[$onUpdate]();
  }

  getAlphaMode(): AlphaMode {
    this[$ensureMaterialIsLoaded]();
    return (this[$getAlphaMode]() as AlphaMode);
  }

  /**
   * PBR Next properties.
   */
  get emissiveStrength(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].emissiveIntensity;
  }

  get clearcoatFactor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].clearcoat;
  }

  get clearcoatRoughnessFactor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].clearcoatRoughness;
  }

  get clearcoatTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$clearcoatTexture];
  }

  get clearcoatRoughnessTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$clearcoatRoughnessTexture];
  }

  get clearcoatNormalTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$clearcoatNormalTexture];
  }

  get clearcoatNormalScale(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].clearcoatNormalScale.x;
  }

  setEmissiveStrength(emissiveStrength: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.emissiveIntensity = emissiveStrength;
    }
    this[$onUpdate]();
  }

  setClearcoatFactor(clearcoatFactor: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.clearcoat = clearcoatFactor;
    }
    this[$onUpdate]();
  }

  setClearcoatRoughnessFactor(clearcoatRoughnessFactor: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.clearcoatRoughness = clearcoatRoughnessFactor;
    }
    this[$onUpdate]();
  }

  setClearcoatNormalScale(clearcoatNormalScale: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.clearcoatNormalScale =
          new Vector2(clearcoatNormalScale, clearcoatNormalScale);
    }
    this[$onUpdate]();
  }
}
