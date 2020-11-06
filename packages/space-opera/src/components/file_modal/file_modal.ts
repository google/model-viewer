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
import '@polymer/paper-dialog';

import {customElement, html, internalProperty, LitElement, property, PropertyValues, query} from 'lit-element';
import {fileModalStyles} from '../../styles.css.js';

interface BlobArrayResolver {
  resolve: (fileList?: Blob[]|PromiseLike<Blob[]>) => void;
  reject: (error?: Error) => void;
}

/**
 * The file selector modal
 */
@customElement('me-file-modal')
export class FileModalElement extends LitElement {
  static styles = fileModalStyles;

  @internalProperty() show = false;

  /** Proxies to file-input accept attribute */
  @property({type: String}) accept = '';
  @property({type: String}) uploadType = '';
  @query('input#file-input') fileInput!: HTMLInputElement;

  private blobsResolver?: BlobArrayResolver;

  open(): Promise<Blob[]|undefined> {
    // Reset this, so the user can reload the same file again.
    this.fileInput.value = '';
    this.show = true;
    this.blobsResolver?.reject();
    const promise = new Promise<Blob[]>((resolve, reject) => {
      this.blobsResolver = {resolve, reject};
    });
    return promise;
  }

  updated(properties: PropertyValues) {
    if (properties.has('accept')) {
      // LitElement render function is not able to render
      // HTMLInputElement#accept attribute and results in zClosurez, force
      // update here
      this.fileInput.accept = this.accept;
    }
  }

  render() {
    return html`
      <paper-dialog id="file-modal" modal ?opened=${this.show}>
        <div class="FileModalContainer">
          <div class="FileModalHeader">
            <div>Upload ${this.uploadType}</div>
          </div>
          <label for="file-input" class="custom-file-upload">
              <img src="https://fonts.gstatic.com/s/i/materialiconsextended/upload_file/v5/black-24dp/1x/baseline_upload_file_black_24dp.png"/>
              <div>Click to Upload</div>
          </label>
          <input type="file" class="input" id="file-input" @change="${
        this.onFileChange}"/>
        </div>
        <mwc-button class="FileModalCancel" icon="cancel" 
          @click=${this.onCancel}></mwc-button>
      </paper-dialog>
        `;
  }

  onCancel() {
    this.show = false;
    if (!this.blobsResolver) {
      throw new Error('onCancel called but no blobsResolver was presetn');
    }
    this.blobsResolver.resolve(undefined);
    delete this.blobsResolver;
  }

  async onFileChange() {
    this.show = false;

    if (!this.blobsResolver) {
      throw new Error('No file upload resolver found');
    }

    const blobs: Blob[] = [];
    const files = this.fileInput.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        if (files[i]) {
          blobs.push(files[i]);
        }
      }
    }

    this.blobsResolver.resolve(blobs);
    delete this.blobsResolver;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-file-modal': FileModalElement;
  }
}
