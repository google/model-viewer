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

import {Model, ThreeDOMElement as ThreeDOMElementInterface} from '../api.js';

import {ModelKernelInterface} from './model-kernel.js';

const $ownerModel = Symbol('ownerModel');

/**
 * The basic implementation for all 3DOM scene graph participants.
 * Scene graph nodes are distinguished by their "owner" Model. All scene
 * graph nodes have an owner Model associated with them except for the
 * sole Model in the scene graph, whose ownerModel property is not defined.
 */
export class ThreeDOMElement implements ThreeDOMElementInterface {
  protected[$ownerModel]: Model;

  constructor(kernel: ModelKernelInterface) {
    if (kernel == null) {
      throw new Error('Illegal constructor');
    }

    this[$ownerModel] = kernel.model;
  }

  /**
   * The Model of provenance for this scene graph element, or undefined if
   * element is itself a Model.
   */
  get ownerModel() {
    return this[$ownerModel];
  }
}
