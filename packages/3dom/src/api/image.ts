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

import {Image as ImageInterface} from '../api.js';
import {SerializedImage} from '../protocol.js';

import {ModelKernelInterface} from './model-kernel.js';
import {ThreeDOMElement} from './three-dom-element.js';

const $kernel = Symbol('kernel');
const $uri = Symbol('uri');
const $name = Symbol('name');

export class Image extends ThreeDOMElement implements ImageInterface {
  private[$kernel]: ModelKernelInterface;

  private[$uri]: string|null;

  private[$name]?: string;

  constructor(kernel: ModelKernelInterface, serialized: SerializedImage) {
    super(kernel);

    this[$kernel] = kernel;

    this[$uri] = serialized.uri || null;
    this[$name] = serialized.name;
  }

  get name() {
    return this[$name];
  }

  get type() {
    return this.uri != null ? 'external' : 'embedded';
  }

  get uri() {
    return this[$uri];
  }

  async setURI(uri: string|null): Promise<void> {
    this[$kernel].mutate(this, 'uri', uri);
    this[$uri] = uri;
  }
}
