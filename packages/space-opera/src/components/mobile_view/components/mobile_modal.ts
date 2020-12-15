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

import {customElement, html, internalProperty, property, query} from 'lit-element';
// @ts-ignore, the qrious package isn't typed
import QRious from 'qrious';

import {openModalStyles} from '../../../styles.css.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';

/**
 * Modal for displaying the QR Code & link
 */
@customElement('mobile-modal')
export class MobileModal extends ConnectedLitElement {
  static styles = openModalStyles;

  @property({type: Number}) pipeId = 0;
  @internalProperty() isOpen: boolean = false;
  @internalProperty() isNewQRCode = true;
  @query('canvas#qr') canvasQR!: HTMLCanvasElement;

  get viewableSite(): string {
    const path = window.location.origin + window.location.pathname;
    return `${path}view/?id=${this.pipeId}`;
  }

  open() {
    if (this.isNewQRCode) {
      new QRious({element: this.canvasQR, value: this.viewableSite, size: 200});
      this.isNewQRCode = false
    }
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  render() {
    return html`
<paper-dialog id="file-modal" modal ?opened=${this.isOpen} class="dialog">
  <div class="FileModalContainer">
    <div class="FileModalHeader">
      <div>Mobile View</div>
    </div>
    <div style="font-size: 14px; font-weight: 500; margin: 10px 0px; color: white; word-wrap: break-word; width: 100%;">
      Use the QR Code to open your edited model, environment image, and &ltmodel-viewer&gt snippet on a mobile device to test out AR features. 
      After every subsequent change, click the "Refresh Mobile" button.
    </div>
    <canvas id="qr" style="display: block; margin-bottom: 20px;"></canvas>
    <div style="margin: 10px 0px; overflow-wrap: break-word; word-wrap: break-word;">
      <a href=${this.viewableSite} style="color: white;" target="_blank">
        ${this.viewableSite}
      </a>
    </div>
  </div>
  <div class="FileModalCancel">
    <mwc-button unelevated icon="cancel" 
      @click=${this.close}>Close</mwc-button>
  </div>
</paper-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mobile-modal': MobileModal;
  }
}
