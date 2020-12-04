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

import {css, customElement, html, internalProperty} from 'lit-element';
import {State} from '../../../types.js';

import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {getGltfUrl} from '../../model_viewer_preview/reducer.js';

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

  stateChanged(state: State) {
    const gltf = getGltfUrl(state);
    if (gltf !== undefined) {
      this.isNotDeployable = false;
    }
  }

  onDeploy() {
    this.isDeployed = true;
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
    <div>QR Code</div>
    <div>href link</div>
    <div>refresh button</div>
    `
  }

  render() {
    return html`
    <div style="font-size: 14px; font-weight: 500; margin: 16px 0px 10px 0px;">Mobile View:</div>
    ${!this.isDeployed ? this.renderDeployButton() : this.renderMobileInfo()}
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': MobileView;
  }
}
