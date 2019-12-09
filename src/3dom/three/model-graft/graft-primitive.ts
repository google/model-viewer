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

import {Material, Mesh, SkinnedMesh} from 'three';

import {SerializedPrimitive} from '../../protocol.js';
import {ModelGraft} from '../model-graft.js';

import {GraftMaterial} from './graft-material.js';
import {SerializableThreeDOMElement} from './serializable-three-dom-element.js';

const $material = Symbol('material');

/**
 * GraftPrimitive
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#primitive
 */
export class GraftPrimitive extends SerializableThreeDOMElement {
  protected[$material]: GraftMaterial|null = null;

  constructor(ownerModel: ModelGraft, meshLike: Mesh|SkinnedMesh) {
    super(ownerModel, meshLike);

    if (meshLike.material != null) {
      // NOTE(cdata): Technically Three.js meshes can have an array of
      // materials. However, at the time of this writing it does not appear as
      // though any scenes produced by the GLTFLoader will contain meshes with
      // multiple materials.
      // @see https://github.com/mrdoob/three.js/pull/15889
      this[$material] =
          new GraftMaterial(ownerModel, meshLike.material as Material);
    }
  }

  get material() {
    return this[$material];
  }

  toJSON() {
    const serialized: SerializedPrimitive = super.toJSON();

    if (this[$material] != null) {
      serialized.material = this.material!.toJSON();
    }

    return serialized;
  }
}