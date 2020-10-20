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

import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {safeDownloadCallback} from '@google/model-viewer-editing-adapter/lib/util/safe_download_callback.js'
// tslint:disable-next-line:enforce-name-casing JSZip is a class.
import JSZip from 'jszip';
import {css, customElement, html, internalProperty} from 'lit-element';

import {State} from '../../../types.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';

interface Payload {
  blob: Blob;
  filename: string;
  contentType?: string;
}

/**
 * A generic button base class for downloading file resources.
 */
class GenericDownloadButton extends ConnectedLitElement {
  static get styles() {
    return css`
        :host {--mdc-button-disabled-fill-color: rgba(255,255,255,.88)}
        `;
  }

  @internalProperty() buttonLabel = '';
  @internalProperty() preparePayload?: () => Promise<Payload|null>;

  // NOTE: Because this is async, it is possible for multiple downloads to be
  // kicked off at once. But this is unlikely, and each download has no
  // side-effects anyway, so nothing bad can happen.
  async onDownloadClick() {
    const payload = await this.preparePayload!();
    if (!payload)
      return;
    await safeDownloadCallback(
        payload.blob, payload.filename, payload.contentType ?? '')();
  }

  render() {
    return html`<mwc-button unelevated
        icon="save"
        ?disabled=${!this.preparePayload}
        @click=${this.onDownloadClick}>
          ${this.buttonLabel}</mwc-button>`;
  }
}

async function prepareGlbPayload(gltf: GltfModel): Promise<Payload> {
  const glbBuffer = await gltf.packGlb();
  // TODO: Give filename that matches original upload/src
  return {
    blob: new Blob([glbBuffer], {type: 'model/gltf-binary'}),
    filename: 'model.glb',
    contentType: ''
  };
}

async function prepareZipArchive(
    gltf: GltfModel, urls: string[], data: {snippetText: string}):
    Promise<Payload> {
  const zip = new JSZip();

  const glb = await prepareGlbPayload(gltf);
  zip.file(glb.filename, glb.blob);

  for (const url of urls) {
    // TODO:: Check or normalize all URLs as relative paths.
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch url ${url}`);
    }
    zip.file(url, response.blob());
  }

  zip.file('snippet.txt', data.snippetText);

  return {
    blob: await zip.generateAsync({type: 'blob', compression: 'DEFLATE'}),
    filename: 'model.zip'
  };
}

/**
 * A button to download GLB file resources.
 */
@customElement('me-download-button')
export class DownloadButton extends GenericDownloadButton {
  constructor() {
    super();
    this.buttonLabel = 'Export GLB';
  }

  stateChanged(state: State) {
    const {gltf} = state;
    this.preparePayload = gltf ? () => prepareGlbPayload(gltf) : undefined;
  }
}

/**
 * A button to download all file resources as a ZIP.
 */
@customElement('me-export-zip-button')
export class ExportZipButton extends GenericDownloadButton {
  snippetText: string = '';

  constructor() {
    super();
    this.buttonLabel = 'Export ZIP';
  }

  stateChanged(state: State) {
    const {gltf, config} = state;
    if (!gltf) {
      this.preparePayload = undefined;
      return;
    }

    const urls = new Array<string>();
    if (config.environmentImage) {
      urls.push(config.environmentImage);
    }

    // Note that snippet text will necessarily be set manually post-update,
    // and therefore we must pass a containing object (in our case, this) by
    // reference.
    this.preparePayload = () => prepareZipArchive(gltf, urls, this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-download-button': DownloadButton;
    'me-export-zip-button': ExportZipButton;
  }
}
