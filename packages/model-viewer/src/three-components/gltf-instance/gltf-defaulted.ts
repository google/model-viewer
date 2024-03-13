import {Vector2} from 'three';

import {Accessor, AlphaMode, AnimationSampler, Asset, Camera, ExtensionDictionary, Extras, MagFilter, Mesh, MinFilter, RGB, RGBA, Scene, WrapMode} from './gltf-2.0.js';


export interface Sampler {
  name?: string;
  magFilter: MagFilter;
  minFilter: MinFilter;
  wrapS: WrapMode;
  wrapT: WrapMode;
  extensions?: ExtensionDictionary;
  extras?: Extras;
  rotation: number;
  repeat: Vector2;
  offset: Vector2;
}

export interface Texture {
  name?: string;
  sampler: number;
  source: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface TextureInfo {
  index: number;
  texCoord?: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface OcclusionTextureInfo extends TextureInfo {
  strength?: number;
}

export interface NormalTextureInfo extends TextureInfo {
  scale?: number;
}

export interface PBRMetallicRoughness {
  baseColorFactor: RGBA;
  baseColorTexture?: TextureInfo;
  metallicRoughnessTexture?: TextureInfo;
  metallicFactor: number;
  roughnessFactor: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface Material {
  name?: string;
  doubleSided: boolean;
  alphaMode: AlphaMode;
  alphaCutoff: number;
  emissiveFactor: RGB;
  pbrMetallicRoughness: PBRMetallicRoughness;
  normalTexture?: NormalTextureInfo;
  occlusionTexture?: OcclusionTextureInfo;
  emissiveTexture?: TextureInfo;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface Image {
  name?: string;
  uri?: string;
  bufferView?: number;
  mimeType?: string;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface Skin {
  inverseBindMatrices?: number;
  skeleton?: number;
  joints: number[];
  name?: string;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export type GLTFElement =
    Scene|Node|Mesh|Material|Image|Texture|TextureInfo|Sampler|
    PBRMetallicRoughness|Accessor|Camera|Animation|AnimationSampler|Skin;

export interface GLTF {
  asset: Asset;
  scene: number;
  scenes: Scene[];
  nodes?: Node[];
  materials: Material[];
  accessors?: Accessor[];
  samplers?: Sampler[];
  images?: Image[];
  textures?: Texture[];
  meshes?: Mesh[];
  cameras?: Camera[];
  animations?: Animation[];
  skins?: Skin[];
}
