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

import {defineMaterial} from '../api/material.js';
import {defineModelKernel} from '../api/model-kernel.js';
import {defineModel} from '../api/model.js';
import {definePBRMetallicRoughness} from '../api/pbr-metallic-roughness.js';
import {defineThreeDOMElement} from '../api/three-dom-element.js';

export const generateAPI = () => `${defineModelKernel.toString()}
${defineThreeDOMElement.toString()}
${defineModel.toString()}
${defineMaterial.toString()}
${definePBRMetallicRoughness.toString()}

var ThreeDOMElement = defineThreeDOMElement();
var Model = defineModel(ThreeDOMElement);
var Scene = defineScene(ThreeDOMElement);
var Node = defineNode(ThreeDOMElement);
var Mesh = defineMesh(ThreeDOMElement);
var Primitive = definePrimitive(ThreeDOMElement);
var Material = defineMaterial(ThreeDOMElement);
var PBRMetallicRoughness = definePBRMetallicRoughness(ThreeDOMElement);

var ModelKernel = defineModelKernel(
  Model,
  Scene,
  Node,
  Mesh,
  Primitive,
  Material,
  PBRMetallicRoughness
);

// Populate the global scope with constructors
// so that author code can use instanceof checks
self.ThreeDOMElement = ThreeDOMElement;
self.Model = Model;
self.Scene = Scene;
self.Node = Node;
self.Mesh = Mesh;
self.Primitive = Primitive;
self.Material = Material;
self.PBRMetallicRoughness = PBRMetallicRoughness;`;