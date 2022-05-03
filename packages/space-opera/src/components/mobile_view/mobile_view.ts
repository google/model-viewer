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

import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';
import {html, LitElement} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {ifDefined} from 'lit/directives/if-defined.js';

import {toastStyles} from '../../styles.css.js';
import {spread} from '../utils/spread_directive';
import {timePasses} from '../../test/utils/test_utils.js';
import {ArConfigState, BestPracticesState, ModelViewerConfig, ModelViewerSnippetState} from '../../types.js';
import {arButtonCSS, arPromptCSS, progressBarCSS} from '../best_practices/styles.css.js';
import {HotspotConfig, toVector3D} from '../hotspot_panel/types.js';
import {renderCommonChildElements} from '../model_viewer_preview/reducer.js';
import {styles as hotspotStyles} from '../utils/hotspot/hotspot.css.js';

import {styles as mobileStyles} from './styles.css.js';
import {EditorUpdates, MobilePacket, MobileSession, URLs} from './types.js';
import {envToSession, getMobileOperatingSystem, getPingUrl, getRandomInt, getSessionUrl, getWithTimeout, gltfToSession, post, posterToSession} from './utils.js';

const TOAST_TIME = 3000;  // 3s

/**
 * The view loaded at /editor/view/?id=xyz
 * The id links the editor to this mobile session.
 */
@customElement('mobile-view')
export class MobileView extends LitElement {
  static styles = [
    mobileStyles,
    toastStyles,
    hotspotStyles,
    arButtonCSS,
    progressBarCSS,
    arPromptCSS
  ];

  @query('model-viewer') readonly modelViewer!: ModelViewerElement;
  @state() modelViewerUrl: string = '';
  @state() posterUrl: string = '';
  @state() currentBlob?: Blob;

  @state() editorUrls?: URLs;

  @state() config: ModelViewerConfig = {};
  @state() arConfig: ArConfigState = {};
  @state() extraAttributes: any = {};
  @state() hotspots: HotspotConfig[] = [];
  @state() bestPractices?: BestPracticesState;
  @state() envImageUrl: string|undefined;

  @state() pipeId = window.location.search.replace('?id=', '');
  @state() mobilePingUrl = getPingUrl(this.pipeId);

  @state() toastClassName: string = '';
  @state() toastBody: string = '';
  @query('div#overlay') overlay?: HTMLElement;

  @state() sessionId = getRandomInt(1e+20);
  @state() sessionUrl = getSessionUrl(this.pipeId, this.sessionId);
  @state() sessionOs = getMobileOperatingSystem();

  updateState(snippet: ModelViewerSnippetState, urls: URLs) {
    this.editorUrls = urls;
    this.hotspots = snippet.hotspots;
    for (let hotspot of this.hotspots) {
      hotspot.position = toVector3D(
          [hotspot.position.x, hotspot.position.y, hotspot.position.z]);
      if (hotspot.normal) {
        hotspot.normal =
            toVector3D([hotspot.normal.x, hotspot.normal.y, hotspot.normal.z]);
      }
    }

    // Set all of the other relevant snippet information
    this.arConfig = snippet.arConfig;
    this.config = snippet.config;
    this.extraAttributes = snippet.extraAttributes;
    this.bestPractices = snippet.bestPractices;
  }

  repostGLTF = () => {
    try {
      if (this.sessionOs === 'Android') {
        post(this.currentBlob!, this.modelViewerUrl);
      }
    } catch (error) {
      console.log('Post failed on ar button press...');
    }
  };

  // We set modelViewerUrl instead of directly fetching it because
  // scene-viewer requires the same url from the current model-viewer state,
  // and we need to make a POST request to that URL when scene-viewer is
  // triggered.
  waitForData(json: MobilePacket) {
    const updatedContent: EditorUpdates = json.updatedContent;
    this.overlay!.style.display = 'block';

    this.updateState(json.snippet, json.urls);

    this.posterUrl =
        posterToSession(this.pipeId, this.sessionId, updatedContent.posterId);

    if (updatedContent.gltfChanged) {
      this.modelViewerUrl =
          gltfToSession(this.pipeId, this.sessionId, updatedContent.gltfId);
    }

    const {environmentImage} = this.config;
    this.envImageUrl =
        environmentImage == null || environmentImage === 'neutral' ?
        environmentImage :
        envToSession(this.pipeId, this.sessionId, updatedContent.envIsHdr);

    const arButton =
        this.modelViewer.shadowRoot!.getElementById('default-ar-button')!;
    arButton.removeEventListener('click', this.repostGLTF);
    if (this.sceneViewerMode()) {
      // Send a new POST out for each scene-viewer button press
      arButton.addEventListener('click', this.repostGLTF);
    }

    this.overlay!.style.display = 'none';
  }

