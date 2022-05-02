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

import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';
import {html, LitElement} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {SimpleDropzone} from 'simple-dropzone';

import {dispatchConfig, dispatchEnvrionmentImage, getConfig} from '../../../components/config/reducer.js';
import {reduxStore} from '../../../space_opera_base.js';
import {fileModalStyles, openModalStyles} from '../../../styles.css.js';
import {ArConfigState, extractStagingConfig, ModelViewerConfig, RelativeFilePathsState, State} from '../../../types.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {dispatchSetHotspots} from '../../hotspot_panel/reducer.js';
import {dispatchAddEnvironmentImage} from '../../ibl_selector/reducer.js';
import {dispatchArConfig, getArConfig} from '../../mobile_view/reducer.js';
import {dispatchFileMap, dispatchGltfUrl, dispatchRootPath, getGltfUrl, getModelViewer} from '../../model_viewer_preview/reducer.js';
import {dispatchSetEnvironmentName, dispatchSetModelName, getRelativeFilePaths} from '../../relative_file_paths/reducer.js';
import {Dropdown} from '../../shared/dropdown/dropdown.js';
import {SnippetViewer} from '../../shared/snippet_viewer/snippet_viewer.js';
import {isObjectUrl} from '../../utils/create_object_url.js';
import {renderModelViewer} from '../../utils/render_model_viewer.js';
import {parseHotspotsFromSnippet} from '../parse_hotspot_config.js';
import {applyRelativeFilePaths, dispatchExtraAttributes, getExtraAttributes} from '../reducer.js';

import {parseExtraAttributes, parseSnippet, parseSnippetAr} from './parsing.js';

@customElement('me-open-modal')
export class OpenModal extends ConnectedLitElement {
  static styles = openModalStyles;

  @state() isOpen: boolean = false;
  @state() config: ModelViewerConfig = {};
  @state() arConfig: ArConfigState = {};
  @state() errors: string[] = [];
  @state() gltfUrl?: string;
  @state() relativeFilePaths?: RelativeFilePathsState;
  @query('snippet-viewer#snippet-input')
  private readonly snippetViewer!: SnippetViewer;
  @state() extraAttributes: any = {};

