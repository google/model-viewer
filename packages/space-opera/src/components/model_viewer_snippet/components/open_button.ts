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

import {ModelViewerConfig, parseSnippet} from '@google/model-viewer-editing-adapter/lib/main';
import {createSafeObjectUrlFromArrayBuffer, isObjectUrl} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'
import {customElement, html, internalProperty, LitElement, query} from 'lit-element';

import {dispatchCameraControlsEnabled, getConfig} from '../../../components/config/reducer.js';
import {reduxStore} from '../../../space_opera_base.js';
import {openModalStyles} from '../../../styles.css.js';
import {extractStagingConfig, RelativeFilePathsState, State} from '../../../types.js';
import {applyCameraEdits, Camera, INITIAL_CAMERA} from '../../camera_settings/camera_state.js';
import {getCamera} from '../../camera_settings/reducer.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {FileModalElement} from '../../file_modal/file_modal.js';
import {dispatchSetHotspots} from '../../hotspot_panel/reducer.js';
import {dispatchGltfUrl, getGltfUrl} from '../../model_viewer_preview/reducer.js';
import {dispatchSetEnvironmentName, dispatchSetModelName, dispatchSetPosterName, getRelativeFilePaths} from '../../relative_file_paths/reducer.js';
import {Dropdown} from '../../shared/dropdown/dropdown.js';
import {SnippetViewer} from '../../shared/snippet_viewer/snippet_viewer.js';
import {renderModelViewer} from '../../utils/render_model_viewer.js';
import {parseHotspotsFromSnippet} from '../parse_hotspot_config.js';
import {applyRelativeFilePaths, dispatchConfig} from '../reducer.js';

@customElement('me-open-modal')
export class OpenModal extends ConnectedLitElement {
  static styles = openModalStyles;

  @internalProperty() isOpen: boolean = false;
  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() errors: string[] = [];
  @internalProperty() gltfUrl?: string;
  @internalProperty() relativeFilePaths?: RelativeFilePathsState;
  @query('snippet-viewer#snippet-input')
  private readonly snippetViewer!: SnippetViewer;

  stateChanged(state: State) {
    this.config = getConfig(state);
    this.camera = getCamera(state);
    this.gltfUrl = getGltfUrl(state);
    this.relativeFilePaths = getRelativeFilePaths(state);
  }

  async handleSubmitSnippet(value?: string) {
    const textArea = this.snippetViewer.snippet;
    if (!textArea)
      return;
    this.errors = [];
    let inputText: string = '';
    if (value === undefined) {
      inputText = textArea.value.trim();
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
          // dispatch new model name
          const fileNameList = config.src.split('/');
          const fileName = fileNameList[fileNameList.length - 1];
          reduxStore.dispatch(dispatchSetModelName(fileName));
        }

        // reset poster
        config.poster = undefined;
        dispatchSetPosterName(undefined);

        if (config.environmentImage && isObjectUrl(config.environmentImage)) {
          // If new env image is legal, use it
          const engImageList = config.environmentImage.split('/');
          const envImageName = engImageList[engImageList.length - 1];
          reduxStore.dispatch(dispatchSetEnvironmentName(envImageName));
        } else if (this.config.environmentImage) {
          // else, if there was an env image in the state, leave it alone
          config.environmentImage = this.config.environmentImage
        } else {
          // else, reset env image
          config.environmentImage = undefined;
          reduxStore.dispatch(dispatchSetEnvironmentName(undefined));
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
    const textArea = this.snippetViewer.snippet;
    // Work-around closureZ issue.
    textArea.style.backgroundColor = this.errors.length > 0 ? 'pink' : 'white';
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
    // Get the model-viewer snippet for the edit snippet modal
    const editedConfig = {...this.config};
    applyCameraEdits(editedConfig, this.camera);
    applyRelativeFilePaths(
        editedConfig, this.gltfUrl, this.relativeFilePaths!, true);

    const exampleLoadableSnippet =
        renderModelViewer(editedConfig, {}, undefined);

    return html`
<paper-dialog id="file-modal" modal ?opened=${this.isOpen}>
  <div class="FileModalContainer">
    <div class="FileModalHeader">
      <div>Edit Snippet</div>
    </div>
    <div style="font-size: 14px; font-weight: 500; margin-top: 10px; color: white">Edit or paste a &lt;model-viewer&gt snippet</div>
      <div class="InnerSnippetModal">
        <snippet-viewer id="snippet-input" .renderedSnippet=${
        exampleLoadableSnippet} .isReadOnly=${false}>
        </snippet-viewer>
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
    const files: any = await this.fileModal.open();
    if (!files) {
      /// The user canceled the previous upload
      return;
    }
    const arrayBuffer = await files[0].arrayBuffer();
    reduxStore.dispatch(dispatchSetModelName(files[0].name));
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
    const key = dropdown.selectedItem?.getAttribute('value') || undefined;
    let snippet = '';
    const simpleMap: any = {
      'Astronaut': 1,
      'Horse': 2,
      'RobotExpressive': 3,
      'alpha-blend-litmus': 4
    };
    const advancedMap: any = {
      'BoomBox': 5,
      'BrainStem': 6,
      'Corset': 7,
      'DamagedHelmet': 8,
      'FlightHelmet': 9,
      'Lantern': 10,
      'Suzanne': 11,
      'SpecGlossVsMetalRough': 12
    };
    const fileName = `${key}.glb`;
    if (key !== undefined) {
      if (key === 'none') {
        this.selectedDefaultOption = 0;
        return;
      } else if (key in simpleMap) {
        this.selectedDefaultOption = simpleMap[key];
        snippet = `<model-viewer
  src='https://modelviewer.dev/shared-assets/models/${fileName}'
  shadow-intensity="1" camera-controls>
</model-viewer>`;
      } else if (key in advancedMap) {
        this.selectedDefaultOption = advancedMap[key];
        snippet = `<model-viewer
  src='https://modelviewer.dev/shared-assets/models/glTF-Sample-Models/2.0/${
            key}/glTF-Binary/${fileName}'
  shadow-intensity="1" camera-controls>
</model-viewer>`;
      }
      reduxStore.dispatch(dispatchSetModelName(fileName));
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
        slot="content" style="align-self: center; width: 71%;"
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
        icon="file_upload" style="align-self: center;"
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
