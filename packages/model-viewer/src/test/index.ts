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

import './utilities-spec.js';
import './styles/parsers-spec.js';
import './styles/conversions-spec.js';
import './styles/deserializers-spec.js';
import './styles/evaluators-spec.js';
import './styles/style-effector-spec.js';
import './decorators-spec.js';
import './model-viewer-base-spec.js';
import './model-viewer-spec.js';
import './three-components/ModelScene-spec.js';
import './three-components/Renderer-spec.js';
import './three-components/ARRenderer-spec.js';
import './three-components/GLTFInstance-spec.js';
import './three-components/gltf-instance/ModelViewerGLTFInstance-spec.js';
import './three-components/gltf-instance/correlated-scene-graph-spec.js';
import './three-components/gltf-instance/utilities-spec.js';
import './three-components/SmoothControls-spec.js';
import './three-components/Damper-spec.js';
import './three-components/TextureUtils-spec.js';
import './three-components/CachingGLTFLoader-spec.js';
import './three-components/ModelUtils-spec.js';
import './three-components/Hotspot-spec.js';
import './utilities/animation-spec.js';
import './utilities/cache-eviction-policy-spec.js';
import './utilities/focus-visible-spec.js';
import './utilities/progress-tracker-spec.js';
import './features/animation-spec.js';
import './features/annotation-spec.js';
import './features/staging-spec.js';
import './features/controls-spec.js';
import './features/environment-spec.js';
import './features/loading-spec.js';
import './features/scene-graph-spec.js';
import './features/scene-graph/model-spec.js';
import './features/ar-spec.js';
import './features/scene-graph/texture-spec.js';
import './features/scene-graph/material-spec.js';
import './features/scene-graph/texture-info-spec.js';
import './features/scene-graph/nodes/primitive-node-spec.js';


try {
  // Set an aggressive poll interval if we are using the IntersectionObserver
  // polyfill. This is currently needed for IE11 and iOS Safari.
  // @see https://github.com/w3c/IntersectionObserver/tree/master/polyfill#configuring-the-polyfill
  (IntersectionObserver.prototype as any).POLL_INTERVAL = 50;
} catch (e) {
}
