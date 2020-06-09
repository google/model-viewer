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

import {defineImage} from '../api/image.js';
import {defineMaterial} from '../api/material.js';
import {defineModelKernel} from '../api/model-kernel.js';
import {defineModel} from '../api/model.js';
import {definePBRMetallicRoughness} from '../api/pbr-metallic-roughness.js';
import {defineSampler} from '../api/sampler.js';
import {defineTextureInfo} from '../api/texture-info.js';
import {defineTexture} from '../api/texture.js';
import {defineThreeDOMElement} from '../api/three-dom-element.js';
import {ThreeDOMMessageType} from '../protocol.js';

export const generateAPI = () => `
var ThreeDOMMessageType = ${JSON.stringify(ThreeDOMMessageType)};

${defineModelKernel.toString()}
${defineThreeDOMElement.toString()}
${defineModel.toString()}
${defineMaterial.toString()}
${definePBRMetallicRoughness.toString()}
${defineSampler.toString()}
${defineImage.toString()}
${defineTexture.toString()}
${defineTextureInfo.toString()}

var ThreeDOMElement = ${defineThreeDOMElement.name}();
var Model = ${defineModel.name}(ThreeDOMElement);
var Material = ${defineMaterial.name}(ThreeDOMElement);
var PBRMetallicRoughness = ${definePBRMetallicRoughness.name}(ThreeDOMElement);
var Sampler = ${defineSampler.name}(ThreeDOMElement);
var Image = ${defineImage.name}(ThreeDOMElement);
var Texture = ${defineTexture.name}(ThreeDOMElement);
var TextureInfo = ${defineTextureInfo.name}(ThreeDOMElement);

var ModelKernel = ${defineModelKernel.name}(
  ThreeDOMMessageType,
  ThreeDOMElement,
  Model,
  Material,
  PBRMetallicRoughness,
  Sampler,
  Image,
  Texture,
  TextureInfo
);

// Populate the global scope with constructors
// so that author code can use instanceof checks
self.ThreeDOMElement = ThreeDOMElement;
self.Model = Model;
self.Material = Material;
self.PBRMetallicRoughness = PBRMetallicRoughness;
self.Sampler = Sampler;
self.Image = Image;
self.Texture = Texture;
self.TextureInfo = TextureInfo;
`;
