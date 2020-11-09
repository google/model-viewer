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
import '../../file_modal/file_modal.js';

import {createSafeObjectUrlFromArrayBuffer} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'
import {customElement, html, internalProperty, LitElement, query} from 'lit-element';

import {dispatchCameraControlsEnabled, getConfig} from '../../../components/config/reducer.js';
import {reduxStore} from '../../../space_opera_base.js';
import {openModalStyles} from '../../../styles.css.js';
import {extractStagingConfig} from '../../../types.js';
import {FileModalElement} from '../../file_modal/file_modal.js';
import {dispatchSetHotspots} from '../../hotspot_panel/reducer.js';
import {dispatchGltfUrl} from '../../model_viewer_preview/reducer.js';
import {dispatchConfig} from '../../model_viewer_snippet/reducer.js';

@customElement('me-open-modal')
export class OpenModal extends LitElement {
  static styles = openModalStyles;
  @query('me-file-modal') fileModal!: FileModalElement;
  @internalProperty() isOpen: boolean = false;

  async onClick() {
    const files = await this.fileModal.open();
    if (!files) {
      /// The user canceled the previous upload
      return;
    }
    const arrayBuffer = await files[0].arrayBuffer();
    const url = createSafeObjectUrlFromArrayBuffer(arrayBuffer).unsafeUrl;
    reduxStore.dispatch(dispatchGltfUrl(url));
    dispatchConfig(extractStagingConfig(getConfig(reduxStore.getState())));
    // enable camera controls by default
    reduxStore.dispatch(dispatchCameraControlsEnabled(true));
    reduxStore.dispatch(dispatchSetHotspots([]));
    this.close();
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  render() {
    return html`
<me-file-modal accept=".glb,model/gltf-binary"></me-file-modal>
<paper-dialog id="file-modal" modal ?opened=${this.isOpen}>
  <div class="FileModalContainer" @click=${this.onClick}>
    <div class="FileModalHeader">
      <div>Upload GLB</div>
    </div>
    <label for="file-input" class="custom-file-upload">
        <img src="https://fonts.gstatic.com/s/i/materialiconsextended/upload_file/v5/black-24dp/1x/baseline_upload_file_black_24dp.png"/>
        <div>Click to Upload</div>
    </label>
  </div>
  <mwc-button class="FileModalCancel" icon="cancel" 
    @click=${this.close}></mwc-button>
</paper-dialog>`;
  }
}

/**
 * A button to open file resources.
 */
@customElement('me-open-button')
export class OpenButton extends LitElement {
  @query('me-open-modal#open-modal') openModal!: FileModalElement;

  onClick() {
    this.openModal.open();
  }

  render() {
    return html`
        <me-open-modal id="open-modal"></me-open-modal>
        <mwc-button unelevated
          icon="upload_file"
          @click=${this.onClick}>
          Import GLB
        </mwc-button>`;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'me-open-button': OpenButton;
    'me-open-modal': OpenModal;
  }
}
