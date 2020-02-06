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

import {EventDispatcher, Scene} from 'three';
import {GLTFParser} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {Material, Model, PBRMetallicRoughness, RGBA, ThreeDOMElement, ThreeDOMElementMap} from './api.js';
import {ModelKernel} from './api/model-kernel.js';
import {SerializedElementMap, SerializedMaterial, SerializedModel, SerializedPBRMetallicRoughness} from './protocol.js';

export class FakePBRMetallicRoughness implements PBRMetallicRoughness {
  readonly baseColorFactor: RGBA = [0, 0, 0, 1];
  private static count = 0;

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

export class FakeMaterial implements Material {
  readonly pbrMetallicRoughness = new FakePBRMetallicRoughness(
      this.kernel, this.serialized.pbrMetallicRoughness);

  private static count = 0;

  constructor(
      private kernel: ModelKernel, private serialized: SerializedMaterial,
      readonly name = `fake-material-${FakeMaterial.count++}`) {
  }

  get ownerModel() {
    return this.kernel.model;
  }
}

export class FakeModel implements Model {
  readonly materials: Readonly<Array<Material>>;
  private static count = 0;

  constructor(
      kernel: ModelKernel, serialized: SerializedModel,
      readonly name = `fake-model-${FakeModel.count++}`) {
    const materials: Material[] = [];
    for (const material of serialized.materials) {
      materials.push(new FakeMaterial(kernel, material));
    }
    this.materials = Object.freeze(materials);
  }
}

export const FakeThreeDOMElementMap = {
  'model': FakeModel,
  'material': FakeMaterial,
  'pbr-metallic-roughness': FakePBRMetallicRoughness
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

export const createFakeGLTF = () => {
  const scene = new Scene();

  return {
    animations: [],
    scene,
    scenes: [scene],
    cameras: [],
    asset: {},
    parser: {} as unknown as GLTFParser,
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
