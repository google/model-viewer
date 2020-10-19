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
import {customElement, html, LitElement, query} from 'lit-element';

import {extractStagingConfig, reduxStore} from '../../../space_opera_base.js';
import {FileModalElement} from '../../file_modal/file_modal.js';
import {dispatchSetHotspots} from '../../hotspot_panel/reducer.js';
import {dispatchGltfUrl} from '../../model_viewer_preview/reducer.js';
import {dispatchConfig} from '../../model_viewer_snippet/reducer.js';

/**
 * A button to open file resources.
 */
@customElement('me-open-button')
export class OpenButton extends LitElement {
  @query('me-file-modal') fileModal!: FileModalElement;

  render() {
    return html`
        <me-file-modal accept=".glb,model/gltf-binary"></me-file-modal>
        <mwc-button unelevated
        icon="folder_open"
        @click=${this.onClick}>
          Import GLB</mwc-button>`;
  }

  async onClick() {
    const files = await this.fileModal.open();
    if (!files) {
      return;
    }
    const arrayBuffer = await files[0].arrayBuffer();
    const url = createSafeObjectUrlFromArrayBuffer(arrayBuffer).unsafeUrl;
    dispatchGltfUrl(url);
    dispatchConfig(extractStagingConfig(reduxStore.getState().config));
    dispatchSetHotspots([]);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-open-button': OpenButton;
  }
}
