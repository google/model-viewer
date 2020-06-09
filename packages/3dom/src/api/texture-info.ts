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

import {ConstructedWithArguments, Constructor, Texture, TextureInfo as TextureInfoInterface, ThreeDOMElement} from '../api.js';
import {SerializedTextureInfo} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export type TextureInfoConstructor = Constructor<TextureInfoInterface>&
    ConstructedWithArguments<[ModelKernel, SerializedTextureInfo]>;

/**
 * A constructor factory for a TextureInfo class. The TextureInfo is defined
 * based on a provided implementation for all specified 3DOM scene graph element
 * types.
 *
 * The sole reason for using this factory pattern is to enable sound type
 * checking while also providing for the ability to stringify the factory so
 * that it can be part of a runtime-generated Worker script.
 *
 * @see ../api.ts
 */
export function defineTextureInfo(
    ThreeDOMElement: Constructor<ThreeDOMElement>): TextureInfoConstructor {
  const $kernel = Symbol('kernel');
  const $texture = Symbol('texture');

  class TextureInfo extends ThreeDOMElement implements TextureInfoInterface {
    private[$kernel]: ModelKernel;

    private[$texture]: Texture|null = null;

    constructor(kernel: ModelKernel, serialized: SerializedTextureInfo) {
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

  return TextureInfo;
}
