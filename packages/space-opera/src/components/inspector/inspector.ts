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

import {html} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {State} from '../../types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getModel, isLoaded} from '../model_viewer_preview/reducer.js';
import {Thumbnail} from '../model_viewer_preview/types.js';

/**
 * The inspector.
 */
@customElement('me-inspector-panel')
export class InspectorPanel extends ConnectedLitElement {
  @state() gltfJsonstring?: string = '';
  @state() thumbnailsById = new Map<string, Thumbnail>();

  stateChanged(state: State) {
    if (!isLoaded(state)) {
      return;
    }
    const model = getModel(state);
    if (model.thumbnailsById != null) {
      this.thumbnailsById = model.thumbnailsById;
    }
    this.gltfJsonstring = model.originalGltfJson;
  }

  render() {
    const thumbnails = [...this.thumbnailsById.values()];
    return html`
        <div>
          <div class="texture-images">
            ${
        thumbnails.map(
            thumbnail => html`<img width="100" src="${thumbnail.objectUrl}">`)}
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