  initializeToast(json: EditorUpdates) {
    let body = json.gltfChanged ? 'gltf model, ' : '';
    body = json.envChanged ? body.concat('environment image, ') : body;
    body = json.stateChanged ? body.concat('snippet, ') : body;
    body = body.slice(0, body.length - 2).concat('.');
    this.toastBody = `Loading ${body}`;
    this.toastClassName = 'show';
  }

  // Keep listening for a new update from the editor.
  async fetchLoop() {
    const response = await getWithTimeout(this.sessionUrl);
    if (response.ok) {
      this.modelViewer.showPoster();
      const json: MobilePacket = await response.json();
      this.initializeToast(json.updatedContent);
      setTimeout(() => {
        this.toastClassName = '';
      }, TOAST_TIME);
      this.waitForData(json);
      await this.updateComplete;
    } else {
      console.error('Error:', response);
      await timePasses(1000);
    }
  }

  async triggerFetchLoop() {
    try {
      await this.fetchLoop();
    } catch (error) {
      console.log('error...', error);
      await timePasses(1000);
    }
    await this.triggerFetchLoop();
  }

  sceneViewerMode() {
    return this.arConfig.ar &&
        this.arConfig.arModes?.split(' ')[0] === 'scene-viewer';
  }

  // When the model is loaded, we make a post for this specific model for
  // scene-viewer. Subsequently, everytime scene-viewer is opened, we send the
  // POST again.
  async modelIsLoaded() {
    if (!this.sceneViewerMode()) {
      return;
    }
    this.currentBlob = await this.modelViewer.exportScene();
    try {
      await post(this.currentBlob, this.modelViewerUrl);
    } catch (error) {
      console.log('Post failed on model loaded...');
    }
  }

  render() {
    const config = this.config;
    const skyboxImage = (config.useEnvAsSkybox && this.editorUrls?.env) ?
        this.envImageUrl :
        undefined;

    // Renders elements common between mobile and editor.
    const childElements =
        renderCommonChildElements(this.hotspots, this.bestPractices!, false);

    return html`
    <div id="overlay"></div>
    <div class="app">
      <div class="mvContainer">
        <model-viewer ${spread(this.extraAttributes)}
          src=${this.modelViewerUrl}
          ?ar=${ifDefined(!!this.arConfig.ar)}
          ar-modes=${ifDefined(this.arConfig!.arModes)}
          ?autoplay=${!!config.autoplay}
          ?auto-rotate=${!!config.autoRotate}
          ?camera-controls=${!!config.cameraControls}
          environment-image=${ifDefined(this.envImageUrl)}
          skybox-image=${ifDefined(skyboxImage)}
          exposure=${ifDefined(config.exposure)}
          poster=${this.posterUrl}
          reveal=${ifDefined(config.reveal)}
          shadow-intensity=${ifDefined(config.shadowIntensity)}
          shadow-softness=${ifDefined(config.shadowSoftness)}
          camera-target=${ifDefined(config.cameraTarget)}
          camera-orbit=${ifDefined(config.cameraOrbit)}
          field-of-view=${ifDefined(config.fieldOfView)}
          min-camera-orbit=${ifDefined(config.minCameraOrbit)}
          max-camera-orbit=${ifDefined(config.maxCameraOrbit)}
          min-field-of-view=${ifDefined(config.minFov)}
          max-field-of-view=${ifDefined(config.maxFov)}
          @load=${this.modelIsLoaded}
        >
          ${childElements}
        </model-viewer>
      </div>
    </div>
    <div class="${this.toastClassName}" id="snackbar-mobile">
      ${this.toastBody}
    </div>
    `;
  }

  updated() {
    this.modelViewer.cameraOrbit = 'auto auto auto';
    const {cameraOrbit} = this.config;
    if (cameraOrbit) {
      this.modelViewer.cameraOrbit = cameraOrbit.toString();
    }
    this.modelViewer.jumpCameraToGoal();
    this.modelViewer.dismissPoster();
  }

  // Ping the editor
  async ping() {
    const ping: MobileSession = {
      os: getMobileOperatingSystem(),
      id: this.sessionId,
      isStale: true,
    };
    await post(JSON.stringify(ping), this.mobilePingUrl);
  }

  // (Overriding default) Tell editor session that it is ready for data.
  firstUpdated() {
    this.ping();
    this.triggerFetchLoop();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mobile-view': MobileView;
  }
}
