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
 * istributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * @fileoverview Model editor for uploading, parsing, modifying GLTF/GLB files.
 */

import {customElement, html, LitElement} from 'lit-element';

/**
 * The <model-editor> element
 */
@customElement('model-editor')
export class ModelEditorElement extends LitElement {
  render() {
    return html`
        <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'model-editor': ModelEditorElement;
  }
}
