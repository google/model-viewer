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

export type Extras = unknown;

// TODO: Document known extensions and update this type
export type ExtensionDictionary = {
  [index: string]: unknown;
};

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

export interface TextureInfo {
  index: number;
  texCoord?: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
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
  emissiveFactor?: number;
  pbrMetallicRoughness?: PBRMetallicRoughness;
  normalTexture?: TextureInfo;
  occlusionTexture?: TextureInfo;
  emissiveTexture?: TextureInfo;
  extensions?: ExtensionDictionary;
  extras?: Extras;
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

export interface Texture {
  name?: string;
  source?: number;
  sampler?: number;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface ExternalImage {
  name?: string;
  url: string;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export interface EmbeddedImage {
  name?: string;
  bufferView: number;
  mimeType: string;
  extensions?: ExtensionDictionary;
  extras?: Extras;
}

export type Image = ExternalImage|EmbeddedImage;

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
  sparse?: unknown;
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

export type GLTFElement = Scene|Node|Mesh|Material|Image|Texture|
    PBRMetallicRoughness|Accessor|Camera|Animation;

export type GLTFStructure = PBRMetallicRoughness|Primitive;

export interface GLTFElementMap {
  'scene': Scene;
  'node': Node;
  'mesh': Mesh;
  'material': Material;
  'image': Image;
  'camera': Camera;
  'texture': Texture;
  'accessor': Accessor;
  'animation': Animation;
}

export interface GLTF {
  scene: number;
  scenes: Scene[];
  nodes: Node[];
  materials: Material[];
  accessors: Accessor[];
  images: Image[];
  textures: Texture[];
  meshes: Mesh[];
  cameras: Camera[];
  animations: Animation[];
}
