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

import {ConstructedWithArguments, Constructor, Image, Sampler, Texture as TextureInterface, ThreeDOMElement} from '../api.js';
import {SerializedTexture} from '../protocol.js';

import {ModelKernel} from './model-kernel.js';

export type TextureConstructor = Constructor<TextureInterface>&
    ConstructedWithArguments<[ModelKernel, SerializedTexture]>;

/**
 * A constructor factory for a Texture class. The Texture is defined
 * based on a provided implementation for all specified 3DOM scene graph element
 * types.
 *
 * The sole reason for using this factory pattern is to enable sound type
 * checking while also providing for the ability to stringify the factory so
 * that it can be part of a runtime-generated Worker script.
 *
 * @see ../api.ts
 */
export function defineTexture(ThreeDOMElement: Constructor<ThreeDOMElement>):
    TextureConstructor {
  const $kernel = Symbol('kernel');
  const $source = Symbol('source');
  const $sampler = Symbol('sampler');
  const $name = Symbol('name');

  class Texture extends ThreeDOMElement implements TextureInterface {
    private[$kernel]: ModelKernel;

    private[$source]: Image|null = null;
    private[$sampler]: Sampler|null = null;

    private[$name]?: string;

    constructor(kernel: ModelKernel, serialized: SerializedTexture) {
      super(kernel);

      this[$kernel] = kernel;

      const {sampler, source, name} = serialized;

      this[$name] = name;

      if (sampler != null) {
        this[$sampler] = kernel.deserialize('sampler', sampler);
      }

      if (source != null) {
        this[$source] = kernel.deserialize('image', source);
      }
    }

    get name() {
      return this[$name];
    }

    get sampler() {
      return this[$sampler];
    }

    get source() {
      return this[$source];
    }

    async setSampler(sampler: Sampler|null): Promise<void> {
      await this[$kernel].mutate(this, 'sampler', sampler);
      this[$sampler] = sampler;
    }

    async setSource(image: Image|null): Promise<void> {
      await this[$kernel].mutate(this, 'source', image);
      this[$source] = image;
    }
  }

  return Texture;
}
