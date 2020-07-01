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

import '@material/mwc-button';

import {css, customElement, html, internalProperty} from 'lit-element';

import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {safeDownloadCallback} from '@google/model-viewer-editing-adapter/lib/util/safe_download_callback.js'
import {State} from '../../redux/space_opera_base.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';

/**
 * A button to download file resources.
 */
@customElement('me-download-button')
export class DownloadButton extends ConnectedLitElement {
  static get styles() {
    return css`
        :host {--mdc-button-disabled-fill-color: rgba(255,255,255,.88)}
        `;
  }

  @internalProperty() gltf?: GltfModel;

  stateChanged(state: State) {
    this.gltf = state.gltf;
  }

  // NOTE: Because this is async, it is possible for multiple downloads to be
  // kicked off at once. But this is unlikely, and each download has no
  // side-effects anyway, so nothing bad can happen.
  async onDownloadClick() {
    if (!this.gltf) return;
    const glbBuffer = await this.gltf.packGlb();
    // TODO: Give filename that matches original upload/src
    const filename = 'model.glb';
    await safeDownloadCallback(
        new Blob([glbBuffer], {type: 'model/gltf-binary'}), filename, '')();
  }

  render() {
    return html`<mwc-button unelevated
        icon="save"
        ?disabled=${!this.gltf}
        @click=${this.onDownloadClick}>
          Export GLB</mwc-button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-download-button': DownloadButton;
  }
}
