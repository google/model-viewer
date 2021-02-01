/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

import {customElement, html, internalProperty, LitElement, query} from 'lit-element';

import {openModalStyles} from '../../../styles.css.js';
import {State} from '../../../types.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element';
import {getGltfUrl} from '../../model_viewer_preview/reducer.js';
import {load} from './validation_utils.js';

@customElement('me-validation-modal')
export class ValidationModal extends LitElement {
  static styles = openModalStyles;

  @internalProperty() isOpen: boolean = false;
  @internalProperty() validationInfo?: string;

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  render() {
    return html`
<paper-dialog id="file-modal" modal ?opened=${this.isOpen}>
  <div class="FileModalContainer SnippetModal">
    <div class="FileModalHeader">
      <div>Validation</div>
    </div>
    <div class="FileModalCancel">
      <mwc-button unelevated icon="cancel" 
        @click=${this.close}>Close</mwc-button>
    </div>
    ${this.validationInfo}
  </div>
</paper-dialog>`;
  }
}

/**
 * Model validator
 */
@customElement('me-validation')
export class Validation extends ConnectedLitElement {
  @query('me-validation-modal#validation-modal')
  validationModal!: ValidationModal;
  @internalProperty() gltfUrl?: string;

  stateChanged(state: State) {
    const newGltfUrl = getGltfUrl(state);
    if (newGltfUrl !== this.gltfUrl && typeof newGltfUrl === 'string') {
      this.gltfUrl = newGltfUrl;
      // this.validationInfo = load();
    }
  }

  onOpen() {
    this.validationModal.open();
  }

  render() {
    return html`
    <mwc-button unelevated style="align-self: center;"
      @click=${this.onOpen}>
      Validation
    </mwc-button>
    <me-validation-modal id="validation-modal"></me-validation-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-validation-modal': ValidationModal;
    'me-validation': Validation;
  }
}
