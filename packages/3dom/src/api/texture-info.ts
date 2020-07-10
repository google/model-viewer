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

import {Texture, TextureInfo as TextureInfoInterface} from '../api.js';
import {SerializedTextureInfo} from '../protocol.js';

import {ModelKernelInterface} from './model-kernel.js';
import {ThreeDOMElement} from './three-dom-element.js';

const $kernel = Symbol('kernel');
const $texture = Symbol('texture');

export class TextureInfo extends ThreeDOMElement implements
    TextureInfoInterface {
  private[$kernel]: ModelKernelInterface;

  private[$texture]: Texture|null = null;

  constructor(kernel: ModelKernelInterface, serialized: SerializedTextureInfo) {
    super(kernel);

    this[$kernel] = kernel;

    const {texture} = serialized;

    if (texture != null) {
      this[$texture] = kernel.deserialize('texture', texture);
    }
  }

  get texture() {
    return this[$texture];
  }

  async setTexture(texture: Texture|null): Promise<void> {
    await this[$kernel].mutate(this, 'texture', texture);
    this[$texture] = texture;
  }
}
