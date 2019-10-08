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

import {AnimationMixin} from './features/animation.js';
import {ARMixin} from './features/ar.js';
import {ControlsMixin} from './features/controls.js';
import {EnvironmentMixin} from './features/environment.js';
import {LoadingMixin} from './features/loading.js';
import {MagicLeapMixin} from './features/magic-leap.js';
import {StagingMixin} from './features/staging.js';
import ModelViewerElementBase from './model-viewer-base.js';
import {FocusVisiblePolyfillMixin} from './utilities/focus-visible.js';

// Uncomment these lines to export PMREM textures in Glitch:
// export {default as TextureUtils} from './three-components/TextureUtils';
// export * from 'three';

export const ModelViewerElement = MagicLeapMixin(
    StagingMixin(EnvironmentMixin(ControlsMixin(ARMixin(LoadingMixin(
        AnimationMixin(FocusVisiblePolyfillMixin(ModelViewerElementBase))))))));

export type ModelViewerElement = InstanceType<typeof ModelViewerElement>;

customElements.define('model-viewer', ModelViewerElement);

declare global {
  interface HTMLElementTagNameMap {
    'model-viewer': ModelViewerElement;
  }
}
