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

import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main';
import {createSafeObjectUrlFromArrayBuffer} from '@google/model-viewer-editing-adapter/lib/util/create_object_url';
import {customElement, html, internalProperty, query, TemplateResult} from 'lit-element';
// @ts-ignore, the qrious package isn't typed
import QRious from 'qrious';

import {reduxStore} from '../../space_opera_base.js';
import {openMobileViewStyles} from '../../styles.css.js';
import {ArConfigState, State} from '../../types.js';
import {getCamera} from '../camera_settings/reducer.js';
import {getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {FileModalElement} from '../file_modal/file_modal.js';
import {getHotspots} from '../hotspot_panel/reducer.js';
import {getEdits} from '../materials_panel/reducer.js';
import {getGltfModel, getGltfUrl} from '../model_viewer_preview/reducer.js';
import {dispatchSetIosName} from '../relative_file_paths/reducer.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {MobileModal} from './components/mobile_modal.js';

import {dispatchAr, dispatchArModes, dispatchIosSrc, getArConfig} from './reducer.js';
import {getRandomInt, MobileSession, URLs} from './types.js';

/**
 * Section for displaying QR Code and other info related for mobile devices.
 * This is the section on the editor under the File Manager.
 */
@customElement('open-mobile-view')
export class OpenMobileView extends ConnectedLitElement {
  static styles = openMobileViewStyles;

  @internalProperty() isDeployed = false;
  @internalProperty() mobileOS: string = '';
  @internalProperty() iosAndNoUsdz = false;
  @query('me-file-modal') fileModal!: FileModalElement;
  @internalProperty() isDeployable = false;
  @internalProperty() isSendingData = false;
  @internalProperty() pipeId = getRandomInt(1e+20);

  @internalProperty() contentHasChanged = false;

  @internalProperty() urls: URLs = {gltf: '', env: '', usdz: ''};
  @internalProperty() lastUrlsSent: URLs = {gltf: '', env: '', usdz: ''};
  @internalProperty() gltfModel?: GltfModel;

  @internalProperty() snippet: any = {};
  @internalProperty() lastSnippetSent: any = {};

  @query('mobile-modal') mobileModal!: MobileModal;
  @internalProperty() haveReceivedResponse: boolean = false;

  @query('me-checkbox#ar') arCheckbox!: CheckboxElement;
  @query('me-checkbox#ar-modes') arModesCheckbox!: CheckboxElement;
  @internalProperty() arConfig?: ArConfigState;
  @internalProperty() defaultToSceneViewer: boolean = false;
  @internalProperty() selectedArMode: number = 0;

  @internalProperty() sessionList: MobileSession[] = [];

  @internalProperty() base = 'https://piping.nwtgck.repl.co/modelviewereditor';
  @internalProperty() snippetPipeUrl = `${this.base}-state-${this.pipeId}`;
  @internalProperty() updatesPipeUrl = `${this.base}-updates-${this.pipeId}`;
  @internalProperty() mobilePingUrl = `${this.base}-ping-${this.pipeId}`;
  @internalProperty() envPipeUrl = `${this.base}-env-${this.pipeId}`;

  stateChanged(state: State) {
    this.arConfig = getArConfig(state);
    this.gltfModel = getGltfModel(state);
    const gltfURL = getGltfUrl(state);
    if (gltfURL !== undefined) {
      this.isDeployable = true;
    }

    this.urls = {
      gltf: gltfURL,
      env: getConfig(state).environmentImage,
      usdz: this.arConfig.iosSrc
    };

    this.snippet = {
      config: getConfig(state),
      arConfig: this.arConfig,
      camera: getCamera(state),
      hotspots: getHotspots(state),
      edits: getEdits(state),
    };

    this.contentHasChanged = this.getContentHasChanged();
    this.defaultToSceneViewer =
        this.arConfig.arModes === 'scene-viewer webxr quick-look';

    this.iosAndNoUsdz =
        this.mobileOS === 'iOS' && this.arConfig.iosSrc === undefined;
  }

  newModelPipeUrl(id: number): string {
    return `https://piping.nwtgck.repl.co/modelviewereditor-model-${
        this.pipeId}-${id}`;
  }

  newUSDZPipeUrl(id: number): string {
    return `https://piping.nwtgck.repl.co/modelviewereditor-usdz-${
        this.pipeId}-${id}`;
  }

  // Returns true if information sent to the mobile view has changed.
  // The usdz and gltf have a dependcy on one another though, where only one is
  // sent, so only one needs to be consistent when checking here.
  getContentHasChanged(): boolean {
    return (
        (this.isNewSource(this.urls.usdz, this.lastUrlsSent.usdz) &&
         this.isNewSource(this.urls.gltf, this.lastUrlsSent.gltf)) ||
        this.stateHasChanged() ||
        this.isNewSource(this.urls.env, this.lastUrlsSent.env));
  }

  envIsHdr(): boolean {
    return typeof this.urls.env === 'string' &&
        this.urls.env.substr(this.urls.env.length - 4) === '.hdr';
  }

  editsHaveChanged() {
    if (this.snippet.edits !== undefined &&
        this.lastSnippetSent.edits !== undefined) {
      return JSON.stringify(this.snippet.edits) !==
          JSON.stringify(this.lastSnippetSent.edits);
    }
    return false;
  }

  stateHasChanged() {
    return JSON.stringify(this.snippet) !==
        JSON.stringify(this.lastSnippetSent);
  }

  isNewSource(src: string|undefined, lastSrc: string|undefined) {
    return src !== undefined && (src !== lastSrc);
  }

  isNewModel() {
    return this.isNewSource(this.urls.gltf, this.lastUrlsSent.gltf) ||
        this.editsHaveChanged();
  }

  async prepareGlbBlob(gltf: GltfModel) {
    const glbBuffer = await gltf.packGlb();
    return new Blob([glbBuffer], {type: 'model/gltf-binary'});
  }

  async prepareUSDZ(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch url ${url}`);
    }
    return await response.blob();
  }

  async postContent(content: string|Blob, url: string) {
    const response = await fetch(url, {
      method: 'POST',
      body: content,
    });
    if (response.ok) {
      console.log('Success:', response);
    } else {
      throw new Error(`Failed to post: ${url}`);
    }
  }

  // Create object to tell mobile what information is being sent so it can
  // dynamically send certain GET requests
  getUpdatedContent() {
    return {
      gltfChanged: this.isNewModel(), stateChanged: this.stateHasChanged(),
          envChanged: this.isNewSource(this.urls.env, this.lastUrlsSent.env),
          envIsHdr: this.envIsHdr(), modelIds: getRandomInt(1e+20),
          iosChanged: this.isNewSource(this.urls.usdz, this.lastUrlsSent.usdz)
    }
  }

  // Send any state, model, or image that has been updated since the last update
  // TODO: Anywhere I postInfo, I need to await that call for all of the
  // messages to either send or terminate.
  // This will in essence stop a user from clicking the refresh button too
  // early.
  async postInfo() {
    this.isSendingData = true;
    const updatedContent = this.getUpdatedContent();

    await this.postContent(JSON.stringify(updatedContent), this.updatesPipeUrl);

    // TODO: Update with a unique ID;
    // TODO: Loop through mobile session list.
    // TODO: Zip into single file that is sent out containing:
    // * updatedContent
    // * usdz
    // * gltf
    // * snippet
    // * env image

    if (this.mobileOS === 'iOS') {
      if (updatedContent.iosChanged) {
        const blob = await this.prepareUSDZ(this.urls.usdz!);
        await this.postContent(
            blob, this.newUSDZPipeUrl(updatedContent.modelIds));
        this.lastUrlsSent['usdz'] = this.urls['usdz'];
      }
    }

    if (updatedContent.gltfChanged) {
      const blob = await this.prepareGlbBlob(this.gltfModel!);
      await this.postContent(
          blob, this.newModelPipeUrl(updatedContent.modelIds));
      this.lastUrlsSent['gltf'] = this.urls['gltf'];
    }

    if (updatedContent.stateChanged) {
      await this.postContent(JSON.stringify(this.snippet), this.snippetPipeUrl);
      this.lastSnippetSent = {...this.snippet};
    }

    if (updatedContent.envChanged) {
      const response = await fetch(this.urls.env!);
      if (!response.ok) {
        throw new Error(`Failed to fetch url: ${this.urls.env!}`);
      }
      const blob = await response.blob();
      await this.postContent(blob, this.envPipeUrl);
      this.lastUrlsSent['env'] = this.urls['env'];
    }

    this.contentHasChanged = this.getContentHasChanged();
    this.isSendingData = false;
  }

  // update haveReceivedResponse when a ping was received from the mobile view
  async waitForPing() {
    const response = await fetch(this.mobilePingUrl);
    if (response.ok) {
      const json: MobileSession = await response.json();
      if (json.isPing) {
        this.haveReceivedResponse = true;
        this.sessionList.concat(json);
        this.mobileOS = json.os;  // TODO: We only need to know if there exists
                                  // a iOS device opened.
        return true;
      }
    }
    return false;
  }

  async pingLoop() {
    // if ping is received, then a new page has been opened or the original
    // page was refreshed.
    await this.waitForPing();
    this.pingLoop();
  }

  // Opens the modal that displays the QR Code
  openModal() {
    this.mobileModal.open();
  }

  // An "open port" that waits for mobile to ping the editor
  async onDeploy() {
    this.openModal();
    await this.waitForPing();
    if (this.haveReceivedResponse) {
      this.postInfo();
      this.pingLoop();
    } else {
      this.onDeploy();
    }
  }

  // Initialize AR values and start deploy loop
  async onInitialDeploy() {
    this.isDeployed = true;
    reduxStore.dispatch(dispatchAr(true));
    reduxStore.dispatch(dispatchArModes('webxr scene-viewer quick-look'));
    await this.onDeploy();
  }

  renderDeployButton() {
    return html`
    <mwc-button unelevated
      icon="file_download"
      ?disabled=${!this.isDeployable}
      @click=${this.onInitialDeploy}>
        Deploy Mobile
    </mwc-button>`
  }

  onEnableARChange() {
    reduxStore.dispatch(dispatchAr(this.arCheckbox.checked));
  }

  onSelectArMode() {
    this.defaultToSceneViewer = this.arModesCheckbox.checked;
    if (this.defaultToSceneViewer) {
      reduxStore.dispatch(dispatchArModes('scene-viewer webxr quick-look'));
    } else {
      reduxStore.dispatch(dispatchArModes('webxr scene-viewer quick-look'));
    }
  }

  get optionalMessage(): TemplateResult {
    const isOutOfSync = this.haveReceivedResponse &&
        (!this.isSendingData && this.contentHasChanged);
    if (isOutOfSync) {
      return html`
    <div style="color: #DC143C; margin-top: 5px;">
      Your mobile view is out of sync with the editor.
    </div>`;
    } else if (this.isSendingData) {
      return html`
    <div style="color: white; margin-top: 5px;">
      Sending data to mobile device. Textured models will take some time.
    </div>`
    } else if (!this.haveReceivedResponse) {
      return html`
      <div style="color: white; margin-top: 5px;">
        Use the QR Code to open the mobile viewing page on a mobile device.
      </div>`
    }
    return html``;
  }

  renderMobileInfo() {
    const isOutOfSync = this.haveReceivedResponse &&
        (!this.isSendingData && this.contentHasChanged);
    const outOfSyncColor = isOutOfSync ? '#DC143C' : '#4285F4';
    return html`
    <div>
      <mwc-button unelevated @click=${
        this.openModal} style="margin-bottom: 10px;">
        View QR Code
      </mwc-button>
      <mwc-button unelevated icon="cached" @click=${this.postInfo} 
        ?disabled=${
    !this.haveReceivedResponse || this.isSendingData}
        style="--mdc-theme-primary: ${outOfSyncColor}">
        Refresh Mobile
      </mwc-button>
      ${this.optionalMessage}
    </div>
    <div style="font-size: 14px; font-weight: 500; margin: 16px 0px 10px 0px;">AR Settings:</div>
    <me-checkbox 
      id="ar-modes" 
      label="Default AR Modes to Scene Viewer"
      ?checked="${this.defaultToSceneViewer}"
      @change=${this.onSelectArMode}
      >
    </me-checkbox>
    <me-checkbox 
      id="ar" 
      label="Enable AR"
      ?checked="${!!this.arConfig!.ar}"
      @change=${this.onEnableARChange}
      >
    </me-checkbox>
    `
  }

  async onUploadUSDZ() {
    const files: any = await this.fileModal.open();
    if (!files) {
      /// The user canceled the previous upload
      return;
    }
    const arrayBuffer = await files[0].arrayBuffer();
    reduxStore.dispatch(dispatchSetIosName(files[0].name));
    const url = createSafeObjectUrlFromArrayBuffer(arrayBuffer).unsafeUrl;
    reduxStore.dispatch(dispatchIosSrc(url));
  }

  renderIos() {
    const needUsdzButton = this.iosAndNoUsdz ? '#DC143C' : '#4285F4';
    return html`
    <div style="font-size: 14px; font-weight: 500; margin: 16px 0px 10px 0px;">iOS Settings:</div>
    <mwc-button unelevated icon="file_upload" @click=${this.onUploadUSDZ} 
    style="--mdc-theme-primary: ${needUsdzButton}">
      USDZ
    </mwc-button>
    ${
        this.iosAndNoUsdz ? html`
  <div style="color: #DC143C; margin-top: 5px;">
    Upload a .usdz to view model in AR on an iOS device.
  </div>` :
                            html``}
    `
  }

  render() {
    return html`
    ${!this.isDeployed ? this.renderDeployButton() : html``}
    <mobile-modal .pipeId=${this.pipeId}></mobile-modal>
    ${this.isDeployed ? this.renderMobileInfo() : html``}
    ${this.renderIos()}
    <me-file-modal accept=".usdz"></me-file-modal>
    <div style="margin-bottom: 40px;"></div>
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': OpenMobileView;
  }
}
