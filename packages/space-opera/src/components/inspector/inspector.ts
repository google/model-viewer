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

import {createSafeObjectUrlFromUnsafe, SafeObjectUrl} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'
import {customElement, html, internalProperty, PropertyValues} from 'lit-element';

import {State} from '../../space_opera_base.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {TexturesById} from '../materials_panel/material_state.js';

const $texturesById = Symbol('texturesById');

/**
 * The inspector.
 */
@customElement('me-inspector-panel')
export class InspectorPanel extends ConnectedLitElement {
  @internalProperty() gltfJsonstring: string = '';
  @internalProperty()[$texturesById]?: TexturesById;

  private safeTextureUrls: SafeObjectUrl[] = [];

  // A promise that resolves once the last texture update is done and rendered.
  // Mainly for tests. Await on this AFTER awaiting updateComplete.
  updateTexturesComplete?: Promise<void>;

  stateChanged(state: State) {
    this[$texturesById] = state.edits.texturesById;
    this.gltfJsonstring = state.gltfJsonString;
  }

  private async updateTextures(texturesById: TexturesById|undefined) {
    // NOTE: There is a potential race here. If another update is running, we
    // may finish before it, and it would overwrite our correct results. We'll
    // live with this for now. If it becomes an issue, the proper solution is
    // probably to do async operations only at the data level, not affecting the
    // UI until data is ready.

    // Work with local variables to avoid possible race conditions.
    const newUrls: SafeObjectUrl[] = [];
    const textures = (texturesById?.values()) ?? [];
    for (const texture of textures) {
      newUrls.push(await createSafeObjectUrlFromUnsafe(texture.uri));
    }
    this.safeTextureUrls = newUrls;
    await this.requestUpdate();
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has($texturesById)) {
      // Only call on change. Otherwise we could infinite-async-loop.
      this.updateTexturesComplete = this.updateTextures(this[$texturesById]);
    }
  }

  render() {
    return html`
        <div>
          <pre class="inspector-content">${
        this.gltfJsonstring || 'No model loaded'}
          </pre>
          <div class="texture-images">
            ${
        this.safeTextureUrls.map(
            url => html`<img width="100" src="${url.url}">`)}
          </div>
        </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-inspector-panel': InspectorPanel;
  }
}
