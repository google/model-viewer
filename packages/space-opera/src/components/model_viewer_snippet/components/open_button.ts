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
import {Dropdown} from '../../shared/dropdown/dropdown.js';
import {parseHotspotsFromSnippet} from '../parse_hotspot_config.js';
import {dispatchConfig} from '../reducer.js';

@customElement('me-open-modal')
export class OpenModal extends LitElement {
  static styles = openModalStyles;

  @internalProperty() isOpen: boolean = false;
  @internalProperty() errors: string[] = [];
  @query('textarea#mv-input') private readonly textArea!: HTMLInputElement;

  async handleSubmitSnippet(value?: string) {
    if (!this.textArea)
      return;
    this.errors = [];
    let inputText: string = '';
    if (value === undefined) {
      inputText = this.textArea.value.trim();
    } else {
      inputText = value;
    }

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
  }

  updated() {
    // Work-around closureZ issue.
    this.textArea.style.backgroundColor =
        this.errors.length > 0 ? 'pink' : 'white';
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  saveAndClose(event: Event) {
    event.preventDefault();
    this.handleSubmitSnippet();
    if (this.errors.length === 0) {
      this.isOpen = false;
    }
  }

  render() {
    const exampleLoadableSnippet = `<model-viewer
  src='https://modelviewer.dev/shared-assets/models/Astronaut.glb'
  shadow-intensity="1" camera-controls>
</model-viewer>`;

    return html`
<paper-dialog id="file-modal" modal ?opened=${this.isOpen}>
  <div class="FileModalContainer">
    <div class="FileModalHeader">
      <div>Edit &lt;model-viewer&gt; Snippet</div>
    </div>
    <div style="font-size: 14px; font-weight: 500; margin-top: 10px; color: white">Edit&#47; Paste &lt;model-viewer&gt Snippet</div>
      <div class="InnerSnippetModal">
        <textarea id="mv-input" rows=15>${exampleLoadableSnippet}</textarea>
        ${this.errors.map(error => html`<div>${error}</div>`)}
      </div>
    </div>
  <div class="FileModalCancel">
    <mwc-button unelevated icon="save_alt" class="SaveButton"
      @click=${this.saveAndClose}>Save</mwc-button>
    <mwc-button unelevated icon="cancel" 
      @click=${this.close}>Cancel</mwc-button>
  </div>
</paper-dialog>`;
  }
}

/**
 * A button to open file resources.
 */
@customElement('me-import-card')
export class ImportCard extends LitElement {
  @query('me-open-modal#open-modal') openModal!: OpenModal;
  @query('me-file-modal') fileModal!: FileModalElement;
  @internalProperty() selectedDefaultOption: number = 0;

  async onUploadGLB() {
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
  }

  onSnippetOpen() {
    this.openModal.open();
  }

  onDefaultSelect(event: CustomEvent) {
    const dropdown = event.target as Dropdown;
    const value = dropdown.selectedItem?.getAttribute('value') || undefined;
    let snippet = '';
    const simpleMap = {
      'Astronaut': 1,
      'Horse': 2,
      'RobotExpressive': 3,
      'alpha-blend-litmus': 4
    };
    const advancedMap = {
      'BoomBox': 5,
      'BrainStem': 6,
      'Corset': 7,
      'DamagedHelmet': 8,
      'FlightHelmet': 9,
      'Lantern': 10,
      'Suzanne': 11,
      'SpecGlossVsMetalRough': 12
    };
    if (value !== undefined) {
      if (value === 'none') {
        this.selectedDefaultOption = 0;
        return;
      } else if (value in simpleMap) {
        // @ts-ignore
        this.selectedDefaultOption = simpleMap[value];
        snippet = `<model-viewer
  src='https://modelviewer.dev/shared-assets/models/${value}.glb'
  shadow-intensity="1" camera-controls>
</model-viewer>`;
      } else if (value in advancedMap) {
        // @ts-ignore
        this.selectedDefaultOption = advancedMap[value];
        snippet = `<model-viewer
  src='https://modelviewer.dev/shared-assets/models/glTF-Sample-Models/2.0/${
            value}/glTF-Binary/${value}.glb'
  shadow-intensity="1" camera-controls>
</model-viewer>`;
      }

      this.openModal.handleSubmitSnippet(snippet);
    }
  }

  render() {
    return html`
    <me-open-modal id="open-modal"></me-open-modal>
    <me-file-modal accept=".glb,model/gltf-binary"></me-file-modal>
    <div style="font-size: 14px; font-weight: 500; margin-bottom: 10px;">Select Model:</div>
    <div style="display: flex; justify-content: space-between">
      <me-dropdown
        .selectedIndex=${this.selectedDefaultOption}
        slot="content" style="width: 60%; align-self: center;"
        @select=${this.onDefaultSelect}
      >
        <paper-item value='none'>None</paper-item>
        <paper-item value='Astronaut'>Astronaut</paper-item>
        <paper-item value='Horse'>Horse</paper-item>
        <paper-item value='RobotExpressive'>Robot</paper-item>
        <paper-item value='alpha-blend-litmus'>Transparency Test</paper-item>
        <paper-item value='BoomBox'>Boom Box</paper-item>
        <paper-item value='BrainStem'>Brain Stem</paper-item>
        <paper-item value='Corset'>Corset</paper-item>
        <paper-item value='DamagedHelmet'>Damaged Helmet</paper-item>
        <paper-item value='Lantern'>Lantern</paper-item>
        <paper-item value='SpecGlossVsMetalRough'>Water Bottles</paper-item>
      </me-dropdown>
      <mwc-button unelevated
        icon="file_upload" style="width: 35%; align-self: center;"
        @click=${this.onUploadGLB}>
        GLB
      </mwc-button>
    </div>
    `;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'me-import-card': ImportCard;
    'me-open-modal': OpenModal;
  }
}
