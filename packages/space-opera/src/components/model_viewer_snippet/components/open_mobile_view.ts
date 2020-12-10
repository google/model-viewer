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

import {State} from '../../../types.js';
import {getCamera} from '../../camera_settings/reducer.js';
import {getConfig} from '../../config/reducer.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {getHotspots} from '../../hotspot_panel/reducer.js';
import {getEdits} from '../../materials_panel/reducer.js';
import {getGltfUrl} from '../../model_viewer_preview/reducer.js';

interface URLs {
  gltf: string|undefined;
  env: string|undefined;
  poster: string|undefined;
}

/**
 * Section for displaying QR Code and other info related to mobile
 */
@customElement('open-mobile-view')
export class MobileView extends ConnectedLitElement {
  static get styles() {
    return css`
        :host {--mdc-button-disabled-fill-color: rgba(255,255,255,.88)}
        `;
  }

  @internalProperty() isDeployed = false;
  @internalProperty() isNotDeployable = true;
  @internalProperty() pipingServerId = 'bobcat';

  @internalProperty() urls: URLs = {gltf: '', env: '', poster: ''};
  @internalProperty() lastUrlsSent: URLs = {gltf: '', env: '', poster: ''};

  @internalProperty() snippet = {};
  @internalProperty() lastSnippetSent = {};

  @query('canvas#qr') canvasQR!: HTMLCanvasElement;
  @internalProperty() isNewQRCode = true;

  stateChanged(state: State) {
    const gltfURL = getGltfUrl(state);
    if (gltfURL !== undefined) {
      this.isNotDeployable = false;
    }

    this.urls = {
      gltf: gltfURL,
      env: getConfig(state).environmentImage,
      poster: getConfig(state).poster
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

  // https://dev.to/kingdaro/indexing-objects-in-typescript-1cgi
  hasKey<O>(obj1: O, obj2: O, key: keyof any): key is keyof O {
    return key in obj1 && key in obj2;
  }

  snippetHasChanged() {
    return JSON.stringify(this.snippet) !==
        JSON.stringify(this.lastSnippetSent);
  }

  async sendSrcBlob(url: string, srcType: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch url: ${url}`);
    }
    const blob = await response.blob();

    await fetch(this.getSrcPipeUrl(srcType), {
      method: 'POST',
      body: blob,
    });

    if (this.hasKey(this.lastUrlsSent, this.urls, srcType)) {
      console.log('updated...', srcType);
      this.lastUrlsSent[srcType] = this.urls[srcType];
    }

    console.log(`sent ${srcType}`);
  }

  isNewSource(src: string|undefined, lastSrc: string|undefined) {
    return src !== undefined && src !== lastSrc;
  }

  async postInfo() {
    // Generate a new QR code and place it on the canvas provided.
    if (this.isNewQRCode) {
      new QRious({element: this.canvasQR, value: this.viewableSite});
      this.isNewQRCode = false
    }

    console.log('urls and sent', this.urls, this.lastUrlsSent);

    // Send new gltf
    if (this.isNewSource(this.urls.gltf, this.lastUrlsSent.gltf)) {
      await this.sendSrcBlob(this.urls.gltf!, 'gltf');
    }

    // Send new snippet. Must always be sent after a model (if applicable) and
    // before the environment image / poster because it will override those
    // values on the other view.
    if (this.snippetHasChanged()) {
      await fetch(this.snippetPipeUrl, {
        method: 'POST',
        body: JSON.stringify(this.snippet),
      });
      this.lastSnippetSent = {...this.snippet};
      console.log('snippet sent');
    }

    // Send new environment image
    if (this.isNewSource(this.urls.env, this.lastUrlsSent.env)) {
      await this.sendSrcBlob(this.urls.env!, 'env');
    }

    // Send new poster
    if (this.isNewSource(this.urls.poster, this.lastUrlsSent.poster)) {
      await this.sendSrcBlob(this.urls.poster!, 'poster');
    }
  }

  onDeploy() {
    this.isDeployed = true;
    this.postInfo();
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

  renderMobileInfo() {
    return html`
    <div style="margin: 10px 0px; overflow-wrap: break-word; word-wrap: break-word;">
      <a href=${this.viewableSite} style="color: white;" target="_blank">
        ${this.viewableSite}
      </a>
    </div>
    <mwc-button unelevated icon="cached" @click=${this.postInfo}>
      Refresh Mobile
    </mwc-button>
    `
  }

  // TODO: Fix where the QR is positioned. Having it in the bottom right of
  // screen makes it hard to get the camera to view it correctly.
  render() {
    return html`
    ${!this.isDeployed ? this.renderDeployButton() : html``}
    <canvas id="qr" style="display: ${
        this.isDeployed ? 'block' : 'none'}"></canvas>
    ${this.isDeployed ? this.renderMobileInfo() : html``}
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': MobileView;
  }
}
