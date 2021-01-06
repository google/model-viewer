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
import {customElement, html, internalProperty, query} from 'lit-element';
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
import {EditorUpdates, getPingUrl, getRandomInt, getSessionUrl, gltfToSession, MobilePacket, MobileSession, post, prepareGlbBlob, prepareUSDZ, URLs, usdzToSession} from './types.js';

/**
 * Section for displaying QR Code and other info related for mobile devices.
 * This is the section on the editor under the File Manager.
 */
@customElement('open-mobile-view')
export class OpenMobileView extends ConnectedLitElement {
  static styles = openMobileViewStyles;

  @internalProperty() pipeId = getRandomInt(1e+20);

  @internalProperty() isDeployed = false;
  @internalProperty() isDeployable = false;
  @internalProperty() isSendingData = false;
  @internalProperty() contentHasChanged = false;

  @internalProperty() openedIOS: boolean = false;
  @internalProperty() iosAndNoUsdz = false;
  @query('me-file-modal') fileModal!: FileModalElement;

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

  @internalProperty() mobilePingUrl = getPingUrl(this.pipeId);

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
    this.iosAndNoUsdz = this.openedIOS && this.arConfig.iosSrc === undefined;
  }

  // Returns true if information sent to the mobile view has changed.
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

  // Create object to tell mobile what information is being sent so it can
  // dynamically send certain GET requests
  getUpdatedContent(): EditorUpdates {
    return {
      gltfChanged: this.isNewModel(), stateChanged: this.stateHasChanged(),
          envChanged: this.isNewSource(this.urls.env, this.lastUrlsSent.env),
          envIsHdr: this.envIsHdr(), gltfId: getRandomInt(1e+20),
          usdzId: getRandomInt(1e+20),
          iosChanged: this.isNewSource(this.urls.usdz, this.lastUrlsSent.usdz)
    }
  }

  // If a session didn't received content last time, force everything to update
  // this time.
  getStaleContent(): EditorUpdates {
    return {
      gltfChanged: true, stateChanged: true,
          envChanged: this.urls.env !== undefined, envIsHdr: this.envIsHdr(),
          gltfId: getRandomInt(1e+20), usdzId: getRandomInt(1e+20),
          iosChanged: this.urls.usdz !== undefined
    }
  }

  async sendSessionContent(session: MobileSession) {
    let updatedContent = this.getUpdatedContent();

    if (session.isStale) {
      updatedContent = this.getStaleContent();
    }
    session.isStale = true;

    // send to sessionUrl(pipeId, sessionId)
    const packet: MobilePacket = {updatedContent: updatedContent};
    if (updatedContent.stateChanged) {
      packet.snippet = this.snippet;
    }
    if (updatedContent.envChanged) {
      const response = await fetch(this.urls.env!);
      if (!response.ok) {
        throw new Error(`Failed to fetch url: ${this.urls.env!}`);
      }
      const blob = await response.blob();
      packet.environmentImage = blob;
    }

    await post(JSON.stringify(packet), getSessionUrl(this.pipeId, session.id));

    if (session.os === 'iOS' && updatedContent.iosChanged) {
      const blob = await prepareUSDZ(this.urls.usdz!);
      await post(
          blob, usdzToSession(this.pipeId, session.id, updatedContent.usdzId));
    }

    if (updatedContent.gltfChanged) {
      const blob = await prepareGlbBlob(this.gltfModel!);
      await post(
          blob, gltfToSession(this.pipeId, session.id, updatedContent.gltfId));
    }

    // Content sent
    session.isStale = false;
  }

  // Send any state, model, or image that has been updated since the last update
  async postInfo() {
    this.isSendingData = true;
    for (let session of this.sessionList) {
      this.sendSessionContent(session);
    }
  }

  postInfoCleanup() {
    this.lastSnippetSent = {...this.snippet};
    this.lastUrlsSent['env'] = this.urls['env'];
    this.lastUrlsSent['usdz'] = this.urls['usdz'];
    this.lastUrlsSent['gltf'] = this.urls['gltf'];

    this.contentHasChanged = this.getContentHasChanged();
    this.isSendingData = false;
  }

  async triggerPost() {
    await this.postInfo();
    this.postInfoCleanup();
  }

  // update haveReceivedResponse when a ping was received from the mobile view
  async waitForPing() {
    const response = await fetch(this.mobilePingUrl);
    if (response.ok) {
      const json: MobileSession = await response.json();
      this.haveReceivedResponse = true;
      this.sessionList.concat(json);
      if (json.os === 'iOS') {
        this.openedIOS = true;
      }
      return true;
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

  // An "open port" is waiting for at least one mobile session to ping the
  // editor
  async onDeploy() {
    this.openModal();
    const wasPinged = await this.waitForPing();
    if (wasPinged) {
      this.triggerPost();
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

  render() {
    return html`
    <mobile-expandable-section 
      .isDeployed=${this.isDeployed} 
      .isDeployable=${this.isDeployable}
      .onInitialDeploy=${this.onInitialDeploy.bind(this)}
      .haveReceivedResponse=${this.haveReceivedResponse}
      .isSendingData=${this.isSendingData}
      .contentHasChanged=${this.contentHasChanged}
      .openModal=${this.openModal.bind(this)}
      .triggerPost=${this.triggerPost.bind(this)}
      .defaultToSceneViewer=${this.defaultToSceneViewer}
      .onSelectArMode=${this.onSelectArMode.bind(this)}
      .arConfig=${this.arConfig}
      .onEnableARChange=${this.onEnableARChange.bind(this)}
      .iosAndNoUsdz=${this.iosAndNoUsdz}
      .onUploadUSDZ=${this.onUploadUSDZ.bind(this)}
    >
    </mobile-expandable-section>
    <me-file-modal accept=".usdz"></me-file-modal>
    <mobile-modal .pipeId=${this.pipeId}></mobile-modal>
    <div style="margin-bottom: 40px;"></div>
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': OpenMobileView;
  }
}
