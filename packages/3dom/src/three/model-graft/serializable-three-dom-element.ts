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

import {Material, Object3D} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader';

import {getLocallyUniqueId} from '../../../utilities.js';
import {SerializedThreeDOMElement} from '../../protocol.js';

export const $relatedObject = Symbol('relatedObject');
export const $type = Symbol('type');
const $ownerModel = Symbol('ownerModel');
const $id = Symbol('id');

export interface OwnerModel {
  adopt(element: SerializableThreeDOMElement): void;
}

/**
 * SerializableThreeDOMElement
 */
export abstract class SerializableThreeDOMElement {
  protected[$ownerModel]: OwnerModel|null = null;
  protected[$relatedObject]: Object3D|Material|GLTF;

  protected[$id]: number = getLocallyUniqueId();

  constructor(
      ownerModel: OwnerModel|null, relatedObject: Object3D|Material|GLTF) {
    this[$relatedObject] = relatedObject;

    if (ownerModel != null) {
      this[$ownerModel] = ownerModel;
      this[$ownerModel]!.adopt(this);
    }
  }

  get internalID() {
    return this[$id];
  }

  get ownerModel() {
    return this[$ownerModel];
  }

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

  toJSON(): SerializedThreeDOMElement {
    const serialized: SerializedThreeDOMElement = {id: this[$id]};
    const {name} = this;
    if (name != null) {
      serialized.name = name;
    }
    return serialized;
  }
}