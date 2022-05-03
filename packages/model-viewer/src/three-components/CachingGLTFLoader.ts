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

import {Event as ThreeEvent, EventDispatcher, WebGLRenderer} from 'three';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';

import ModelViewerElementBase from '../model-viewer-base.js';
import {CacheEvictionPolicy} from '../utilities/cache-eviction-policy.js';

import GLTFMaterialsVariantsExtension from './gltf-instance/VariantMaterialLoaderPlugin';
import {GLTFInstance, GLTFInstanceConstructor} from './GLTFInstance.js';

export type ProgressCallback = (progress: number) => void;

export interface PreloadEvent extends ThreeEvent {
  type: 'preload';
  element: ModelViewerElementBase;
  src: String;
}

/**
 * A helper to Promise-ify a Three.js GLTFLoader
 */
export const loadWithLoader =
    (url: string,
     loader: GLTFLoader,
     progressCallback: ProgressCallback = () => {}) => {
      const onProgress = (event: ProgressEvent) => {
        const fraction = event.loaded / event.total;
        progressCallback!
            (Math.max(0, Math.min(1, isFinite(fraction) ? fraction : 1)));
      };
      return new Promise<GLTF>((resolve, reject) => {
        loader.load(url, resolve, onProgress, reject);
      });
    };

/** Helper to load a script tag. */
const fetchScript = (src: string): Promise<Event> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    document.body.appendChild(script);
    script.onload = resolve;
    script.onerror = reject;
    script.async = true;
    script.src = src;
  });
};

const cache = new Map<string, Promise<GLTFInstance>>();
const preloaded = new Map<string, boolean>();

let dracoDecoderLocation: string;
const dracoLoader = new DRACOLoader();

let ktx2TranscoderLocation: string;
const ktx2Loader = new KTX2Loader();

let meshoptDecoderLocation: string;
let meshoptDecoder: Promise<typeof MeshoptDecoder>|undefined;

interface MeshoptDecoder {
  ready: Promise<void>;
  supported: boolean;
}

declare global {
  const MeshoptDecoder: MeshoptDecoder;
}

export const $loader = Symbol('loader');
export const $evictionPolicy = Symbol('evictionPolicy');
const $GLTFInstance = Symbol('GLTFInstance');

export class CachingGLTFLoader<T extends GLTFInstanceConstructor =
                                             GLTFInstanceConstructor> extends
    EventDispatcher {
  static withCredentials: boolean;

  static setDRACODecoderLocation(url: string) {
    dracoDecoderLocation = url;
    dracoLoader.setDecoderPath(url);
  }

  static getDRACODecoderLocation() {
    return dracoDecoderLocation;
  }

  static setKTX2TranscoderLocation(url: string) {
    ktx2TranscoderLocation = url;
    ktx2Loader.setTranscoderPath(url);
  }

  static getKTX2TranscoderLocation() {
    return ktx2TranscoderLocation;
  }

  static setMeshoptDecoderLocation(url: string) {
    if (meshoptDecoderLocation !== url) {
      meshoptDecoderLocation = url;
      meshoptDecoder = fetchScript(url)
                           .then(() => MeshoptDecoder.ready)
                           .then(() => MeshoptDecoder);
    }
  }

  static getMeshoptDecoderLocation() {
    return meshoptDecoderLocation;
  }

  static initializeKTX2Loader(renderer: WebGLRenderer) {
    ktx2Loader.detectSupport(renderer);
  }

  static[$evictionPolicy]: CacheEvictionPolicy =
      new CacheEvictionPolicy(CachingGLTFLoader);

  static get cache() {
    return cache;
  }

  /** @nocollapse */
  static clearCache() {
    cache.forEach((_value, url) => {
      this.delete(url);
    });
    this[$evictionPolicy].reset();
  }

  static has(url: string) {
    return cache.has(url);
  }

  /** @nocollapse */
  static async delete(url: string) {
    if (!this.has(url)) {
      return;
    }

    const gltfLoads = cache.get(url);
    preloaded.delete(url);
    cache.delete(url);

    const gltf = await gltfLoads;
    // Dispose of the cached glTF's materials and geometries:

    gltf!.dispose();
  }

  /**
   * Returns true if the model that corresponds to the specified url is
   * available in our local cache.
   */
  static hasFinishedLoading(url: string) {
    return !!preloaded.get(url);
  }

  constructor(GLTFInstance: T) {
    super();
    this[$GLTFInstance] = GLTFInstance;
    this[$loader].setDRACOLoader(dracoLoader);
    this[$loader].setKTX2Loader(ktx2Loader);
  }

  protected[$loader]: GLTFLoader = new GLTFLoader().register(
      parser => new GLTFMaterialsVariantsExtension(parser));
  protected[$GLTFInstance]: T;

  protected get[$evictionPolicy](): CacheEvictionPolicy {
    return (this.constructor as typeof CachingGLTFLoader)[$evictionPolicy];
  }

  /**
   * Preloads a glTF, populating the cache. Returns a promise that resolves
   * when the cache is populated.
   */
  async preload(
      url: string, element: ModelViewerElementBase,
      progressCallback: ProgressCallback = () => {}) {
    this[$loader].setWithCredentials(CachingGLTFLoader.withCredentials);
    this.dispatchEvent(
        {type: 'preload', element: element, src: url} as PreloadEvent);
    if (!cache.has(url)) {
      if (meshoptDecoder != null) {
        this[$loader].setMeshoptDecoder(await meshoptDecoder);
      }

      const rawGLTFLoads =
          loadWithLoader(url, this[$loader], (progress: number) => {
            progressCallback(progress * 0.8);
          });

      const GLTFInstance = this[$GLTFInstance];
      const gltfInstanceLoads = rawGLTFLoads
                                    .then((rawGLTF) => {
                                      return GLTFInstance.prepare(rawGLTF);
                                    })
                                    .then((preparedGLTF) => {
                                      progressCallback(0.9);
                                      return new GLTFInstance(preparedGLTF);
                                    })
                                    .catch((reason => {
                                      console.error(reason);
                                      return new GLTFInstance();
                                    }));
      cache.set(url, gltfInstanceLoads);
    }

    await cache.get(url);

    preloaded.set(url, true);

    if (progressCallback) {
      progressCallback(1.0);
    }
  }

  /**
   * Loads a glTF from the specified url and resolves a unique clone of the
   * glTF. If the glTF has already been loaded, makes a clone of the cached
   * copy.
   */
  async load(
      url: string, element: ModelViewerElementBase,
      progressCallback: ProgressCallback = () => {}): Promise<InstanceType<T>> {
    await this.preload(url, element, progressCallback);

    const gltf = await cache.get(url)!;
    const clone = await gltf.clone() as InstanceType<T>;

    this[$evictionPolicy].retain(url);

    // Patch dispose so that we can properly account for instance use
    // in the caching layer:
    clone.dispose = () => {
      this[$evictionPolicy].release(url);
    };

    return clone;
  }
}
