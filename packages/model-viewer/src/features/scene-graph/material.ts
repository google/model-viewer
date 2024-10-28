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
const $modelVariants = Symbol('modelVariants');
const $name = Symbol('name');
const $pbrTextures = Symbol('pbrTextures');

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
  public[$variantIndices] = new Set<number>();
  private[$name]?: string;
  readonly[$modelVariants]: Map<string, VariantData>;
  private[$pbrTextures] = new Map<TextureUsage, TextureInfo>();

  get[$backingThreeMaterial](): MeshPhysicalMaterial {
    return (this[$correlatedObjects] as Set<MeshPhysicalMaterial>)
        .values()
        .next()
        .value!;
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
        correlatedMaterials.values().next().value!;

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

    const createTextureInfo = (usage: TextureUsage) => {
      this[$pbrTextures].set(
          usage,
          new TextureInfo(
              onUpdate,
              usage,
              null,
              correlatedMaterials,
              ));
    };

    createTextureInfo(TextureUsage.Clearcoat);
    createTextureInfo(TextureUsage.ClearcoatRoughness);
    createTextureInfo(TextureUsage.ClearcoatNormal);
    createTextureInfo(TextureUsage.SheenColor);
    createTextureInfo(TextureUsage.SheenRoughness);
    createTextureInfo(TextureUsage.Transmission);
    createTextureInfo(TextureUsage.Thickness);
    createTextureInfo(TextureUsage.Specular);
    createTextureInfo(TextureUsage.SpecularColor);
    createTextureInfo(TextureUsage.Iridescence);
    createTextureInfo(TextureUsage.IridescenceThickness);
    createTextureInfo(TextureUsage.Anisotropy);
  }

  async[$getLoadedMaterial](): Promise<MeshPhysicalMaterial|null> {
    if (this[$lazyLoadGLTFInfo] != null) {
      const material = await this[$lazyLoadGLTFInfo]!.doLazyLoad();

      this[$initialize]();
      // Releases lazy load info.
      this[$lazyLoadGLTFInfo] = undefined;
      // Redefines the method as a noop method.
      this.ensureLoaded = async () => {};
      return material as MeshPhysicalMaterial;
    }
    return null;
  }

  private colorFromRgb(rgb: RGB|string): Color {
    const color = new Color();
    if (rgb instanceof Array) {
      color.fromArray(rgb);
    } else {
      color.set(rgb as ColorRepresentation);
    }
    return color;
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
    return (this[$backingThreeMaterial].emissive.toArray() as RGB);
  }

  get index(): number {
    return this[$gltfIndex];
  }

  hasVariant(name: string): boolean {
    const variantData = this[$modelVariants].get(name);
    return variantData != null && this[$variantIndices].has(variantData.index);
  }

  setEmissiveFactor(rgb: RGB|string) {
    this[$ensureMaterialIsLoaded]();
    const color = this.colorFromRgb(rgb);
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
    return this[$backingThreeMaterial].side == DoubleSide;
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

  // KHR_materials_emissive_strength
  get emissiveStrength(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].emissiveIntensity;
  }

  setEmissiveStrength(emissiveStrength: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.emissiveIntensity = emissiveStrength;
    }
    this[$onUpdate]();
  }

  // KHR_materials_clearcoat
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
    return this[$pbrTextures].get(TextureUsage.Clearcoat)!;
  }

  get clearcoatRoughnessTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.ClearcoatRoughness)!;
  }

  get clearcoatNormalTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.ClearcoatNormal)!;
  }

  get clearcoatNormalScale(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].clearcoatNormalScale.x;
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

  // KHR_materials_ior
  get ior(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].ior;
  }

  setIor(ior: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.ior = ior;
    }
    this[$onUpdate]();
  }

  // KHR_materials_sheen
  get sheenColorFactor(): RGB {
    this[$ensureMaterialIsLoaded]();
    return (this[$backingThreeMaterial].sheenColor.toArray() as RGB);
  }
  get sheenColorTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.SheenColor)!;
  }

  get sheenRoughnessFactor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].sheenRoughness;
  }

  get sheenRoughnessTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.SheenRoughness)!;
  }

  setSheenColorFactor(rgb: RGB|string) {
    this[$ensureMaterialIsLoaded]();
    const color = this.colorFromRgb(rgb);
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.sheenColor.set(color);
      // Three.js GLTFExporter checks for internal sheen value.
      material.sheen = 1;
    }
    this[$onUpdate]();
  }

  setSheenRoughnessFactor(roughness: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.sheenRoughness = roughness;
      // Three.js GLTFExporter checks for internal sheen value.
      material.sheen = 1;
    }
    this[$onUpdate]();
  }

  // KHR_materials_transmission
  get transmissionFactor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].transmission;
  }

  get transmissionTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.Transmission)!;
  }

  setTransmissionFactor(transmission: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.transmission = transmission;
    }
    this[$onUpdate]();
  }

  // KHR_materials_volume
  get thicknessFactor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].thickness;
  }

  get thicknessTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.Thickness)!;
  }

  get attenuationDistance(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].attenuationDistance;
  }

  get attenuationColor(): RGB {
    this[$ensureMaterialIsLoaded]();
    return (this[$backingThreeMaterial].attenuationColor.toArray() as RGB);
  }

  setThicknessFactor(thickness: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.thickness = thickness;
    }
    this[$onUpdate]();
  }

  setAttenuationDistance(attenuationDistance: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.attenuationDistance = attenuationDistance;
    }
    this[$onUpdate]();
  }

  setAttenuationColor(rgb: RGB|string) {
    this[$ensureMaterialIsLoaded]();
    const color = this.colorFromRgb(rgb);
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.attenuationColor.set(color);
    }
    this[$onUpdate]();
  }

  // KHR_materials_specular
  get specularFactor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].specularIntensity;
  }

  get specularTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.Specular)!;
  }

  get specularColorFactor(): RGB {
    this[$ensureMaterialIsLoaded]();
    return (this[$backingThreeMaterial].specularColor.toArray() as RGB);
  }

  get specularColorTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.SheenColor)!;
  }

  setSpecularFactor(specularFactor: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.specularIntensity = specularFactor;
    }
    this[$onUpdate]();
  }

  setSpecularColorFactor(rgb: RGB|string) {
    this[$ensureMaterialIsLoaded]();
    const color = this.colorFromRgb(rgb);
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.specularColor.set(color);
    }
    this[$onUpdate]();
  }

  // KHR_materials_iridescence
  get iridescenceFactor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].iridescence;
  }

  get iridescenceTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.Iridescence)!;
  }

  get iridescenceIor(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].iridescenceIOR;
  }

  get iridescenceThicknessMinimum(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].iridescenceThicknessRange[0];
  }

  get iridescenceThicknessMaximum(): number {
    this[$ensureMaterialIsLoaded]();
    return this[$backingThreeMaterial].iridescenceThicknessRange[1];
  }

  get iridescenceThicknessTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.IridescenceThickness)!;
  }

  setIridescenceFactor(iridescence: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.iridescence = iridescence;
    }
    this[$onUpdate]();
  }

  setIridescenceIor(ior: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.iridescenceIOR = ior;
    }
    this[$onUpdate]();
  }

  setIridescenceThicknessMinimum(thicknessMin: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.iridescenceThicknessRange[0] = thicknessMin;
    }
    this[$onUpdate]();
  }

  setIridescenceThicknessMaximum(thicknessMax: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      material.iridescenceThicknessRange[1] = thicknessMax;
    }
    this[$onUpdate]();
  }

  // KHR_materials_anisotropy
  get anisotropyStrength(): number {
    this[$ensureMaterialIsLoaded]();
    return (this[$backingThreeMaterial] as any).anisotropy;
  }

  get anisotropyRotation(): number {
    this[$ensureMaterialIsLoaded]();
    return (this[$backingThreeMaterial] as any).anisotropyRotation;
  }

  get anisotropyTexture(): TextureInfo {
    this[$ensureMaterialIsLoaded]();
    return this[$pbrTextures].get(TextureUsage.Anisotropy)!;
  }

  setAnisotropyStrength(strength: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      (material as any).anisotropy = strength;
    }
    this[$onUpdate]();
  }

  setAnisotropyRotation(rotation: number) {
    this[$ensureMaterialIsLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshPhysicalMaterial>) {
      (material as any).anisotropyRotation = rotation;
    }
    this[$onUpdate]();
  }
}
