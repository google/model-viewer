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

import '@material/mwc-button';

import {customElement, html, LitElement, property} from 'lit-element';

import {styles} from './styles.css.js';

/**
 * A styled checkbox with label
 */
@customElement('me-card')
export class CardElement extends LitElement {
  static styles = styles;
  @property({type: String}) title = '';
  @property({type: String}) functionId = '';
  @property({type: String}) functionTitle = '';
  @property({type: Function}) uploadFunction?: Function;
  @property({type: Function}) copyFunction?: Function;
  @property({type: Function}) removeFunction?: Function;
  @property({type: Function}) revertFunction?: Function;
  @property({type: Boolean}) hasError?: boolean;

  render() {
    const hasError = this.hasError ? 'error' : '';
    const upload = this.uploadFunction !== undefined ? html`
    <mwc-button class="upload" id="uploadButton"
      icon="upload_file" @click="${this.uploadFunction}">
    </mwc-button>` :
                                                       html``;
    const copy = this.copyFunction !== undefined ? html`
    <mwc-button class="upload"
      icon="file_copy" @click="${this.copyFunction}">
    </mwc-button>` :
                                                   html``;
    const remove = this.removeFunction !== undefined ? html`
    <mwc-button class="upload" id="remove-hotspot"
      icon="delete"
      @click="${this.removeFunction}">
    </mwc-button>
    ` :
                                                       html``;
    const undo = this.revertFunction !== undefined ? html`
    <mwc-button class="upload" id=${this.functionId}
      icon="undo"
      title=${this.functionTitle}
      @click="${this.revertFunction}">
    </mwc-button>
    ` :
                                                     html``;
    return html`
    <div class="card ${hasError}">
      <div class="container">
        <div class="header-container">
          <div class="header">${this.title}</div> 
          ${upload}
          ${copy}
          ${remove}
          ${undo}
        </div>
        <div class="content-container">
          <span slot="content">
            <slot name="content"></slot>
          </span>
        </div>
      </div>
    </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-card': CardElement;
  }
}
