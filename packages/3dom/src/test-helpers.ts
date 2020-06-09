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

import {EventDispatcher, Group} from 'three';
import {GLTF as ThreeGLTF, GLTFLoader, GLTFParser} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {Image, Material, Model, PBRMetallicRoughness, RGBA, Sampler, Texture, TextureInfo, ThreeDOMElement, ThreeDOMElementMap} from './api.js';
import {ModelKernel} from './api/model-kernel.js';
import {MagFilter, MinFilter, WrapMode} from './gltf-2.0.js';
import {SerializedElementMap, SerializedImage, SerializedMaterial, SerializedModel, SerializedPBRMetallicRoughness, SerializedSampler} from './protocol.js';

export class FakePBRMetallicRoughness implements PBRMetallicRoughness {
  readonly baseColorFactor: RGBA = [0, 0, 0, 1];
  private static count = 0;

  readonly baseColorTexture = null;
  readonly metallicRoughnessTexture = null;

  constructor(
      private kernel: ModelKernel, _serialized: SerializedPBRMetallicRoughness,
      readonly name = `fake-pbr-metallic-roughness-${
          FakePBRMetallicRoughness.count++}`) {
  }

  get ownerModel() {
    return this.kernel.model;
  }

  setBaseColorFactor(_value: RGBA) {
    return Promise.resolve();
  }
}

export class FakeThreeDOMElement implements ThreeDOMElement {}

export class FakeMaterial extends FakeThreeDOMElement implements Material {
  readonly pbrMetallicRoughness = new FakePBRMetallicRoughness(
      this.kernel, this.serialized.pbrMetallicRoughness);

  readonly normalTexture = null;
  readonly occlusionTexture = null;
  readonly emissiveTexture = null;

  private static count = 0;

  constructor(
      private kernel: ModelKernel, private serialized: SerializedMaterial,
      readonly name = `fake-material-${FakeMaterial.count++}`) {
    super();
  }

  get ownerModel() {
    return this.kernel.model;
  }
}

export class FakeModel extends FakeThreeDOMElement implements Model {
  readonly materials: Readonly<Array<Material>>;
  private static count = 0;

  constructor(
      kernel: ModelKernel, serialized: SerializedModel,
      readonly name = `fake-model-${FakeModel.count++}`) {
    super();
    const materials: Material[] = [];
    for (const material of serialized.materials) {
      materials.push(new FakeMaterial(kernel, material));
    }
    this.materials = Object.freeze(materials);
  }
}

export class FakeImage extends FakeThreeDOMElement implements Image {
  private static count = 0;
  uri: string|null = null;

  get type() {
    return this.uri ? 'external' : 'embedded';
  }

  constructor(
      _kernel: ModelKernel, _serialized: SerializedImage,
      readonly name = `fake-image-${FakeImage.count++}`) {
    super();
  }

  async setURI(uri: string): Promise<void> {
    this.uri = uri;
  }
}

export class FakeSampler extends FakeThreeDOMElement implements Sampler {
  private static count = 0;

  minFilter: MinFilter|null = null;
  magFilter: MagFilter|null = null;
  wrapS: WrapMode = 10497;
  wrapT: WrapMode = 10497;

  constructor(
      _kernel: ModelKernel, serialized: SerializedSampler,
      readonly name = serialized.name || `fake-image-${FakeSampler.count++}`) {
    super();
  }

  async setMinFilter(filter: 9728|9729|9984|9985|9986|9987|
                     null): Promise<void> {
    this.minFilter = filter;
  }

  async setMagFilter(filter: 9728|9729|null): Promise<void> {
    this.magFilter = filter;
  }

  async setWrapS(mode: WrapMode): Promise<void> {
    this.wrapS = mode;
  }

  async setWrapT(mode: WrapMode): Promise<void> {
    this.wrapT = mode;
  }
}

export class FakeTexture extends FakeThreeDOMElement implements Texture {
  sampler: Sampler|null = null;
  source: Image|null = null;

  async setSampler(sampler: Sampler): Promise<void> {
    this.sampler = sampler;
  }

  async setSource(image: Image): Promise<void> {
    this.source = image;
  }
}

export class FakeTextureInfo extends FakeThreeDOMElement implements
    TextureInfo {
  texture: Texture|null = null;

  async setTexture(texture: Texture|null): Promise<void> {
    this.texture = texture;
  }
}

export const FakeThreeDOMElementMap = {
  'model': FakeModel,
  'material': FakeMaterial,
  'pbr-metallic-roughness': FakePBRMetallicRoughness,
  'image': FakeImage,
  'sampler': FakeSampler,
  'texture': FakeTexture,
  'texture-info': FakeTextureInfo
};

export class FakeModelKernel implements ModelKernel {
  readonly model: Model = {} as unknown as Model;

  async mutate(_element: ThreeDOMElement, _property: string, _value: unknown):
      Promise<void> {
    return Promise.resolve();
  }
  deserialize<T extends keyof ThreeDOMElementMap>(
      type: T, serialized: SerializedElementMap[T]): ThreeDOMElementMap[T] {
    const ElementConstructor = FakeThreeDOMElementMap[type];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = new ElementConstructor(this, serialized as any);

    return element as unknown as ThreeDOMElementMap[T];
  }
  getElementsByType<T extends keyof ThreeDOMElementMap>(_type: T):
      Array<ThreeDOMElementMap[T]> {
    return [];
  }
  deactivate(): void {
    // Noop
  }
}

export const assetPath = (asset: string) => `./base/shared-assets/${asset}`;

export const loadThreeGLTF = (url: string): Promise<ThreeGLTF> => {
  const loader = new GLTFLoader();
  return new Promise<ThreeGLTF>((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
};

export const createFakeThreeGLTF = () => {
  const scene = new Group();

  return {
    animations: [],
    scene,
    scenes: [scene],
    cameras: [],
    asset: {},
    parser: {
      cache: new Map(),
      associations: new Map(),
      json: {scene: 0, scenes: [{}], materials: [], nodes: []}
    } as unknown as GLTFParser,
    userData: {}
  };
};

export type AnyEvent = Event|CustomEvent<unknown>|{[index: string]: string};
export type PredicateFunction<T = void> = (value: T) => boolean;

/**
 * Adapted from ../../model-viewer/src/test/helpers.ts
 */
export const waitForEvent = <T extends AnyEvent = Event>(
    target: EventTarget|EventDispatcher,
    eventName: string,
    predicate: PredicateFunction<T>|null = null): Promise<T> =>
    new Promise((resolve) => {
      function handler(event: AnyEvent) {
        if (!predicate || predicate(event as T)) {
          resolve(event as T);
          target.removeEventListener(eventName, handler);
        }
      }
      target.addEventListener(eventName, handler);
    });
