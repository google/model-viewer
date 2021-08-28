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
import {ALPHA_CUTOFF_BLEND, ALPHA_CUTOFF_OPAQUE} from '../../three-components/gltf-instance/ModelViewerGLTFInstance.js';

import {Material as MaterialInterface} from './api.js';
import {LazyLoader} from './model.js';
import {PBRMetallicRoughness} from './pbr-metallic-roughness.js';
import {TextureInfo, TextureUsage} from './texture-info.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';



const $pbrMetallicRoughness = Symbol('pbrMetallicRoughness');
const $normalTexture = Symbol('normalTexture');
const $occlusionTexture = Symbol('occlusionTexture');
const $emissiveTexture = Symbol('emissiveTexture');
const $backingThreeMaterial = Symbol('backingThreeMaterial');
const $applyAlphaCutoff = Symbol('applyAlphaCutoff');
const $lazyLoadGLTFInfo = Symbol('lazyLoadGLTFInfo');
const $initialize = Symbol('initialize');
export const $ensureLoaded = Symbol('ensureLoaded');

export enum MaterialLoadMethod {
  Immediate,
  Lazy
}

/**
 * Material facade implementation for Three.js materials
 */
export class Material extends ThreeDOMElement implements MaterialInterface {
  private[$pbrMetallicRoughness]: PBRMetallicRoughness;
  private[$normalTexture]: TextureInfo;
  private[$occlusionTexture]: TextureInfo;
  private[$emissiveTexture]: TextureInfo;
  private[$lazyLoadGLTFInfo]: LazyLoader|undefined;

  get[$backingThreeMaterial](): MeshStandardMaterial {
    return (this[$correlatedObjects] as Set<MeshStandardMaterial>)
        .values()
        .next()
        .value;
  }

  constructor(
      onUpdate: () => void, gltf: GLTF, gltfMaterial: GLTFMaterial,
      correlatedMaterials: Set<MeshStandardMaterial>,
      lazyLoadInfo: LazyLoader|undefined = undefined) {
    super(onUpdate, gltfMaterial, correlatedMaterials);
    if (lazyLoadInfo === undefined) {
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

  async[$ensureLoaded](): Promise<MeshStandardMaterial> {
    if (this[$lazyLoadGLTFInfo] !== undefined) {
      const {set, material} = await this[$lazyLoadGLTFInfo]!.doLazyLoad();

      // Fills in the missing data.
      this[$correlatedObjects] = set as Set<MeshStandardMaterial>;

      this[$initialize](this[$lazyLoadGLTFInfo]!.gltf);
      // Releases lazy load info.
      this[$lazyLoadGLTFInfo] = undefined;
      return material as MeshStandardMaterial;
    }
    return this[$correlatedObjects]!.values().next().value;
  }

  get name(): string {
    return (this[$sourceObject] as any).name || '';
  }

  get pbrMetallicRoughness(): PBRMetallicRoughness {
    this[$ensureLoaded]();
    return this[$pbrMetallicRoughness];
  }

  get normalTexture(): TextureInfo {
    this[$ensureLoaded]();
    return this[$normalTexture];
  }

  get occlusionTexture(): TextureInfo {
    this[$ensureLoaded]();
    return this[$occlusionTexture];
  }

  get emissiveTexture(): TextureInfo {
    this[$ensureLoaded]();
    return this[$emissiveTexture];
  }

  get emissiveFactor(): RGB {
    this[$ensureLoaded]();
    return (this[$sourceObject] as DefaultedMaterial).emissiveFactor;
  }

  setEmissiveFactor(rgb: RGB) {
    this[$ensureLoaded]();
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      material.emissive.fromArray(rgb);
    }
    (this[$sourceObject] as DefaultedMaterial).emissiveFactor = rgb;
    this[$onUpdate]();
  }

  [$applyAlphaCutoff]() {
    this[$ensureLoaded]();
    const gltfMaterial = this[$sourceObject] as DefaultedMaterial;
    // 0.0001 is the minimum in order to keep from using zero, which disables
    // masking in three.js. It's also small enough to be less than the smallest
    // normalized 8-bit value.
    const cutoff = gltfMaterial.alphaMode === 'OPAQUE' ?
        ALPHA_CUTOFF_OPAQUE :
        (gltfMaterial.alphaMode === 'BLEND' ?
             ALPHA_CUTOFF_BLEND :
             Math.max(0.0001, Math.min(1.0, gltfMaterial.alphaCutoff)));
    for (const material of this[$correlatedObjects] as
         Set<MeshStandardMaterial>) {
      material.alphaTest = cutoff;
      material.needsUpdate = true;
    }
  }

  setAlphaCutoff(cutoff: number): void {
    this[$ensureLoaded]();
    (this[$sourceObject] as DefaultedMaterial).alphaCutoff = cutoff;
    this[$applyAlphaCutoff]();
    this[$onUpdate]();
  }

  getAlphaCutoff(): number {
    this[$ensureLoaded]();
    return (this[$sourceObject] as DefaultedMaterial).alphaCutoff;
  }

  setDoubleSided(doubleSided: boolean): void {
    this[$ensureLoaded]();
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
    this[$ensureLoaded]();
    return (this[$sourceObject] as DefaultedMaterial).doubleSided;
  }

  setAlphaMode(alphaMode: AlphaMode): void {
    this[$ensureLoaded]();
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
    this[$ensureLoaded]();
    return (this[$sourceObject] as DefaultedMaterial).alphaMode;
  }
}
