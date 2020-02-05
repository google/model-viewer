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

import {Material, Object3D} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader';

import {SerializedThreeDOMElement} from '../../protocol.js';
import {getLocallyUniqueId} from '../../utilities.js';
import {ModelGraft} from './model-graft.js';

export const $relatedObject = Symbol('relatedObject');
export const $type = Symbol('type');

const $graft = Symbol('graft');
const $id = Symbol('id');

/**
 * A SerializableThreeDOMElement is the common primitive of all scene graph
 * elements that have been facaded in the host execution context. It adds
 * a common interface to these elements in support of convenient
 * serializability.
 */
export class ThreeDOMElement {
  protected[$graft]: ModelGraft;
  protected[$relatedObject]: Object3D|Material|GLTF;

  protected[$id]: number = getLocallyUniqueId();

  constructor(graft: ModelGraft, relatedObject: Object3D|Material|GLTF) {
    this[$relatedObject] = relatedObject;
    this[$graft] = graft;

    graft.adopt(this);
  }

  /**
   * The Model of provenance for this scene graph element.
   */
  get ownerModel() {
    return this[$graft].model;
  }

  /**
   * The unique ID that marks this element. In generally, an ID should only be
   * considered unique to the element in the context of its scene graph. These
   * IDs are not guaranteed to be stable across script executions.
   */
  get internalID() {
    return this[$id];
  }

  /**
   * Some (but not all) scene graph elements may have an optional name.
   */
  get name() {
    const relatedObject = this[$relatedObject];
    if ((relatedObject as Object3D).isObject3D ||
        (relatedObject as Material).isMaterial) {
      return (relatedObject as Object3D | Material).userData ?
          (relatedObject as Object3D | Material).userData.name :
          null;
    }
    return null;
  }

  /**
   * The backing Three.js scene graph construct for this element.
   */
  get relatedObject() {
    return this[$relatedObject];
  }

  toJSON(): SerializedThreeDOMElement {
    const serialized: SerializedThreeDOMElement = {id: this[$id]};
    const {name} = this;
    if (name != null) {
      serialized.name = name;
    }
    return serialized;
  }
}