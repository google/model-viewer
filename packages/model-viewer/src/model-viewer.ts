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
import {AnnotationMixin} from './features/annotation.js';
import {ARMixin} from './features/ar.js';
import {ControlsMixin} from './features/controls.js';
import {EnvironmentMixin} from './features/environment.js';
import {LoadingMixin} from './features/loading.js';
import {SceneGraphMixin} from './features/scene-graph.js';
import {StagingMixin} from './features/staging.js';
import ModelViewerElementBase from './model-viewer-base.js';
import {FocusVisiblePolyfillMixin} from './utilities/focus-visible.js';

// Export these to allow lazy-loaded LottieLoader.js to find what it needs.
// Requires an import map - "three": "path/to/model-viewer.min.js".
export {CanvasTexture, FileLoader, Loader, NearestFilter} from 'three';

export const ModelViewerElement = AnnotationMixin(SceneGraphMixin(StagingMixin(
    EnvironmentMixin(ControlsMixin(ARMixin(LoadingMixin(AnimationMixin(
        FocusVisiblePolyfillMixin(ModelViewerElementBase)))))))));

export type ModelViewerElement = InstanceType<typeof ModelViewerElement>;

export {RGB, RGBA} from './three-components/gltf-instance/gltf-2.0';

customElements.define('model-viewer', ModelViewerElement);

declare global {
  interface HTMLElementTagNameMap {
    'model-viewer': ModelViewerElement;
  }
}
