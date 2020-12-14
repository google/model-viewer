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

import {css, customElement, html, internalProperty, query} from 'lit-element';
// @ts-ignore, the qrious package isn't typed
import QRious from 'qrious';

import {openModalStyles} from '../../../styles.css.js';
import {State} from '../../../types.js';
import {getCamera} from '../../camera_settings/reducer.js';
import {getConfig} from '../../config/reducer.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {getHotspots} from '../../hotspot_panel/reducer.js';
import {getEdits} from '../../materials_panel/reducer.js';
import {getGltfUrl} from '../../model_viewer_preview/reducer.js';

@customElement('mobile-modal')
export class MobileModal extends ConnectedLitElement {
  static styles = openModalStyles;

  @internalProperty() isOpen: boolean = false;
  @internalProperty() pipingServerId = 'bobcat';

  @internalProperty() isNewQRCode = true;
  @query('canvas#qr') canvasQR!: HTMLCanvasElement;

  get viewableSite(): string {
    const path = window.location.origin + window.location.pathname;
    return `${path}view/?id=${this.pipingServerId}`;
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
      Use QR Code to load your current glb, environment image, poster and &ltmodel-viewer&gt state. For every change afterwards, click the "Refresh Mobile" button. 
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

interface URLs {
  gltf: string|undefined;
  env: string|undefined;
}

/**
 * Section for displaying QR Code and other info related to mobile
 */
@customElement('open-mobile-view')
export class OpenMobileView extends ConnectedLitElement {
  static get styles() {
    return css`
        :host {--mdc-button-disabled-fill-color: rgba(255,255,255,.88)}
        `;
  }

  @internalProperty() isDeployed = false;
  @internalProperty() isNotDeployable = true;
  // TODO: Create unique id for each session...
  @internalProperty() pipingServerId = 'bobcat';

  @internalProperty() urls: URLs = {gltf: '', env: ''};
  @internalProperty() lastUrlsSent: URLs = {gltf: '', env: ''};

  @internalProperty() snippet = {};
  @internalProperty() lastSnippetSent = {};

  @query('mobile-modal') mobileModal!: MobileModal;
  @internalProperty() haveReceivedResponse: boolean = false;

  // TODO: Keep consistency between viewing and open session...

  stateChanged(state: State) {
    const gltfURL = getGltfUrl(state);
    if (gltfURL !== undefined) {
      this.isNotDeployable = false;
    }

    this.urls = {
      gltf: gltfURL,
      env: getConfig(state).environmentImage,
    };
    this.snippet = {
      config: getConfig(state),
      camera: getCamera(state),
      hotspots: getHotspots(state),
      edits: getEdits(state),
    };
  }

  get viewableSite(): string {
    return `${window.location.href}view/?id=${this.pipingServerId}`;
  }

  getSrcPipeUrl(srcType: string): string {
    return `https://ppng.io/modelviewereditor-srcs-${srcType}-${
        this.pipingServerId}`;
  }

  get snippetPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-state-${this.pipingServerId}`;
  }

  get updatesPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-updates-${this.pipingServerId}`;
  }

  get mobilePing(): string {
    return `https://ppng.io/modelviewereditor-ping-${this.pipingServerId}`;
  }

  get envIsHdr(): boolean {
    return typeof this.urls.env === 'string' &&
        this.urls.env.substr(this.urls.env.length - 4) === '.hdr';
  }

  stateHasChanged() {
    return JSON.stringify(this.snippet) !==
        JSON.stringify(this.lastSnippetSent);
  }

  // https://dev.to/kingdaro/indexing-objects-in-typescript-1cgi
  hasKey<O>(obj1: O, obj2: O, key: keyof any): key is keyof O {
    return key in obj1 && key in obj2;
  }

  async sendSrcBlob(url: string, srcType: string) {
    // Get the blob from the url for glbs, posters or environment images
    const response = await fetch(url);
    if (!response.ok) {
      // TODO: Throw up a popup that says this failed...
      throw new Error(`Failed to fetch url: ${url}`);
    }
    const blob = await response.blob();

    // Send the blob to the url, which varies based on what is sent
    await fetch(this.getSrcPipeUrl(srcType), {
      method: 'POST',
      body: blob,
    })
        .then(response => {
          console.log('Success:', response);
        })
        .catch((error) => {
          // TODO: Throw up a popup that says this failed...
          console.log('Error:', error);
          throw new Error(`Failed to post: ${this.getSrcPipeUrl(srcType)}`);
        });

    // Update the lastUrlsSent object to equal the current url
    if (this.hasKey(this.lastUrlsSent, this.urls, srcType)) {
      this.lastUrlsSent[srcType] = this.urls[srcType];
    }
  }

  isNewSource(src: string|undefined, lastSrc: string|undefined) {
    return src !== undefined && src !== lastSrc;
  }

  getUpdatedContent() {
    return {
      gltfChanged: this.isNewSource(this.urls.gltf, this.lastUrlsSent.gltf),
          stateChanged: this.stateHasChanged(),
          envChanged: this.isNewSource(this.urls.env, this.lastUrlsSent.env),
          envIsHdr: this.envIsHdr
    }
  }

  async sendObject(obj: Object, url: string) {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(obj),
    })
        .then(response => {
          console.log('Success:', response);
        })
        .catch((error) => {
          // TODO: Throw up a popup that says this failed...
          console.log('Error:', error);
          throw new Error(`Failed to post: ${url}`);
        });
  }

  /* Send any state, model, or image that has been updated since the last time
   * the information was sent. */
  async postInfo() {
    const updatedContent = this.getUpdatedContent();
    await this.sendObject(updatedContent, this.updatesPipeUrl)

    // TODO: Add security features to ensure the objects received are of the
    // correct type.

    if (updatedContent.gltfChanged) {
      await this.sendSrcBlob(this.urls.gltf!, 'gltf');
    }

    if (updatedContent.stateChanged) {
      await this.sendObject(this.snippet, this.snippetPipeUrl);
      this.lastSnippetSent = {...this.snippet};
    }

    if (updatedContent.envChanged) {
      await this.sendSrcBlob(this.urls.env!, 'env');
    }
  }

  async waitForPing() {
    await fetch(this.mobilePing)
        .then(response => response.json())
        .then(responseJson => {
          if (responseJson.isPing) {
            this.haveReceivedResponse = true;
          }
        })
        .catch((error) => {
          console.error('Error:', error);
        });
  }

  openModal() {
    this.mobileModal.open();
  }

  async onDeploy() {
    this.mobileModal.open();
    this.isDeployed = true;
    await this.waitForPing();
    if (this.haveReceivedResponse) {
      this.postInfo();
    } else {
      // TODO: Add a toasty thing to tell user to open other window...
      this.onDeploy();
    }
  }

  renderDeployButton() {
    return html`
    <mwc-button unelevated
      icon="file_download"
      ?disabled=${this.isNotDeployable}
      @click=${this.onDeploy}>
        Deploy Mobile
    </mwc-button>`
  }

  // TODO: Clean up buttons...
  renderMobileInfo() {
    return html`
    <div style="margin: 10px 0px; overflow-wrap: break-word; word-wrap: break-word;">
      <a href=${this.viewableSite} style="color: white;" target="_blank">
        ${this.viewableSite}
      </a>
    </div>
    <mwc-button unelevated @click=${this.openModal}>
      View QR Code
    </mwc-button>
    <mwc-button unelevated icon="cached" @click=${this.postInfo}>
      Refresh Mobile
    </mwc-button>
    `
  }

  render() {
    return html`
    ${!this.isDeployed ? this.renderDeployButton() : html``}
    <mobile-modal></mobile-modal>
    ${this.isDeployed ? this.renderMobileInfo() : html``}
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': OpenMobileView;
    'mobile-modal': MobileModal;
  }
}
