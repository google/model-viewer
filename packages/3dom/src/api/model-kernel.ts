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

import {ConstructedWithArguments, Constructor, Material, Model, PBRMetallicRoughness, ThreeDOMElement, ThreeDOMElementMap} from '../api.js';
import {SerializedElementMap, SerializedMaterial, SerializedModel, SerializedPBRMetallicRoughness, ThreeDOMMessageType} from '../protocol.js';

export interface ModelKernelInterface {
  readonly model: Model;

  mutate(element: ThreeDOMElement, property: string, value: unknown):
      Promise<void>;
  deserialize<T extends keyof ThreeDOMElementMap>(
      type: T, serialized: SerializedElementMap[T]): ThreeDOMElementMap[T];
  getElementsByType<T extends keyof ThreeDOMElementMap>(type: T):
      Array<ThreeDOMElementMap[T]>;
  deactivate(): void;
}

export type ModelKernelConstructor = Constructor<ModelKernelInterface>&
    ConstructedWithArguments<[MessagePort, SerializedModel]>;

export type ModelKernel = InstanceType<ModelKernelConstructor>;

type ElementsByType<T = ThreeDOMElementMap, U extends keyof T = keyof T> =
    Map<U, Set<T[U]>>;

type ModelConstructor = Constructor<Model>&
    ConstructedWithArguments<[ModelKernelInterface, SerializedModel]>;
type MaterialConstructor = Constructor<Material>&
    ConstructedWithArguments<[ModelKernelInterface, SerializedMaterial]>;
type PBRMetallicRoughnessConstructor =
    Constructor<PBRMetallicRoughness>&ConstructedWithArguments<
        [ModelKernelInterface, SerializedPBRMetallicRoughness]>;

/**
 * A constructor factory for a ModelKernel class. The ModelKernel is defined
 * based on a provided implementation for all specified 3DOM scene graph
 * element types.
 *
 * The sole reason for using this factory pattern is to enable sound type
 * checking while also providing for the ability to stringify the factory so
 * that it can be part of a runtime-generated Worker script.
 */
export function defineModelKernel(
    Model: ModelConstructor,
    Material: MaterialConstructor,
    PBRMetallicRoughness: PBRMetallicRoughnessConstructor):
    ModelKernelConstructor {
  const constructorsByType: {
    [K in keyof ThreeDOMElementMap]: Constructor<ThreeDOMElementMap[K]>&
    ConstructedWithArguments<[ModelKernelInterface, SerializedElementMap[K]]>
  } = {
    'model': Model,
    'material': Material,
    'pbr-metallic-roughness': PBRMetallicRoughness
  };

  const $onMessageEvent = Symbol('onMessageEvent');
  const $messageEventHandler = Symbol('messageEventHandler');
  const $port = Symbol('port');
  const $model = Symbol('model');

  const $elementsByLocalId = Symbol('elementsByLocalId');
  const $localIdsByElement = Symbol('localIdsByElement');
  const $elementsByType = Symbol('elementsByType');

  /**
   * A ModelKernel is the core business logic implementation for a distinct
   * Model that has been exposed to a script execution context. The ModelKernel
   * is an internal detail, and should never be explicitly exposed to users of
   * a Model.
   *
   * The ModelKernel primarily handles deserializing scene graph elements, and
   * communicating mutations from the 3DOM execution context to the host
   * execution context where the backing scene graph lives.
   *
   * A ModelKernel also maintains a comprehensive map of elements by type to
   * assist scene graph elements in querying for their contemporaries.
   */
  class ModelKernel implements ModelKernelInterface {
    protected[$elementsByLocalId] = new Map<number, ThreeDOMElement>();
    protected[$localIdsByElement] = new Map<ThreeDOMElement, number>();

    protected[$elementsByType]: ElementsByType = new Map();

    protected[$messageEventHandler] = (event: MessageEvent) =>
        this[$onMessageEvent](event);
    protected[$port]: MessagePort;

    protected[$model]: Model;

    constructor(port: MessagePort, serialized: SerializedModel) {
      const types =
          Object.keys(constructorsByType) as Array<keyof ThreeDOMElementMap>;

      for (const type of types) {
        this[$elementsByType].set(type, new Set());
      }

      this[$port] = port;
      this[$port].addEventListener('message', this[$messageEventHandler]);
      this[$port].start();

      this[$model] = this.deserialize('model', serialized);
    }

    /**
     * The root scene graph element, a Model, that is the entrypoint for the
     * entire scene graph that is backed by this kernel.
     */
    get model() {
      return this[$model];
    }

    /**
     * Mutate a property of a property of a given scene graph element. All
     * direct mutations of the scene graph are considered asynchronous. This
     * method returns a Promise that resolves when the mutation has been
     * successfully applied to the backing scene graph, and rejects if the
     * mutation failed or is otherwise not allowed.
     *
     * TODO: How to enforce allowed mutations?
     * TODO: How to validate values?
     */
    async mutate(element: ThreeDOMElement, property: string, value: unknown):
        Promise<void> {
      if (!this[$localIdsByElement].has(element)) {
        throw new Error('Cannot mutate unknown element');
      }

      const id = this[$localIdsByElement].get(element);

      return new Promise((resolve, _reject) => {
        this[$port].postMessage(
            {type: ThreeDOMMessageType.MUTATE, id, property, value});
        // TODO: Actually wait for confirmation from host context
        resolve();
      });
    }

    /**
     * Deserializes a JSON representation of a scene graph element into a live
     * element that is backed by this ModelKernel.
     *
     * TODO: Update Model arrays for the given element type if needed
     */
    deserialize<T extends keyof ThreeDOMElementMap>(
        type: T, serialized: SerializedElementMap[T]): ThreeDOMElementMap[T] {
      if (!(type in constructorsByType)) {
        throw new Error(`Cannot deserialize unknown type: ${type}`);
      }

      const {id} = serialized;
      const ElementConstructor = constructorsByType[type];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element = new ElementConstructor(this, serialized as any);

      this[$elementsByLocalId].set(id, element);
      this[$localIdsByElement].set(element, id);

      // We know that the all accepted types have been pre-populated in the
      // [$elementsByType] map:
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this[$elementsByType].get(type)!.add(element);

      return element as ThreeDOMElementMap[T];
    }

    /**
     * Look up all scene graph elements given a type string. Type strings
     * are lower-cased, hyphenated versions of the constructor names of their
     * corresponding classes. For example, a query for 'pbr-metallic-roughness'
     * element types will yield the list of PBRMetallicRoughness elements in
     * sparse tree order.
     */
    getElementsByType<T extends keyof ThreeDOMElementMap>(type: T):
        Array<ThreeDOMElementMap[T]> {
      if (!this[$elementsByType].has(type)) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return Array.from(this[$elementsByType].get(type)!) as
          Array<ThreeDOMElementMap[T]>;
    }

    /**
     * Deactivate the ModelKernel. This has the effect of blocking all future
     * mutations to the scene graph. Once deactivated, a ModelKernel cannot be
     * reactivated.
     *
     * The ModelKernel should be deactivated before it is disposed of, or else
     * it will leak in memory.
     */
    deactivate() {
      this[$port].close();
      this[$port].removeEventListener('message', this[$messageEventHandler]);
    }

    /**
     * TODO: Handle future messages from the host execution context
     */
    protected[$onMessageEvent](_event: MessageEvent) {
      // TODO
    }
  }

  return ModelKernel;
}
