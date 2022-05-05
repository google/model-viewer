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

import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';

import {reduxStore} from '../../space_opera_base.js';
import {openMobileViewStyles} from '../../styles.css.js';
import {timePasses} from '../../test/utils/test_utils.js';
import {ArConfigState, ModelViewerSnippetState, State} from '../../types.js';
import {getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {dispatchModelDirty, getGltfUrl, getModel, getModelViewer} from '../model_viewer_preview/reducer.js';
import {getModelViewerSnippet} from '../model_viewer_snippet/reducer.js';
import {createPoster} from '../utils/render_model_viewer.js';

import {MobileModal} from './components/mobile_modal.js';
import {dispatchAr, dispatchArModes, dispatchSetForcePost, dispatchSetRefreshable, getArConfig, getForcePost, getRefreshable} from './reducer.js';
import {EditorUpdates, MobilePacket, MobileSession, URLs} from './types.js';
import {envToSession, getPingUrl, getRandomInt, getSessionUrl, getWithTimeout, gltfToSession, post, posterToSession} from './utils.js';

const REFRESH_DELAY = 20000;  // 20s

/**
 * Section for displaying QR Code and other info related for mobile devices.
 * This is the section on the editor under the File Manager.
 */
@customElement('open-mobile-view')
export class OpenMobileView extends ConnectedLitElement {
  static styles = openMobileViewStyles;

  @state() pipeId = getRandomInt(1e+20);

  @state() isDeployed = false;
  @state() isDeployable = false;
  @state() isSendingData = false;
  @state() contentHasChanged = false;

  @state() urls: URLs = {gltf: '', env: ''};
  @state() lastUrlsSent: URLs = {gltf: '', env: ''};
  @state() snippet!: ModelViewerSnippetState;
  @state() lastSnippetSent!: ModelViewerSnippetState;
  @state() modelIsDirty = false;

  @query('mobile-modal') mobileModal!: MobileModal;
  @state() haveReceivedResponse: boolean = false;

  @state() arConfig?: ArConfigState;
  @state() defaultToSceneViewer: boolean = false;

  @state() sessionList: MobileSession[] = [];
  @state() mobilePingUrl = getPingUrl(this.pipeId);

  get canRefresh(): boolean {
    return this.isDeployed && this.haveReceivedResponse &&
        !this.isSendingData && this.contentHasChanged;
  }

  stateChanged(state: State) {
    this.arConfig = getArConfig(state);
    const gltfURL = getGltfUrl(state);
    this.isDeployable = gltfURL !== undefined;

    // Update urls with most recent from redux state.
    // If the values are different from this.lastUrlsSent, values are sent when
    // the refresh button is pressed.
    this.urls = {gltf: gltfURL, env: getConfig(state).environmentImage};

    this.snippet = getModelViewerSnippet(state);
    this.modelIsDirty = !!getModel(state)?.isDirty;

    this.contentHasChanged = this.getContentHasChanged();
    // only update if different, need conditional because it would infinitely
    // loop otherwise
    if (getRefreshable(state) !== this.canRefresh) {
      reduxStore.dispatch(dispatchSetRefreshable(this.canRefresh));
    }
    this.defaultToSceneViewer =
        this.arConfig.arModes === 'scene-viewer webxr quick-look';

    if (getForcePost(state) === true) {
      this.postInfo();
      reduxStore.dispatch(dispatchSetForcePost(false));
    }
  }

  // True if any content we'd send to the mobile view has changed.
  getContentHasChanged(): boolean {
    return this.stateHasChanged() || this.isNewModel() ||
        this.isNewSource(this.urls.env, this.lastUrlsSent.env);
  }

  envIsHdr(): boolean {
    return typeof this.urls.env === 'string' &&
        this.urls.env.substr(this.urls.env.length - 4) === '.hdr';
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
        this.modelIsDirty;
  }

  // Used for non-stale sessions, to only send updated content.
  getUpdatedContent(): EditorUpdates {
    return {
      gltfChanged: this.isNewModel(), stateChanged: this.stateHasChanged(),
          posterId: getRandomInt(1e+20),
          envChanged: this.isNewSource(this.urls.env, this.lastUrlsSent.env),
          envIsHdr: this.envIsHdr(), gltfId: getRandomInt(1e+20),
    }
  }

  // If a session didn't received content last time (isStale), we'll force
  // everything to update.
  getStaleContent(): EditorUpdates {
    return {
      gltfChanged: true, stateChanged: true, posterId: getRandomInt(1e+20),
          envChanged: this.urls.env != undefined && this.urls.env !== 'neutral',
          envIsHdr: this.envIsHdr(), gltfId: getRandomInt(1e+20),
    }
  }

  // For a single session, POST all of the relevant content that needs to be
  // updated for that session.
  // A session will remain stale if any of the POSTs fail. A stale session will
  // be forced to send all of the content the next time the refresh button is
  // clicked.
  async sendSessionContent(
      session: MobileSession, updatedContent: EditorUpdates, posterBlob: Blob,
      gltfBlob: Blob|undefined, envBlob: Blob|undefined) {
    if (session.isStale) {
      updatedContent = this.getStaleContent();
    }
    session.isStale = true;

    const packet: MobilePacket = {
      updatedContent: updatedContent,
      snippet: this.snippet,
      urls: this.urls
    };

    await post(JSON.stringify(packet), getSessionUrl(this.pipeId, session.id));

    await post(
        posterBlob,
        posterToSession(this.pipeId, session.id, updatedContent.posterId));

    if (updatedContent.gltfChanged && gltfBlob) {
      await post(
          gltfBlob,
          gltfToSession(this.pipeId, session.id, updatedContent.gltfId));
    }

    if (updatedContent.envChanged && envBlob) {
      await post(
          envBlob,
          envToSession(this.pipeId, session.id, updatedContent.envIsHdr));
    }

    // The isStale flag will stay true if all of the requests are not delivered.
    session.isStale = false;
  }

  async sendSessionContentHolder(
      session: MobileSession, updatedContent: EditorUpdates, posterBlob: Blob,
      gltfBlob: Blob|undefined, envBlob: Blob|undefined) {
    try {
      await this.sendSessionContent(
          session, updatedContent, posterBlob, gltfBlob, envBlob);
    } catch (e) {
      console.log('error posting...');
    }
  }

  // Send any state, model, or environment iamge that has been updated since the
  // last refresh.
  async postInfo() {
    console.log('posting info...');
    if (this.isSendingData) {
      return;
    }
    this.isSendingData = true;
    reduxStore.dispatch(dispatchSetRefreshable(this.canRefresh));
    const sessionList = [...this.sessionList];
    setTimeout(() => {
      this.isSendingData = false;
      reduxStore.dispatch(dispatchSetRefreshable(this.canRefresh));
    }, REFRESH_DELAY);
    const updatedContent = this.getUpdatedContent();
    const staleContent = this.getStaleContent();

    // If any of the sessions are stale, we want to prepare the relavent blobs
    // to POST before we loop through the sessions
    let haveStale = false;
    for (let session of this.sessionList) {
      haveStale = haveStale || session.isStale;
    }

    const gltfBlob = (updatedContent.gltfChanged ||
                      (haveStale && staleContent.gltfChanged)) ?
        await getModelViewer()!.exportScene() :
        undefined;

    let envBlob: Blob|undefined;
    const {env, gltf} = this.urls;
    if (env != null && env !== 'neutral' &&
        (updatedContent.envChanged || (haveStale && staleContent.envChanged))) {
      const response = await fetch(env);
      if (!response.ok) {
        throw new Error(`Failed to fetch url: ${env}`);
      }
      envBlob = await response.blob();
    }

    const posterBlob = await createPoster();

    // Iterate through the list of active mobile sessions, and allow them to
    // post their information asynchronously.
    for (let session of sessionList) {
      this.sendSessionContentHolder(
          session, updatedContent, posterBlob, gltfBlob, envBlob);
    }

    this.lastSnippetSent = {...this.snippet};
    this.lastUrlsSent.env = env;
    this.lastUrlsSent.gltf = gltf;

    reduxStore.dispatch(dispatchModelDirty(false));
    this.contentHasChanged = this.getContentHasChanged();
    reduxStore.dispatch(dispatchSetRefreshable(this.canRefresh));
  }

  // update haveReceivedResponse when a ping was received from the mobile view
  async waitForPing() {
    const response = await getWithTimeout(this.mobilePingUrl);
    if (response.ok) {
      const json: MobileSession = await response.json();
      this.sessionList.push(json);
      // Only update if not currently updating...
      if (!this.isSendingData) {
        this.postInfo();
      }
      this.haveReceivedResponse = true;
      return true;
    }
    return false;
  }

  // If a ping was received, then a new page has been opened or a page was
  // refreshed.
  async pingLoop() {
    try {
      if (!await this.waitForPing()) {
        await timePasses(1000);
      }
    } catch (error) {
      console.log('error...', error);
      await timePasses(1000);
    }
    this.pingLoop();
  }

  openModal() {
    this.mobileModal.open();
  }

  // Initialize AR values and start deploy loop
  onInitialDeploy() {
    this.openModal();
    this.isDeployed = true;
    if (this.arConfig?.arModes === undefined) {
      reduxStore.dispatch(dispatchArModes('webxr scene-viewer quick-look'));
    }
    this.pingLoop();
  }

  onEnableARChange(isEnabled: boolean) {
    reduxStore.dispatch(dispatchAr(isEnabled));
  }

  onSelectArMode(isSceneViewer: boolean) {
    this.defaultToSceneViewer = isSceneViewer;
    if (this.defaultToSceneViewer) {
      reduxStore.dispatch(dispatchArModes('scene-viewer webxr quick-look'));
    } else {
      reduxStore.dispatch(dispatchArModes('webxr scene-viewer quick-look'));
    }
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
      .postInfo=${this.postInfo.bind(this)}
      .defaultToSceneViewer=${this.defaultToSceneViewer}
      .onSelectArMode=${this.onSelectArMode.bind(this)}
      .arConfig=${this.arConfig}
      .onEnableARChange=${this.onEnableARChange.bind(this)}
    >
    </mobile-expandable-section>
    <mobile-modal .pipeId=${this.pipeId}></mobile-modal>
  `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'open-mobile-view': OpenMobileView;
  }
}
