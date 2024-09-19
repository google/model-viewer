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

import {Material, Object3D, Texture} from 'three';

export const $correlatedObjects = Symbol('correlatedObjects');
export const $onUpdate = Symbol('onUpdate');

type CorrelatedObjects = Set<Object3D>|Set<Material>|Set<Texture>;

/**
 * A SerializableThreeDOMElement is the common primitive of all scene graph
 * elements that have been facaded in the host execution context. It adds
 * a common interface to these elements in support of convenient
 * serializability.
 */
export class ThreeDOMElement {
  readonly[$onUpdate]: () => void;
  // The Three.js scene graph construct for this element.
  [$correlatedObjects]: CorrelatedObjects;

  constructor(onUpdate: () => void, correlatedObjects: CorrelatedObjects) {
    this[$onUpdate] = onUpdate;
    this[$correlatedObjects] = correlatedObjects;
  }
}
