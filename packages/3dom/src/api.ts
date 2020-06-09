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
import {MagFilter, MinFilter, WrapMode} from './gltf-2.0.js';

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
    'messaging' | 'material-properties' | 'textures' | 'fetch';

/**
 * All constructs in a 3DOM scene graph have a corresponding string name.
 * This is similar in spirit to the concept of a "tag name" in HTML, and exists
 * in support of looking up 3DOM elements by type.
 */
export declare interface ThreeDOMElementMap {
  'model': Model;
  'material': Material;
  'pbr-metallic-roughness': PBRMetallicRoughness;
  'sampler': Sampler;
  'image': Image;
  'texture': Texture;
  'texture-info': TextureInfo;
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

  /**
   * A reference to the Sampler constructor. Supports instanceof checks; this
   * class is not directly constructable.
   */
  Sampler: Constructor<Sampler>;

  /**
   * A reference to the TextureInfo constructor. Supports instanceof checks;
   * this class is not directly constructable.
   */
  TextureInfo: Constructor<Sampler>;

  /**
   * A reference to the Texture constructor. Supports instanceof checks; this
   * class is not directly constructable.
   */
  Texture: Constructor<Texture>;

  /**
   * A reference to the Image constructor. Supports instanceof checks; this
   * class is not directly constructable.
   */
  Image: Constructor<Image>;
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

  readonly normalTexture: TextureInfo|null;
  readonly occlusionTexture: TextureInfo|null;
  readonly emissiveTexture: TextureInfo|null;

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
   * A texture reference, associating an image with color information and
   * a sampler for describing base color factor for a UV coordinate space.
   */
  readonly baseColorTexture: TextureInfo|null;

  /**
   * A texture reference, associating an image with color information and
   * a sampler for describing metalness (B channel) and roughness (G channel)
   * for a UV coordinate space.
   */
  readonly metallicRoughnessTexture: TextureInfo|null;

  /**
   * Changes the base color factor of the material to the given value.
   * Requires the 'material-properties' capability to be enabled.
   */
  setBaseColorFactor(rgba: RGBA): Promise<void>;
}

/**
 * A TextureInfo is a pointer to a specific Texture in use on a Material
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-textureinfo
 */
export declare interface TextureInfo extends ThreeDOMElement {
  /**
   * The Texture being referenced by this TextureInfo
   */
  readonly texture: Texture|null;

  /**
   * Configure the Texture referenced by this TextureInfo
   * Requires the 'textures' capability to be enabled.
   */
  setTexture(texture: Texture|null): Promise<void>;
}

/**
 * A Texture pairs an Image and a Sampler for use in a Material
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-texture
 */
export declare interface Texture extends ThreeDOMElement {
  /**
   * The name of the texture, if any.
   */
  readonly name?: string;

  /**
   * The Sampler for this Texture
   */
  readonly sampler: Sampler|null;

  /**
   * The source Image for this Texture
   */
  readonly source: Image|null;

  /**
   * Configure the Sampler used for this Texture.
   * Requires the 'textures' capability to be enabled.
   */
  setSampler(sampler: Sampler): Promise<void>;

  /**
   * Configure the source Image used for this Texture.
   * Requires the 'textures' capability to be enabled.
   */
  setSource(image: Image): Promise<void>;
}

/**
 * A Sampler describes how to filter and wrap textures
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-sampler
 */
export declare interface Sampler extends ThreeDOMElement {
  /**
   * The name of the sampler, if any.
   */
  readonly name?: string;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplerminfilter
   */
  readonly minFilter: MinFilter|null;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplermagfilter
   */
  readonly magFilter: MagFilter|null;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplerwraps
   */
  readonly wrapS: WrapMode;

  /**
   * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#samplerwrapt
   */
  readonly wrapT: WrapMode;

  /**
   * Configure the minFilter value of the Sampler.
   * Requires the 'textures' capability to be enabled.
   */
  setMinFilter(filter: MinFilter|null): Promise<void>;

  /**
   * Configure the magFilter value of the Sampler.
   * Requires the 'textures' capability to be enabled.
   */
  setMagFilter(filter: MagFilter|null): Promise<void>;

  /**
   * Configure the S (U) wrap mode of the Sampler.
   * Requires the 'textures' capability to be enabled.
   */
  setWrapS(mode: WrapMode): Promise<void>;

  /**
   * Configure the T (V) wrap mode of the Sampler.
   * Requires the 'textures' capability to be enabled.
   */
  setWrapT(mode: WrapMode): Promise<void>;
}


/**
 * An Image represents an embedded or external image used to provide texture
 * color data.
 *
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#reference-image
 */
export declare interface Image extends ThreeDOMElement {
  /**
   * The name of the image, if any.
   */
  readonly name?: string;

  /**
   * The type is 'external' if the image has a configured URI. Otherwise, it is
   * considered to be 'embedded'. Note: this distinction is only implied by the
   * glTF spec, and is made explicit here for convenience.
   */
  readonly type: 'embedded'|'external';

  /**
   * The URI of the image, if it is external.
   */
  readonly uri: string|null;

  /**
   * Configure the URI of the image. If a URI is specified for an otherwise
   * embedded image, the URI will take precedence over an embedded buffer.
   * Requires the 'textures' capability to be enabled.
   */
  setURI(uri: string): Promise<void>;
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