  stateChanged(state: State) {
    this.config = getConfig(state);
    this.arConfig = getArConfig(state);
    this.gltfUrl = getGltfUrl(state);
    this.relativeFilePaths = getRelativeFilePaths(state);
    this.extraAttributes = getExtraAttributes(state);
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
      const arConfig = parseSnippetAr(inputText);

      const extraAttributes = parseExtraAttributes(inputText);
      reduxStore.dispatch(dispatchExtraAttributes(extraAttributes));

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

          const {src} = config;
          const index = src.lastIndexOf('/');
          const rootPath = index === -1 ? './' : src.substr(0, index + 1);
          const fileName = src.substr(index + 1);

          reduxStore.dispatch(dispatchSetModelName(fileName));
          reduxStore.dispatch(dispatchRootPath(rootPath));
          reduxStore.dispatch(dispatchFileMap(new Map<string, File>()));
          reduxStore.dispatch(dispatchGltfUrl(src));
        }
      } catch (e: any) {
        console.log(
            `Could not download 'src' attribute - OK, ignoring it. Error: ${
                e.message}`);
      }

      if (config.environmentImage && isObjectUrl(config.environmentImage)) {
        // If new env image is legal, use it
        const engImageList = config.environmentImage.split('/');
        const envImageName = engImageList[engImageList.length - 1];
        reduxStore.dispatch(dispatchSetEnvironmentName(envImageName));
      } else if (this.config.environmentImage) {
        // else, if there was an env image in the state, leave it alone
        config.environmentImage = this.config.environmentImage;
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
      reduxStore.dispatch(dispatchConfig(config));
      reduxStore.dispatch(dispatchSetHotspots(hotspotConfigs));
      reduxStore.dispatch(dispatchArConfig(arConfig));

    } else {
      this.errors = ['Could not find "model-viewer" tag in snippet'];
    }
  }

  updated() {
    const textArea = this.snippetViewer.snippet;
    // Work-around closureZ issue.
    if (textArea != null) {
      textArea.style.backgroundColor =
          this.errors.length > 0 ? 'pink' : 'white';
    }
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
      this.close();
    }
  }

  render() {
    // Get the model-viewer snippet for the edit snippet modal
    const editedConfig = {...this.config};
    applyRelativeFilePaths(editedConfig, this.gltfUrl, this.relativeFilePaths!);

    const exampleLoadableSnippet = renderModelViewer(
        editedConfig, this.arConfig, this.extraAttributes, {}, undefined);

    return html`
<paper-dialog id="file-modal" modal ?opened=${this.isOpen}>
  <div class="FileModalContainer SnippetModal">
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
  @query('input#file-input') fileInput!: HTMLInputElement;
  @state() selectedDefaultOption: number = 0;
  static styles = fileModalStyles;

  firstUpdated() {
    const dropControl = new SimpleDropzone(getModelViewer(), this.fileInput);
    dropControl.on('drop', ({files}: any) => this.onUpload(files));
  }

  async onUpload(fileMap: Map<string, File>) {
    const modelViewer = getModelViewer();
    let rootPath: string;
    for (const [path, file] of fileMap) {
      const filename = file.name.toLowerCase();
      if (filename.match(/\.(gltf|glb)$/)) {
        const blobURLs: Array<string> = [];
        rootPath = path.replace(file.name, '');

        ModelViewerElement.mapURLs((url: string) => {
          const index = url.lastIndexOf('/');

          const normalizedURL =
              rootPath + url.substr(index + 1).replace(/^(\.?\/)/, '');

          if (fileMap.has(normalizedURL)) {
            const blob = fileMap.get(normalizedURL)!;
            const blobURL = URL.createObjectURL(blob);
            blobURLs.push(blobURL);
            return blobURL;
          }

          return url;
        });

        modelViewer.addEventListener('load', () => {
          blobURLs.forEach(URL.revokeObjectURL);
        });

        const fileURL =
            typeof file === 'string' ? file : URL.createObjectURL(file);
        const state = reduxStore.getState();
        this.selectedDefaultOption = 0;
        reduxStore.dispatch(dispatchSetModelName(file.name));
        reduxStore.dispatch(dispatchRootPath(rootPath));
        reduxStore.dispatch(dispatchFileMap(fileMap));
        reduxStore.dispatch(
            dispatchConfig(extractStagingConfig(getConfig(state))));
        reduxStore.dispatch(dispatchSetHotspots([]));
        reduxStore.dispatch(dispatchGltfUrl(fileURL));
      }
    }

    if (fileMap.size === 1) {
      const file = fileMap.values().next().value;
      const filename = file.name.toLowerCase();
      let uri = URL.createObjectURL(file);
      if (filename.match(/\.(hdr)$/)) {
        uri += '#.hdr';
      } else if (!filename.match(/\.(png|jpg)$/)) {
        return;
      }
      reduxStore.dispatch(dispatchAddEnvironmentImage({uri, name: file.name}));
      reduxStore.dispatch(dispatchEnvrionmentImage(uri));
      reduxStore.dispatch(dispatchSetEnvironmentName(file.name));
    }
  }

  onSnippetOpen() {
    this.openModal.open();
  }

  onDefaultSelect(event: CustomEvent) {
    const dropdown = event.target as Dropdown;
    const key = dropdown.selectedItem?.getAttribute('value');

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
      'Lantern': 9,
      'SpecGlossVsMetalRough': 10
    };

    if (key == null) {
      return;
    }
    if (key === 'none') {
      this.selectedDefaultOption = 0;
      return;
    }

    const rootPath = 'https://modelviewer.dev/shared-assets/models/' +
        (key in advancedMap ? `glTF-Sample-Models/2.0/${key}/glTF-Binary/` :
                              '');
    const fileName = `${key}.glb`;

    this.selectedDefaultOption =
        key in advancedMap ? advancedMap[key] : simpleMap[key];
    const src = rootPath + fileName;

    const state = reduxStore.getState();
    reduxStore.dispatch(dispatchSetModelName(fileName));
    reduxStore.dispatch(dispatchRootPath(rootPath));
    reduxStore.dispatch(dispatchFileMap(new Map<string, File>()));
    reduxStore.dispatch(dispatchConfig(extractStagingConfig(getConfig(state))));
    reduxStore.dispatch(dispatchSetHotspots([]));
    reduxStore.dispatch(dispatchGltfUrl(src));
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
      <mwc-button unelevated label="GLB" icon="file_upload" class="UploadButton">
        <label for="file-input" class="FileInputLabel"/>
      </mwc-button>
      <input type="file" id="file-input" multiple/>

    </div>
    <me-validation></me-validation>
    `;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'me-import-card': ImportCard;
    'me-open-modal': OpenModal;
  }
}
