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
// @ts-ignore
import QRious from 'qrious';

import {INITIAL_STATE, ModelViewerSnippetState, State} from '../../../types.js';
import {getConfig, getModelViewerSnippet} from '../../config/reducer.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
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
  @internalProperty() lastMobileUrls: URLs = {gltf: '', env: '', poster: ''};

  @internalProperty()
  snippet: ModelViewerSnippetState = INITIAL_STATE.entities.modelViewerSnippet;
  @internalProperty()
  lastMobileSnippet: ModelViewerSnippetState =
      INITIAL_STATE.entities.modelViewerSnippet;

  @query('canvas#qr') canvasQR!: HTMLCanvasElement;
  @internalProperty() isNewQRCode = true;

  stateChanged(state: State) {
    const gltfURL = getGltfUrl(state);
    if (gltfURL !== undefined) {
      this.isNotDeployable = false;
    }

    this.urls.gltf = gltfURL;
    this.urls.env = getConfig(state).environmentImage;
    this.urls.poster = getConfig(state).poster;
    this.snippet = getModelViewerSnippet(state);
  }

  urlsHaveChanged() {
    return JSON.stringify(this.urls) !== JSON.stringify(this.lastMobileUrls);
  }

  snippetHasChanged() {
    return JSON.stringify(this.snippet) !==
        JSON.stringify(this.lastMobileSnippet);
  }

  get viewableSite(): string {
    // TODO: modify to read current site, such as localhost or modelviewer
    // first.
    return `https://www.modelviewer.dev/editor/view/${this.pipingServerId}`;
  }

  get srcPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-srcs-${this.pipingServerId}`;
  }

  get snippetPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-state-${this.pipingServerId}`;
  }

  async postInfo() {
    if (this.isNewQRCode) {
      new QRious({element: this.canvasQR, value: this.viewableSite});
      this.isNewQRCode = false
    }

    if (this.urlsHaveChanged()) {
      // sends model, env image, and poster image
      await fetch(this.srcPipeUrl, {
        method: 'POST',
        body: JSON.stringify(this.urls),
      });

      // update the urls last sent
      this.lastMobileUrls = {...this.urls};

      // TODO: remove test fetch
      fetch(this.srcPipeUrl)
          .then(response => response.json())
          .then(json => console.log('urls', json));
    }

    if (this.snippetHasChanged()) {
      // sends <model-viewer> snippet via relevant redux state
      await fetch(this.snippetPipeUrl, {
        method: 'POST',
        body: JSON.stringify(this.snippet),
      });

      // update snippet last sent
      this.lastMobileSnippet = {...this.snippet};

      // TODO: remove test fetch
      fetch(this.snippetPipeUrl)
          .then(response => response.json())
          .then(json => console.log('snippet', json));
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
      <a href=${this.viewableSite} style="color: white;">
        ${this.viewableSite}
      </a>
    </div>
    <mwc-button unelevated icon="cached" @click=${this.postInfo}>
      Refresh Mobile
    </mwc-button>
    `
  }

  render() {
    return html`
    <div style="font-size: 14px; font-weight: 500; margin: 16px 0px 10px 0px;">Mobile View:</div>
    ${!this.isDeployed ? this.renderDeployButton() : html``}
    <canvas id="qr"></canvas>
    ${this.isDeployed ? this.renderMobileInfo() : html``}
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': MobileView;
  }
}
