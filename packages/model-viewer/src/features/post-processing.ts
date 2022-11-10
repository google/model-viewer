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

import {property} from 'lit/decorators.js';
import {Texture} from 'three';

import ModelViewerElementBase, {$needsRender, $renderer} from '../model-viewer-base.js';
import {clamp, Constructor, deserializeUrl} from '../utilities.js';
import {BloomPass} from 'three/examples/jsm/postprocessing/BloomPass';

// make bunch of effects
export const BLOOM_PASS = new BloomPass();

export declare interface PostProcessingInterface {
  bloomEffect: boolean;
}

export const PostProcessingMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<PostProcessingInterface>&T => {
  class PostProcessingModelViewerElement extends ModelViewerElement {
    @property({type: Boolean, attribute: 'bloom-effect'})
    bloomEffect: boolean = false;

    updated(changedProperties: Map<string|number|symbol, unknown>) {
      super.updated(changedProperties);

      if (changedProperties.has('bloomEffect')) {
        this.bloomEffect ? this[$renderer].effectComposer.addPass(BLOOM_PASS) : this[$renderer].effectComposer.removePass(BLOOM_PASS);
        this[$needsRender]();
      }
    }
  }

  return PostProcessingModelViewerElement;
};
