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

import {Group, Mesh, SkinnedMesh} from 'three';

import {SerializedMesh} from '../../protocol.js';
import {ModelGraft} from '../model-graft.js';
import {GraftPrimitive} from './graft-primitive.js';
import {SerializableThreeDOMElement} from './serializable-three-dom-element.js';

const $primitives = Symbol('primitives');

/**
 * GraftMesh
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#mesh
 */
export class GraftMesh extends SerializableThreeDOMElement {
  protected[$primitives]: Readonly<Array<GraftPrimitive>>;

  constructor(ownerModel: ModelGraft, groupOrMesh: Group|Mesh) {
    super(ownerModel, groupOrMesh);

    const primitives = [];

    if ((groupOrMesh as Group).isGroup) {
      // TODO: Figure out if extensions might add things like lights and cameras
      // to this group
      for (const meshLike of groupOrMesh.children) {
        primitives.push(
            new GraftPrimitive(ownerModel, meshLike as Mesh | SkinnedMesh));
      }
    } else {
      primitives.push(
          new GraftPrimitive(ownerModel, groupOrMesh as Mesh | SkinnedMesh));
    }

    this[$primitives] = Object.freeze(primitives);
  }

  get primitives() {
    return this[$primitives];
  }

  toJSON() {
    const serialized: SerializedMesh = super.toJSON();

    if (this.primitives.length) {
      serialized.primitives =
          this.primitives.map(primitive => primitive.toJSON());
    }

    return serialized;
  }
}