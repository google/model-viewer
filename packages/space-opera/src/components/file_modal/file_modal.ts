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

import {customElement, html, LitElement, property, PropertyValues, query} from 'lit-element';
import {fileModalStyles} from '../../styles.css.js';

interface FileArrayResolver {
  resolve: (fileList?: File[]|PromiseLike<File[]>) => void;
  reject: (error?: Error) => void;
}

/**
 * The file selector modal
 */
@customElement('me-file-modal')
export class FileModalElement extends LitElement {
  static styles = fileModalStyles;

  /** Proxies to file-input accept attribute */
  @property({type: String}) accept = '';
  @query('input#file-input') fileInput!: HTMLInputElement;

  private filesResolver?: FileArrayResolver;

  open(): Promise<File[]|undefined> {
    // The user canceled the previous upload
    if (this.filesResolver !== undefined) {
      this.filesResolver.resolve(undefined);
      delete this.filesResolver;
    }
    // Reset this, so the user can reload the same file again.
    // TODO: When user reloads same file, animations don't run...
    this.fileInput.value = '';
    this.fileInput.click();
    const promise = new Promise<File[]|undefined>((resolve, reject) => {
      this.filesResolver = {resolve, reject};
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
  <input type="file" class="input" id="file-input" @change="${
        this.onFileChange}"/>`;
  }

  async onFileChange() {
    if (!this.filesResolver) {
      throw new Error('No file upload resolver found');
    }

    const fileLists: File[] = [];
    const files = this.fileInput.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        if (files[i]) {
          fileLists.push(files[i]);
        }
      }
    }

    this.filesResolver.resolve(fileLists);
    delete this.filesResolver;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-file-modal': FileModalElement;
  }
}
