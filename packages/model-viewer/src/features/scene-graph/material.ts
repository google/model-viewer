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

import {DoubleSide, FrontSide, MeshStandardMaterial} from 'three';

import {AlphaMode, GLTF, Material as GLTFMaterial, RGB} from '../../three-components/gltf-instance/gltf-2.0.js';
import {Material as DefaultedMaterial} from '../../three-components/gltf-instance/gltf-defaulted.js';

import {Material as MaterialInterface} from './api.js';
import {LazyLoader, VariantData} from './model.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo, TextureUsage} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');
const $backingThreeMaterial = Symbol('backingThreeMaterial');
const $applyAlphaCutoff = Symbol('applyAlphaCutoff');
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

/**
 * Material facade implementation for Three.js materials
 */
export class Material extends ThreeDOMElement implements MaterialInterface {
  private[$pbrMetallicRoughness]: PBRMetallicRoughness;
  private[$normalTexture]: TextureInfo;
  private[$occlusionTexture]: TextureInfo;
  private[$emissiveTexture]: TextureInfo;
  private[$lazyLoadGLTFInfo]?: LazyLoader;
  private[$gltfIndex]: number;
  private[$isActive]: boolean;
  private[$variantSet] = new Set<number>();
  readonly[$modelVariants]: Map<string, VariantData>;

  get[$backingThreeMaterial](): MeshStandardMaterial {
    return (this[$correlatedObjects] as Set<MeshStandardMaterial>)
        .values()
        .next()
        .value;
  }

  constructor(
      onUpdate: () => void, gltf: GLTF, gltfMaterial: GLTFMaterial,
      gltfIndex: number, isActive: boolean,
      modelVariants: Map<string, VariantData>,
      correlatedMaterials: Set<MeshStandardMaterial>,
      lazyLoadInfo: LazyLoader|undefined = undefined) {
    super(onUpdate, gltfMaterial, correlatedMaterials);
    this[$gltfIndex] = gltfIndex;
    this[$isActive] = isActive;
    this[$modelVariants] = modelVariants;

    if (lazyLoadInfo == null) {
      this[$initialize](gltf);
    } else {
      this[$lazyLoadGLTFInfo] = lazyLoadInfo;
    }
  }

  private[$initialize](gltf: GLTF): void {
    const onUpdate = this[$onUpdate] as () => void;
    const gltfMaterial = this[$sourceObject] as GLTFMaterial;
    const correlatedMaterials =
        this[$correlatedObjects] as Set<MeshStandardMaterial>;

    if (gltfMaterial.extensions &&
        gltfMaterial.extensions['KHR_materials_pbrSpecularGlossiness']) {
      console.warn(`Material ${gltfMaterial.name} uses a deprecated extension
          "KHR_materials_pbrSpecularGlossiness", please use
          "pbrMetallicRoughness" instead. Specular Glossiness materials are
          currently supported for rendering, but not for our scene-graph API,
          nor for auto-generation of USDZ for Quick Look.`);
    }

    if (gltfMaterial.pbrMetallicRoughness == null) {
      gltfMaterial.pbrMetallicRoughness = {};
    }
    this[$pbrMetallicRoughness] = new PBRMetallicRoughness(
        onUpdate, gltf, gltfMaterial.pbrMetallicRoughness, correlatedMaterials);

    if (gltfMaterial.emissiveFactor == null) {
      gltfMaterial.emissiveFactor = [0, 0, 0];
    }

    if (gltfMaterial.doubleSided == null) {
      gltfMaterial.doubleSided = false;
    }

    if (gltfMaterial.alphaMode == null) {
      gltfMaterial.alphaMode = 'OPAQUE';
    }

    if (gltfMaterial.alphaCutoff == null) {
      gltfMaterial.alphaCutoff = 0.5;
    }

    const {
      normalTexture: gltfNormalTexture,
      occlusionTexture: gltfOcculsionTexture,
      emissiveTexture: gltfEmissiveTexture
    } = gltfMaterial;

    const {normalMap, aoMap, emissiveMap} =
        correlatedMaterials.values().next().value;

    this[$normalTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Normal,
        normalMap,
        correlatedMaterials,
        gltf,
        gltfNormalTexture ? gltfNormalTexture : null,
    );

    this[$occlusionTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Occlusion,
        aoMap,
        correlatedMaterials,
        gltf,
        gltfOcculsionTexture ? gltfOcculsionTexture : null,
    );

    this[$emissiveTexture] = new TextureInfo(
        onUpdate,
        TextureUsage.Emissive,
        emissiveMap,
        correlatedMaterials,
        gltf,
        gltfEmissiveTexture ? gltfEmissiveTexture : null,
    );
  }

