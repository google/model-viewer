/**
 * @license
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
 *
 */

/**
 * @fileoverview Inspector panel for GLTF/GLB files.
 */

import {customElement, html, internalProperty} from 'lit-element';

import {State} from '../../types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getModel} from '../model_viewer_preview/reducer.js';

/**
 * The inspector.
 */
@customElement('me-inspector-panel')
export class InspectorPanel extends ConnectedLitElement {
  @internalProperty() gltfJsonstring: string = '';
  @internalProperty() thumbnails: string[] = [];

  stateChanged(state: State) {
    const model = getModel(state);
    this.thumbnails = [...model.thumbnailsById.values()];
    this.gltfJsonstring = model.originalGltfJson;
  }

  render() {
    return html`
        <div>
          <div class="texture-images">
            ${
        this.thumbnails.map(
            objectUrl => html`<img width="100" src="${objectUrl}">`)}
          </div>
          <pre class="inspector-content">${
        this.gltfJsonstring || 'No model loaded'}
          </pre>
        </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-inspector-panel': InspectorPanel;
  }
}
