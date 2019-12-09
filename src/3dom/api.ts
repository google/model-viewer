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

export declare type ThreeDOMCapability = 'messaging' | 'material-properties';

export declare interface ThreeDOMElementMap {
  'model-graph': Model;
  'scene': Scene;
  'node': Node;
  'mesh': Mesh;
  'primitive': Primitive;
  'material': Material;
  'pbr-metallic-roughness': PBRMetallicRoughness;
}

export declare interface ThreeDOMGlobalScope extends Worker {
  model?: Model;

  fetch(input: RequestInfo, init: RequestInit): Promise<Response>;

  addEventListener<K extends keyof ThreeDOMEventMap>(
      type: K,
      listener: (this: ThreeDOMGlobalScope, event: ThreeDOMEventMap[K]) => any,
      options?: boolean|AddEventListenerOptions): void;
  addEventListener(
      type: string, listener: EventListenerOrEventListenerObject,
      options?: boolean|AddEventListenerOptions): void;

  removeEventListener<K extends keyof ThreeDOMEventMap>(
      type: K,
      listener: (this: ThreeDOMGlobalScope, ev: ThreeDOMEventMap[K]) => any,
      options?: boolean|EventListenerOptions): void;
  removeEventListener(
      type: string, listener: EventListenerOrEventListenerObject,
      options?: boolean|EventListenerOptions): void;

  Model: Constructor<Model>;
  Scene: Constructor<Scene>;
  Node: Constructor<Node>;
  Mesh: Constructor<Mesh>;
  Primitive: Constructor<Primitive>;
  Material: Constructor<Material>;
  PBRMetallicRoughness: Constructor<PBRMetallicRoughness>;
}

export declare interface ThreeDOMEventMap {
  'model-change': ModelChangeEvent;
}

export declare interface ThreeDOMElement {
  readonly ownerModel: Model;
}

export declare interface ModelChangeEvent extends Event {
  model: Model
  previousModel?: Model;
}

export declare interface Model extends ThreeDOMElement {
  readonly scene: Scene;
  readonly materials: Readonly<Array<Material>>;
  readonly nodes: Readonly<Array<Node>>;
}

export declare interface Scene extends ThreeDOMElement {
  readonly name?: string;
  readonly nodes: Readonly<Array<Node>>;
}

export declare interface Node extends ThreeDOMElement {
  readonly name?: string;
  readonly mesh?: Mesh;
  readonly children: Readonly<Array<Node>>;
}

export declare interface Mesh extends ThreeDOMElement {
  readonly name?: string;
  readonly primitives: Readonly<Array<Primitive>>;
}

export declare interface Primitive extends ThreeDOMElement {
  readonly name?: string;
  readonly material?: Material;
}

export declare interface Material extends ThreeDOMElement {
  readonly name?: string;
  readonly pbrMetallicRoughness: PBRMetallicRoughness;
}

export declare interface PBRMetallicRoughness extends ThreeDOMElement {
  readonly baseColorFactor: Readonly<RGBA>;
  setBaseColorFactor(rgba: RGBA): Promise<void>;
}

export declare type Constructor<T = object> = {
  new (...args: any[]): T,
  prototype: T
};

export declare type RGBA = [number, number, number, number];
