import {TextureFilter, Wrapping} from 'three';

export type RGB = [number, number, number];

export type RGBA = [number, number, number, number];

export type Quaternion = [number, number, number, number];

export type Vector3 = [number, number, number];

export type Matrix4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type Extras = any;

// TODO: Document known extensions and update this type
export interface ExtensionDictionary {
  [index: string]: any;
}

export type VariantMapping = {
  material: number; variants: Array<number>;
}

export type VariantMappings = Array<VariantMapping>;

export type Variants = Array<{name: string}>;

export interface PerspectiveCameraIntrinsics {
  aspectRatio?: number;
  yfov: number;
  zfar: number;
  znear: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface OrthographicCameraIntrinsics {
  xmag: number;
  ymag: number;
  zfar: number;
  znear: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export type CameraType = 'perspective'|'orthographic';

export interface PerspectiveCamera {
  name?: string;
  type: 'perspective';
  perspective?: PerspectiveCameraIntrinsics;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface OrthographicCamera {
  name?: string;
  type: 'orthographic';
  orthographic?: OrthographicCamera;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export type Camera = PerspectiveCamera|OrthographicCamera;

export enum Filter {
  Nearest = 9728,
  Linear = 9729,
  NearestMipmapNearest = 9984,
  LinearMipmapNearest = 9985,
  NearestMipmapLinear = 9986,
  LinearMipmapLinear = 9987,
}

export type NearestFilter = Filter.Nearest;
export type LinearFilter = Filter.Linear;
export type NearestMipmapNearestFilter = Filter.NearestMipmapNearest;
export type LinearMipmapNearestFilter = Filter.LinearMipmapNearest;
export type NearestMipmapLinearFilter = Filter.NearestMipmapLinear;
export type LinearMipmapLinearFilter = Filter.LinearMipmapLinear;

export type MagFilter = NearestFilter|LinearFilter|TextureFilter;
export type MinFilter = NearestFilter|LinearFilter|NearestMipmapNearestFilter|
    LinearMipmapNearestFilter|NearestMipmapLinearFilter|
    LinearMipmapLinearFilter|TextureFilter;

export enum Wrap {
  ClampToEdge = 33071,
  MirroredRepeat = 33648,
  Repeat = 10497,
}

export type ClampToEdgeWrap = Wrap.ClampToEdge;
export type MirroredRepeatWrap = Wrap.MirroredRepeat;
export type RepeatWrap = Wrap.Repeat;

export type WrapMode = RepeatWrap|ClampToEdgeWrap|MirroredRepeatWrap|Wrapping;

export interface Sampler {
  name?: string;
  magFilter?: MagFilter;
  minFilter?: MinFilter;
  wrapS?: WrapMode;
  wrapT?: WrapMode;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface Texture {
  name?: string;
  sampler?: number;
  source?: number;
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
  baseColorFactor?: RGBA;
  baseColorTexture?: TextureInfo;
  metallicRoughnessTexture?: TextureInfo;
  metallicFactor?: number;
  roughnessFactor?: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export type AlphaMode = 'OPAQUE'|'MASK'|'BLEND';

export interface Material {
  name?: string;
  doubleSided?: boolean;
  alphaMode?: AlphaMode;
  alphaCutoff?: number;
  emissiveFactor?: RGB;
  pbrMetallicRoughness?: PBRMetallicRoughness;
  normalTexture?: NormalTextureInfo;
  occlusionTexture?: OcclusionTextureInfo;
  emissiveTexture?: TextureInfo;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}
export interface KHRMaterialsVariants {
  mappings: VariantMapping[];
}

export type AttributeDictionary = {
  [index: string]: number;
};

export interface Primitive {
  attributes: AttributeDictionary;
  indices?: number;
  material?: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface Mesh {
  name?: string;
  primitives: Primitive[];
  weights: number[];
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface Node {
  name?: string;
  mesh?: number;
  matrix?: Matrix4;
  rotation?: Quaternion;
  scale?: Vector3;
  translation?: Vector3;
  weights?: number[];
  children?: number[];
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

export interface Scene {
  name?: string;
  nodes: number[];
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export type AccessorType = 'SCALAR'|'VEC2'|'VEC3'|'VEC4'|'MAT2'|'MAT3'|'MAT4';

export interface Accessor {
  name?: string;
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: AccessorType;
  max?: number;
  min?: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;

  // TODO: What is this?
  // @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#accessorsparse
  sparse?: any;
}

export type ChannelTargetPath = 'rotation'|'scale'|'translation'|'weights';

export interface ChannelTarget {
  node: number;
  path: ChannelTargetPath;
}

export interface Channel {
  sampler: number;
  target: ChannelTarget;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export type AnimationInterpolation = 'LINEAR'|'STEP'|'CUBICSPLINE';

export interface AnimationSampler {
  input: number;
  interpolation: AnimationInterpolation;
  output: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface Animation {
  name?: string;
  channels: Channel[];
  samplers: AnimationSampler[];
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

export interface GLTFElementMap {
  'scene': Scene;
  'node': Node;
  'mesh': Mesh;
  'material': Material;
  'image': Image;
  'texture': Texture;
  'texture-info': TextureInfo;
  'sampler': Sampler;
  'accessor': Accessor;
  'camera': Camera;
  'animation': Animation;
  'animation-sampler': AnimationSampler;
  'skin': Skin;
}

export interface Asset {
  version: '2.0';
  copyright?: string;
  generator?: string;
  minVersion?: string;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface GLTF {
  asset: Asset;
  scene?: number;
  scenes?: Scene[];
  nodes?: Node[];
  materials?: Material[];
  accessors?: Accessor[];
  samplers?: Sampler[];
  images?: Image[];
  textures?: Texture[];
  meshes?: Mesh[];
  cameras?: Camera[];
  animations?: Animation[];
  skins?: Skin[];
}
