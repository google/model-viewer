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

import {Group, Mesh as ThreeMesh, Object3D} from 'three';

import {SerializedNode} from '../../protocol.js';
import {ModelGraft} from '../model-graft.js';

import {GraftMesh} from './graft-mesh.js';
import {SerializableThreeDOMElement} from './serializable-three-dom-element.js';

const $mesh = Symbol('mesh');
const $children = Symbol('children');

/**
 * GraftSceneNode
 * @see https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#node
 */
export class GraftNode extends SerializableThreeDOMElement {
  protected[$children]: Readonly<Array<GraftNode>> = [];

  protected[$mesh]: GraftMesh|null = null;

  constructor(ownerModel: ModelGraft, object3D: Object3D) {
    super(ownerModel, object3D);

    if ((object3D as Group).isGroup || (object3D as ThreeMesh).isMesh) {
      this[$mesh] = new GraftMesh(ownerModel, object3D as Group | ThreeMesh);
    }

    // The implication here is that a group is only created as a leaf that
    // represents the multiple primitives associated with a given glTF Mesh
    if (!(object3D as Group).isGroup) {
      const children: Array<GraftNode> = [];

      for (const child of object3D.children) {
        children.push(new GraftNode(ownerModel, child));
      }

      this[$children] = Object.freeze(children);
    }
  }

  get children() {
    return this[$children];
  }

  get mesh() {
    return this[$mesh];
  }

  toJSON() {
    const result: SerializedNode = super.toJSON();

    if (this.mesh) {
      result.mesh = this.mesh.toJSON();
    }

    if (this.name) {
      result.name = this.name;
    }

    if (this.children.length) {
      result.children =
          this.children.map(child => child.toJSON()) as Array<SerializedNode>;
    }

    return result;
  }
}