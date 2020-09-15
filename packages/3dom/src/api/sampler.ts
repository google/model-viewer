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

import {Sampler as SamplerInterface} from '../api.js';
import {MagFilter, MinFilter, WrapMode} from '../gltf-2.0.js';
import {SerializedSampler} from '../protocol.js';

import {ModelKernelInterface} from './model-kernel.js';
import {ThreeDOMElement} from './three-dom-element.js';

const $kernel = Symbol('kernel');
const $minFilter = Symbol('minFilter');
const $magFilter = Symbol('magFilter');
const $wrapS = Symbol('wrapS');
const $wrapT = Symbol('wrapT');
const $name = Symbol('name');

export class Sampler extends ThreeDOMElement implements SamplerInterface {
  private[$kernel]: ModelKernelInterface;

  private[$minFilter]: MinFilter|null = null;
  private[$magFilter]: MagFilter|null = null;

  private[$wrapS]: WrapMode;
  private[$wrapT]: WrapMode;

  private[$name]: string;

  constructor(kernel: ModelKernelInterface, serialized: SerializedSampler) {
    super(kernel);

    this[$kernel] = kernel;

    if (serialized.name != null) {
      this[$name] = serialized.name;
    }

    this[$minFilter] = serialized.minFilter || null;
    this[$magFilter] = serialized.magFilter || null;
    this[$wrapS] = serialized.wrapS || 10497;
    this[$wrapT] = serialized.wrapT || 10497;
  }

  get name(): string {
    return this[$name];
  }

  get minFilter(): MinFilter|null {
    return this[$minFilter];
  }

  get magFilter(): MagFilter|null {
    return this[$magFilter];
  }

  get wrapS(): WrapMode {
    return this[$wrapS];
  }

  get wrapT(): WrapMode {
    return this[$wrapT];
  }

  async setMinFilter(filter: MinFilter|null): Promise<void> {
    await this[$kernel].mutate(this, 'minFilter', filter);
    this[$minFilter] = filter;
  }

  async setMagFilter(filter: MagFilter|null): Promise<void> {
    await this[$kernel].mutate(this, 'magFilter', filter);
    this[$magFilter] = filter;
  }

  async setWrapS(mode: WrapMode): Promise<void> {
    await this[$kernel].mutate(this, 'wrapS', mode);
    this[$wrapS] = mode;
  }

  async setWrapT(mode: WrapMode): Promise<void> {
    await this[$kernel].mutate(this, 'wrapT', mode);
    this[$wrapT] = mode;
  }
}
