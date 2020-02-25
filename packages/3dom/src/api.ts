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

/**
 * IMPORTANT NOTE: 3DOM is an experimental / radioactive API. It is very likely
 * to change rapidly over time while we iterate on the design. Please try it out
 * but also keep in mind that things might break without much notice!
 */

/**
 * The set of strings representing all potential capabilities that a 3DOM script
 * may have access to. Possible capabilities include:
 *
 *  - messaging: The ability to communicate between the 3DOM script and its host
 *    context via the Web Messaging API
 *  - fetch: The ability to perform network requests via the Fetch API
 *  - material-properties: The ability to manipulate the properties of materials
 *    found in a model's scene graph
 */
export declare type ThreeDOMCapability =
    'messaging' | 'material-properties' | 'fetch';

/**
 * All constructs in a 3DOM scene graph have a corresponding string name.
 * This is similar in spirit to the concept of a "tag name" in HTML, and exists
 * in support of looking up 3DOM elements by type.
 */
export declare interface ThreeDOMElementMap {
  'model': Model;
  'material': Material;
  'pbr-metallic-roughness': PBRMetallicRoughness;
}

/**
 * The global scope of a 3DOM script is similar to that of a Web Worker.
 * It features a subset of familiar browser-like APIs, as well as references
 * to 3DOM-specific constructs.
 *
 * @see https://html.spec.whatwg.org/multipage/workers.html#the-global-scope
 */
export declare interface ThreeDOMGlobalScope extends Worker {
  /**
   * A reference to the most recently loaded model, if one is available.
   */
  model?: Model;

  /**
   * A mechanism for performing network operations. Note that this method may
   * not be functional unless the corresponding capability is enabled.
   *
   * @see https://fetch.spec.whatwg.org/#fetch-method
   */
  fetch(input: RequestInfo, init: RequestInit): Promise<Response>;

  addEventListener<K extends keyof ThreeDOMEventMap>(
      type: K,
      listener:
          (this: ThreeDOMGlobalScope, event: ThreeDOMEventMap[K]) => unknown,
      options?: boolean|AddEventListenerOptions): void;
  addEventListener(
      type: string, listener: EventListenerOrEventListenerObject,
      options?: boolean|AddEventListenerOptions): void;

  removeEventListener<K extends keyof ThreeDOMEventMap>(
      type: K,
      listener: (this: ThreeDOMGlobalScope, ev: ThreeDOMEventMap[K]) => unknown,
      options?: boolean|EventListenerOptions): void;
  removeEventListener(
      type: string, listener: EventListenerOrEventListenerObject,
      options?: boolean|EventListenerOptions): void;

  /**
   * A reference to Model constructor. Supports instanceof checks; this class is
   * not directly constructable.
   */
  Model: Constructor<Model>;

  /**
   * A reference to Material constructor. Supports instanceof checks; this class
   * is not directly constructable.
   */
  Material: Constructor<Material>;

  /**
   * A reference to PBRMetallicRoughness constructor. Supports instanceof
   * checks; this class is not directly constructable.
   */
  PBRMetallicRoughness: Constructor<PBRMetallicRoughness>;
}

/**
 * All events have a corresponding type string that can be used when adding
 * listeners for them.
 */
export declare interface ThreeDOMEventMap {
  'model-change': ModelChangeEvent;
}

/**
 * A basic element in the 3DOM domain.
 */
export declare interface ThreeDOMElement {
  /**
   * A 3DOM element always has a reference to its Model of provenance unless it
   * is the root of the scene graph (implictly the Model).
   */
  readonly ownerModel?: Model;
}

/**
 * The ModelChangeEvent is dispatched globally whenever a model has loaded and
 * been assigned to the global model property.
 */
export declare interface ModelChangeEvent extends Event {
  /**
   * A reference to the most recently assigned global model
   */
  model: Model;

  /**
   * A reference to the most recently replaced global model. Note that this
   * model is no longer active and may no longer be mutated.
   */
  previousModel?: Model;
}

/**
 * A Model is the root element of a 3DOM scene graph. It gives scripts access
 * to the sub-elements found without the graph.
 */
export declare interface Model extends ThreeDOMElement {
  /**
   * An ordered set of unique Materials found in this model. The Materials are
   * listed in scene graph traversal order.
   */
  readonly materials: Readonly<Material[]>;
}

/**
 * A Material gives the script access to modify a single, unique material found
 * in a model's scene graph.
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-material
 */
export declare interface Material extends ThreeDOMElement {
  /**
   * The name of the material, if any.
   */
  readonly name?: string;

  /**
   * The PBRMetallicRoughness configuration of the material.
   */
  readonly pbrMetallicRoughness: PBRMetallicRoughness;
}

/**
 * The PBRMetallicRoughness encodes the PBR properties of a material
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-pbrmetallicroughness
 */
export declare interface PBRMetallicRoughness extends ThreeDOMElement {
  /**
   * The base color factor of the material, represented as RGBA values
   */
  readonly baseColorFactor: Readonly<RGBA>;

  /**
   * Changes the base color factor of the material to the given value.
   * Requires the 'material-properties' capability to be enabled.
   */
  setBaseColorFactor(rgba: RGBA): Promise<void>;
}

/**
 * A constructor is the class or function that produces an object of a given
 * type when invoked with `new`.
 */
export declare type Constructor<T = object> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T; prototype: T;
};

/**
 * A constructor that accepts a specific set of arguments during construction
 */
export declare type ConstructedWithArguments<T extends unknown[] = unknown[]> =
    {
      new (...args: T): object;
    };

/**
 * An RGBA-encoded color, with channels represented as floating point values
 * from [0,1].
 */
export declare type RGBA = [number, number, number, number];
