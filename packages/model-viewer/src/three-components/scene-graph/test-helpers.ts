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

export const assetPath = (asset: string): string =>
    `./base/shared-assets/${asset}`;

export const loadThreeGLTF = (url: string): Promise<ThreeGLTF> => {
  const loader = new GLTFLoader();
  return new Promise<ThreeGLTF>((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
};

export const createFakeThreeGLTF = (): ThreeGLTF => {
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
