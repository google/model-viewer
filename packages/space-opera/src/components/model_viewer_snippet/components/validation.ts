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
import {validateGltf} from './validation_utils.js';

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
  @internalProperty() report: any = {};

  @internalProperty() severityTitle: string = '';
  @internalProperty() severityColor: string = '';

  @internalProperty() infoMessages: any = [];
  @internalProperty() hintMessages: any = [];
  @internalProperty() warningMessages: any = [];
  @internalProperty() errorMessages: any = [];

  stateChanged(state: State) {
    const newGltfUrl = getGltfUrl(state);
    if (newGltfUrl !== this.gltfUrl && typeof newGltfUrl === 'string') {
      this.gltfUrl = newGltfUrl;
      this.awaitLoad(this.gltfUrl);
    }
  }

  async awaitLoad(url: string) {
    this.report = await validateGltf(url);
    this.infoMessages = [];
    this.hintMessages = [];
    this.warningMessages = [];
    this.errorMessages = [];
    this.severityTitle = 'Model Details';
    this.severityColor = '#202020';
    if (this.report.issues.numInfos) {
      this.infoMessages = this.report.infos;
      this.severityColor = '#2196f3';
      this.severityTitle = 'Info';
    }
    if (this.report.issues.numHints) {
      this.hintMessages = this.report.hints;
      this.severityColor = '#8bc34a';
      this.severityTitle = 'Hint';
    }
    if (this.report.issues.numWarnings) {
      this.warningMessages = this.report.warnings;
      this.severityColor = '#f9a825';
      this.severityTitle = 'Warning';
    }
    if (this.report.issues.numErrors) {
      this.errorMessages = this.report.errors;
      this.severityColor = '#f44336';
      this.severityTitle = 'Error';
    }
  }

  onOpen() {
    this.validationModal.open();
  }

  render() {
    return html`
    ${
        this.severityTitle.length > 0 ? html`
<mwc-button unelevated style="align-self: center;"
  @click=${this.onOpen} style="--mdc-theme-primary: ${this.severityColor}">
  ${this.severityTitle}
</mwc-button>` :
                                        html``}
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
