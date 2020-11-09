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

import {parseSnippet} from '@google/model-viewer-editing-adapter/lib/main';
import {createSafeObjectUrlFromArrayBuffer} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'
import {customElement, html, internalProperty, LitElement, query} from 'lit-element';

import {dispatchCameraControlsEnabled, getConfig} from '../../../components/config/reducer.js';
import {reduxStore} from '../../../space_opera_base.js';
import {openModalStyles} from '../../../styles.css.js';
import {extractStagingConfig} from '../../../types.js';
import {FileModalElement} from '../../file_modal/file_modal.js';
import {dispatchSetHotspots} from '../../hotspot_panel/reducer.js';
import {dispatchGltfUrl} from '../../model_viewer_preview/reducer.js';
import {parseHotspotsFromSnippet} from '../parse_hotspot_config.js';
import {dispatchConfig} from '../reducer.js';

@customElement('me-open-modal')
export class OpenModal extends LitElement {
  static styles = openModalStyles;
  @query('me-file-modal') fileModal!: FileModalElement;
  @internalProperty() currentName: string = '';
  @internalProperty() isOpen: boolean = false;


  @query('textarea#mv-input') private readonly textArea!: HTMLInputElement;

  @internalProperty() errors: string[] = [];

  async handleSubmitSnippet(event: Event) {
    event.preventDefault();
    if (!this.textArea)
      return;
    this.errors = [];
    const inputText: string = this.textArea.value.trim();
    if (inputText.match(
            /<\s*model-viewer[^>]*\s*>(\n|.)*<\s*\/\s*model-viewer>/)) {
      const config = parseSnippet(inputText);

      const hotspotErrors: Error[] = [];
      const hotspotConfigs = parseHotspotsFromSnippet(inputText, hotspotErrors);
      for (const error of hotspotErrors) {
        this.errors.push(error.message);
      }

      try {
        // If we can't fetch the snippet's src, don't even bother using it.
        // But still dispatch the config, hotspots, etc.
        if (config.src && (await fetch(config.src)).ok) {
          reduxStore.dispatch(dispatchGltfUrl(undefined));
          // Because of update-batching, we need to sleep first to force reload.
          await new Promise(resolve => {
            setTimeout(resolve, 0);
          });
          reduxStore.dispatch(dispatchGltfUrl(config.src));
        }

        // NOTE: It's important to dispatch these *after* the URL dispatches. If
        // we dispatch the config and THEN clear the model URL, then
        // config.animationName is cleared too (animation UI tries to find the
        // anim by name, can't find it because the model is empty, thus
        // triggering a change event selecting none).
        dispatchConfig(config);
        reduxStore.dispatch(dispatchSetHotspots(hotspotConfigs));
      } catch (e) {
        console.log(
            `Could not download 'src' attribute - OK, ignoring it. Error: ${
                e.message}`);
      }
    } else {
      this.errors = ['Could not find "model-viewer" tag in snippet'];
    }
    this.currentName = 'Astronaut.glb';
  }

  updated() {
    // Work-around closureZ issue.
    this.textArea.style.backgroundColor =
        this.errors.length > 0 ? 'pink' : 'white';
  }

  async onClick() {
    const files = await this.fileModal.open();
    if (!files) {
      /// The user canceled the previous upload
      return;
    }
    const arrayBuffer = await files[0].arrayBuffer();
    // @ts-ignore
    this.currentName = files[0].name;
    const url = createSafeObjectUrlFromArrayBuffer(arrayBuffer).unsafeUrl;
    reduxStore.dispatch(dispatchGltfUrl(url));
    dispatchConfig(extractStagingConfig(getConfig(reduxStore.getState())));
    // enable camera controls by default
    reduxStore.dispatch(dispatchCameraControlsEnabled(true));
    reduxStore.dispatch(dispatchSetHotspots([]));
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  render() {
    const exampleLoadableSnippet = `<model-viewer
  src='https://modelviewer.dev/shared-assets/models/Astronaut.glb'
  shadow-intensity="1" camera-controls>
</model-viewer>`;

    return html`
<me-file-modal accept=".glb,model/gltf-binary"></me-file-modal>
<paper-dialog id="file-modal" modal ?opened=${this.isOpen}>
  <div class="FileModalContainer">
    <div class="FileModalHeader">
      <div>Upload</div>
    </div>
    <div class="OpenModalSection" @click=${this.onClick}>
      <label for="file-input" class="custom-file-upload">
          <img src="https://fonts.gstatic.com/s/i/materialiconsextended/file_upload/v6/black-24dp/1x/baseline_file_upload_black_24dp.png"/>
          <div>Click to Upload</div>
      </label>
      <div>
        ${
        this.currentName === '' ? html`No File Selected` :
                                  html`${this.currentName}`}
      </div>
    </div>
    <div class="OpenModalSection">
      <textarea id="mv-input" rows=10>${exampleLoadableSnippet}</textarea>
      ${this.errors.map(error => html`<div>${error}</div>`)}
      <mwc-button unelevated icon="publish"
        @click=${this.handleSubmitSnippet}
        >Replace &lt;model-viewer&gt; snippet
      </mwc-button>
      <div class="mv-note">Edit the snippet above to replace the
        exportable &lt;model-viewer&gt; snippet and update the editor.
      </div>
      <me-export-panel .isJustOutput=${true}></me-export-panel>
    </div>
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
          icon="file_upload"
          @click=${this.onClick}>
          Upload
        </mwc-button>`;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'me-open-button': OpenButton;
    'me-open-modal': OpenModal;
  }
}
