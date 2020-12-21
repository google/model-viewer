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
import {customElement, html, internalProperty, query} from 'lit-element';
// @ts-ignore, the qrious package isn't typed
import QRious from 'qrious';

import {reduxStore} from '../../space_opera_base.js';
import {openMobileViewStyles} from '../../styles.css.js';
import {ArConfigState, State} from '../../types.js';
import {getCamera} from '../camera_settings/reducer.js';
import {getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getHotspots} from '../hotspot_panel/reducer.js';
import {getEdits} from '../materials_panel/reducer.js';
import {getGltfModel, getGltfUrl} from '../model_viewer_preview/reducer.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {MobileModal} from './components/mobile_modal.js';

import {dispatchAr, dispatchArModes, getArConfig} from './reducer.js';

interface URLs {
  gltf: string|undefined;
  env: string|undefined;
}

/**
 * Section for displaying QR Code and other info related to mobile
 */
@customElement('open-mobile-view')
export class OpenMobileView extends ConnectedLitElement {
  static styles = openMobileViewStyles;

  @internalProperty() isDeployed = false;
  @internalProperty() isDeployable = false;
  @internalProperty() isSendingData = false;
  @internalProperty() pipeId = this.getRandomInt(1e+20);

  @internalProperty() contentHasChanged = false;

  @internalProperty() urls: URLs = {gltf: '', env: ''};
  @internalProperty() lastUrlsSent: URLs = {gltf: '', env: ''};
  @internalProperty() gltfModel?: GltfModel;

  @internalProperty() snippet: any = {};
  @internalProperty() lastSnippetSent: any = {};

  @query('mobile-modal') mobileModal!: MobileModal;
  @internalProperty() haveReceivedResponse: boolean = false;

  @query('me-checkbox#ar') arCheckbox!: CheckboxElement;
  @internalProperty() arConfig?: ArConfigState;
  @internalProperty() selectedArMode: number = 0;

  @internalProperty() base = 'https://ppng.io/modelviewereditor';
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
    };

    this.snippet = {
      config: getConfig(state),
      arConfig: this.arConfig,
      camera: getCamera(state),
      hotspots: getHotspots(state),
      edits: getEdits(state),
    };

    this.contentHasChanged = this.getContentHasChanged();
  }

  newModelPipeUrl(id: number): string {
    return `https://ppng.io/modelviewereditor-model-${this.pipeId}-${id}`;
  }

  getRandomInt(max: number): number {
    return Math.floor(Math.random() * Math.floor(max));
  }

  // Returns true if any information sent to the mobile view has changed.
  getContentHasChanged(): boolean {
    return (
        this.isNewSource(this.urls.gltf, this.lastUrlsSent.gltf) ||
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
    return src !== undefined && src !== lastSrc;
  }

  isNewModel() {
    return this.isNewSource(this.urls.gltf, this.lastUrlsSent.gltf) ||
        this.editsHaveChanged();
  }

  async prepareGlbBlob(gltf: GltfModel) {
    const glbBuffer = await gltf.packGlb();
    return new Blob([glbBuffer], {type: 'model/gltf-binary'});
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
          envIsHdr: this.envIsHdr, gltfId: this.getRandomInt(1e+20),
    }
  }

  // Send any state, model, or image that has been updated since the last update
  async postInfo() {
    this.isSendingData = true;
    const updatedContent = this.getUpdatedContent();
    await this.postContent(JSON.stringify(updatedContent), this.updatesPipeUrl)

    if (updatedContent.gltfChanged) {
      const blob = await this.prepareGlbBlob(this.gltfModel!);
      await this.postContent(blob, this.newModelPipeUrl(updatedContent.gltfId));
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
      const json = await response.json();
      if (json.isPing) {
        this.haveReceivedResponse = true;
      }
    }
  }

  // Opens the modal that displays the QR Code
  openModal() {
    this.mobileModal.open();
  }

  // Called each time the editor hasn't received a ping from mobile
  async onDeploy() {
    this.openModal();
    await this.waitForPing();
    if (this.haveReceivedResponse) {
      this.postInfo();
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

  onSelectArMode(event: CustomEvent) {
    const dropdown = event.target as Dropdown;
    const key = dropdown.selectedItem?.getAttribute('value') || undefined;
    if (key === 'default' || key === 'webxr') {
      reduxStore.dispatch(dispatchArModes('webxr scene-viewer quick-look'));
    } else if (key === 'scene-viewer') {
      reduxStore.dispatch(dispatchArModes('scene-viewer webxr quick-look'));
    } else if (key === 'quick-look') {
      reduxStore.dispatch(dispatchArModes('quick-look webxr scene-viewer'));
    }
  }

  renderMobileInfo() {
    const isOutOfSync = !this.isSendingData && this.contentHasChanged;
    const outOfSyncColor = isOutOfSync ? '#DC143C' : '#4285F4';
    return html`
    <div>
      <mwc-button unelevated @click=${
        this.openModal} style="margin-bottom: 10px;">
        View QR Code
      </mwc-button>
      <mwc-button unelevated icon="cached" @click=${this.postInfo} 
        ?disabled=${this.isSendingData}
        style="--mdc-theme-primary: ${outOfSyncColor}">
        Refresh Mobile
      </mwc-button>
      ${
        isOutOfSync ? html`
        <div style="color: #DC143C; margin-top: 5px;">
          Your mobile view is out of sync with the editor.
        </div>` :
                      html``}
      ${
        this.isSendingData ? html`
        <div style="color: white; margin-top: 5px;">
          Sending data to mobile device... Textured models will take some time.
        </div>` :
                             html``}
    </div>

    <div style="font-size: 14px; font-weight: 500; margin: 16px 0px 10px 0px;">AR Settings:</div>
    <me-dropdown
        .selectedIndex=${this.selectedArMode}
        slot="content" style="width: 71%;"
        @select=${this.onSelectArMode}
      >
      <paper-item value='default'>Default AR Mode</paper-item>
      <paper-item value='webxr'>WebXR</paper-item>
      <paper-item value='scene-viewer'>Scene Viewer</paper-item>
      <paper-item value='quick-look'>Quick Look</paper-item>
    </me-dropdown>
    <me-checkbox 
      id="ar" 
      label="Enable AR"
      ?checked="${!!this.arConfig!.ar}"
      @change=${this.onEnableARChange}
      >
    </me-checkbox>
    `
  }

  render() {
    return html`
    ${!this.isDeployed ? this.renderDeployButton() : html``}
    <mobile-modal .pipeId=${this.pipeId}></mobile-modal>
    ${this.isDeployed ? this.renderMobileInfo() : html``}
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': OpenMobileView;
  }
}