  async[$getLoadedMaterial](): Promise<MeshStandardMaterial> {
    if (this[$lazyLoadGLTFInfo] != null) {
      const {set, material} = await this[$lazyLoadGLTFInfo]!.doLazyLoad();

      // Fills in the missing data.
      this[$correlatedObjects] = set as Set<MeshStandardMaterial>;

      this[$initialize](this[$lazyLoadGLTFInfo]!.gltf);
      // Releases lazy load info.
      this[$lazyLoadGLTFInfo] = undefined;
      // Redefines the method as a noop method.
      this.ensureLoaded = async () => {};
      return material as MeshStandardMaterial;
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
    return (this[$sourceObject] as Material).name;
  }

  set name(name: string) {
    const sourceMaterial = (this[$sourceObject] as Material);
    if (sourceMaterial != null) {
      sourceMaterial.name = name;
    }

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
    return (this[$sourceObject] as DefaultedMaterial).emissiveFactor;
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

  setEmissiveFactor(rgb: RGB) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      material.emissive.fromArray(rgb);
    }
    (this[$sourceObject] as DefaultedMaterial).emissiveFactor = rgb;
    this[$onUpdate]();
  }

  [$applyAlphaCutoff]() {
    this[$ensureMaterialIsLoaded]();
    const gltfMaterial = this[$sourceObject] as DefaultedMaterial;
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      if ((this[$sourceObject] as DefaultedMaterial).alphaMode === 'MASK') {
        material.alphaTest = gltfMaterial.alphaCutoff;
      } else {
        (material.alphaTest as number | undefined) = undefined;
      }

      material.needsUpdate = true;
    }
  }

  setAlphaCutoff(cutoff: number): void {
    this[$ensureMaterialIsLoaded]();
    (this[$sourceObject] as DefaultedMaterial).alphaCutoff = cutoff;
    this[$applyAlphaCutoff]();
    this[$onUpdate]();
  }

  getAlphaCutoff(): number {
    this[$ensureMaterialIsLoaded]();
    return (this[$sourceObject] as DefaultedMaterial).alphaCutoff;
  }

  setDoubleSided(doubleSided: boolean): void {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      // When double-sided is disabled gltf spec dictates that Back-Face culling
      // must be disabled, in three.js parlance that would mean FrontSide
      // rendering only.
      // https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#double-sided
      material.side = doubleSided ? DoubleSide : FrontSide;
      material.needsUpdate = true;
    }
    (this[$sourceObject] as DefaultedMaterial).doubleSided = doubleSided;
    this[$onUpdate]();
  }

  getDoubleSided(): boolean {
    this[$ensureMaterialIsLoaded]();
    return (this[$sourceObject] as DefaultedMaterial).doubleSided;
  }

  setAlphaMode(alphaMode: AlphaMode): void {
    this[$ensureMaterialIsLoaded]();
    const enableTransparency =
        (material: MeshStandardMaterial, enabled: boolean): void => {
          material.transparent = enabled;
          material.depthWrite = !enabled;
        };

    (this[$sourceObject] as DefaultedMaterial).alphaMode = alphaMode;

    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      enableTransparency(material, alphaMode !== 'OPAQUE');
      this[$applyAlphaCutoff]();
      material.needsUpdate = true;
    }

    this[$onUpdate]();
  }

  getAlphaMode(): AlphaMode {
    this[$ensureMaterialIsLoaded]();
    return (this[$sourceObject] as DefaultedMaterial).alphaMode;
  }
}
