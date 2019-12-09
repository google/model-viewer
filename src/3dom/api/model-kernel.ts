/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {Constructor, Material, Mesh, Model, Node, PBRMetallicRoughness, Primitive, Scene, ThreeDOMElement, ThreeDOMElementMap} from '../api.js';
import {SerializedElementMap, SerializedModelGraph, ThreeDOMMessageType} from '../protocol.js';

export interface ModelKernel {
  readonly model: Model;

  mutate(element: ThreeDOMElement, property: string, value: any): Promise<void>;
  deserialize<T extends keyof ThreeDOMElementMap>(
      type: T, serialized: SerializedElementMap[T]): ThreeDOMElementMap[T]
  getElementsByType<T extends keyof ThreeDOMElementMap>(type: T):
      Array<ThreeDOMElementMap[T]>;
}

export type ModelKernelInterface = ModelKernel;

type ElementsByType<T = ThreeDOMElementMap, U extends keyof T = keyof T> =
    Map<U, Set<T[U]>>;

export function defineModelKernel(
    ModelGraph: Constructor<Model>,
    Scene: Constructor<Scene>,
    Node: Constructor<Node>,
    Mesh: Constructor<Mesh>,
    Primitive: Constructor<Primitive>,
    Material: Constructor<Material>,
    PBRMetallicRoughness: Constructor<PBRMetallicRoughness>):
    Constructor<ModelKernelInterface> {
  const constructorsByType:
      {[K in keyof ThreeDOMElementMap]: Constructor<ThreeDOMElementMap[K]>} = {
        'model-graph': ModelGraph,
        'scene': Scene,
        'node': Node,
        'mesh': Mesh,
        'material': Material,
        'primitive': Primitive,
        'pbr-metallic-roughness': PBRMetallicRoughness
      };

  const $onMessageEvent = Symbol('onMessageEvent');
  const $messageEventHandler = Symbol('messageEventHandler');
  const $port = Symbol('port');
  const $model = Symbol('model');

  const $elementsByLocalId = Symbol('elementsByLocalId');
  const $localIdsByElement = Symbol('localIdsByElement');
  const $elementsByType = Symbol('elementsByType');

  class ModelKernel implements ModelKernelInterface {
    protected[$elementsByLocalId] = new Map<number, ThreeDOMElement>();
    protected[$localIdsByElement] = new Map<ThreeDOMElement, number>();

    protected[$elementsByType]: ElementsByType = new Map();

    protected[$messageEventHandler] = (event: MessageEvent) =>
        this[$onMessageEvent](event);
    protected[$port]: MessagePort;

    protected[$model]: Model;

    constructor(port: MessagePort, serialized: SerializedModelGraph) {
      for (const type in constructorsByType) {
        this[$elementsByType].set(type as keyof ThreeDOMElementMap, new Set());
      }

      this[$port] = port;
      this[$port].addEventListener('message', this[$messageEventHandler]);
      this[$port].start();

      this[$model] = new ModelGraph(this, serialized);
    }

    get model() {
      return this[$model];
    }

    async mutate(element: ThreeDOMElement, property: string, value: any):
        Promise<void> {
      if (!this[$localIdsByElement].has(element)) {
        throw new Error('Cannot mutate unknown element');
      }

      const id = this[$localIdsByElement].get(element);

      return new Promise((resolve, _reject) => {
        this[$port].postMessage(
            {type: ThreeDOMMessageType.MUTATE, id, property, value});
        resolve();  // TODO
      });
    }

    deserialize<T extends keyof ThreeDOMElementMap>(
        type: T, serialized: SerializedElementMap[T]): ThreeDOMElementMap[T] {
      if (!(type in constructorsByType)) {
        throw new Error(`Cannot deserialize unknown type: ${type}`);
      }

      const {id} = serialized;
      const ElementConstructor = constructorsByType[type];
      const element = new ElementConstructor(this, serialized);

      this[$elementsByLocalId].set(id, element);
      this[$localIdsByElement].set(element, id);

      this[$elementsByType].get(type)!.add(element);

      return element as ThreeDOMElementMap[T];
    }

    getElementsByType<T extends keyof ThreeDOMElementMap>(type: T):
        Array<ThreeDOMElementMap[T]> {
      if (!this[$elementsByType].has(type)) {
        return [];
      }

      return Array.from(this[$elementsByType].get(type)!) as
          Array<ThreeDOMElementMap[T]>;
    }

    protected[$onMessageEvent](_event: MessageEvent) {
    }
  }

  return ModelKernel;
}