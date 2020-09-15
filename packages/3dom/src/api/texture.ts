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

import {Image, Sampler, Texture as TextureInterface} from '../api.js';
import {SerializedTexture} from '../protocol.js';

import {ModelKernelInterface} from './model-kernel.js';
import {ThreeDOMElement} from './three-dom-element.js';

const $kernel = Symbol('kernel');
const $source = Symbol('source');
const $sampler = Symbol('sampler');
const $name = Symbol('name');

export class Texture extends ThreeDOMElement implements TextureInterface {
  private[$kernel]: ModelKernelInterface;

  private[$source]: Image|null = null;
  private[$sampler]: Sampler|null = null;

  private[$name]: string;

  constructor(kernel: ModelKernelInterface, serialized: SerializedTexture) {
    super(kernel);

    this[$kernel] = kernel;

    const {sampler, source, name} = serialized;

    if (name != null) {
      this[$name] = name;
    }

    if (sampler != null) {
      this[$sampler] = kernel.deserialize('sampler', sampler);
    }

    if (source != null) {
      this[$source] = kernel.deserialize('image', source);
    }
  }

  get name(): string {
    return this[$name];
  }

  get sampler(): Sampler|null {
    return this[$sampler];
  }

  get source(): Image|null {
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
