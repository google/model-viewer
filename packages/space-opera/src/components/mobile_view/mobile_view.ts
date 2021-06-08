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

import {GltfModel, ModelViewerConfig, unpackGlb} from '@google/model-viewer-editing-adapter/lib/main';
import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';
import {spread} from '@open-wc/lit-helpers';
import {customElement, html, internalProperty, LitElement, query} from 'lit-element';
import {ifDefined} from 'lit-html/directives/if-defined';

import {toastStyles} from '../../styles.css.js';
import {ArConfigState, BestPracticesState, ModelViewerSnippetState} from '../../types.js';
import {arButtonCSS, arPromptCSS, progressBarCSS} from '../best_practices/styles.css.js';
import {applyCameraEdits, Camera, INITIAL_CAMERA} from '../camera_settings/camera_state.js';
import {HotspotConfig, toVector3D} from '../hotspot_panel/types.js';
import {downloadContents, renderCommonChildElements} from '../model_viewer_preview/reducer.js';
import {styles as hotspotStyles} from '../utils/hotspot/hotspot.css.js';

import {styles as mobileStyles} from './styles.css.js';
import {EditorUpdates, MobilePacket, MobileSession, URLs} from './types.js';
import {envToSession, getMobileOperatingSystem, getPingUrl, getRandomInt, getSessionUrl, getWithTimeout, gltfToSession, post, prepareGlbBlob, usdzToSession} from './utils.js';

const TOAST_TIME = 7000;  // 7s

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

  @query('model-viewer') readonly modelViewer?: ModelViewerElement;
  @internalProperty() modelViewerUrl: string = '';
  @internalProperty() iosUrl: string = '';
  @internalProperty() currentBlob?: Blob;
  @internalProperty() usdzBlob?: Blob;

  @internalProperty() editorUrls?: URLs;

  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() arConfig: ArConfigState = {};
  @internalProperty() extraAttributes: any = {};
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() hotspots: HotspotConfig[] = [];
  @internalProperty() bestPractices?: BestPracticesState;
  @internalProperty() envImageUrl: string = '';

  @internalProperty() pipeId = window.location.search.replace('?id=', '');
  @internalProperty() mobilePingUrl = getPingUrl(this.pipeId);

  @internalProperty() toastClassName: string = '';
  @internalProperty() toastBody: string = '';
  @query('div#overlay') overlay?: HTMLElement;

  @internalProperty() sessionId = getRandomInt(1e+20);
  @internalProperty() sessionUrl = getSessionUrl(this.pipeId, this.sessionId);
  @internalProperty() sessionOs = getMobileOperatingSystem();

  get needIosSrc(): boolean {
    return this.sessionOs === 'iOS' && this.iosUrl.length <= 1;
  }

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
    this.camera = snippet.camera;
    this.extraAttributes = snippet.extraAttributes;
    this.bestPractices = snippet.bestPractices;

    // Send a new POST out for each scene-viewer button press
    if (snippet.arConfig.ar) {
      const arButton =
          this.modelViewer?.shadowRoot!.getElementById('default-ar-button')!;
      arButton.addEventListener('click', () => {
        try {
          if (this.sessionOs === 'iOS') {
            post(this.usdzBlob!, this.iosUrl);
          } else {
            post(this.currentBlob!, this.modelViewerUrl);
          }
        } catch (error) {
          console.log('Post failed on ar button press...');
        }
      });
    }
  }

  // Need to fetch the USDZ first so we can POST the USDZ again if
  // someone closes quick-look and then chooses to reopen it.
  async waitForUSDZ(usdzId: number, iosSrcIsReality: boolean) {
    const usdzUrl =
        usdzToSession(this.pipeId, this.sessionId, usdzId, iosSrcIsReality);
    const response = await fetch(usdzUrl);
    if (response.ok) {
      this.usdzBlob = await response.blob();
      this.iosUrl = usdzUrl;
    } else {
      console.error('Error:', response);
    }
  }

  // We set modelViewerUrl instead of directly fetching it because
  // scene-viewer requires the same url from the current model-viewer state,
  // and we need to make a POST request to that URL when scene-viewer is
  // triggered.
  async waitForData(json: MobilePacket) {
    const updatedContent: EditorUpdates = json.updatedContent;
    this.overlay!.style.display = 'block';

    if (updatedContent.stateChanged) {
      this.updateState(json.snippet, json.urls);
      await this.updateComplete;
    }

    if (updatedContent.gltfChanged) {
      this.modelViewerUrl =
          gltfToSession(this.pipeId, this.sessionId, updatedContent.gltfId);
    }

    if (updatedContent.envChanged) {
      this.envImageUrl =
          envToSession(this.pipeId, this.sessionId, updatedContent.envIsHdr);
    }
    if (updatedContent.iosChanged) {
      await this.waitForUSDZ(
          updatedContent.usdzId, updatedContent.iosSrcIsReality);
    }

    this.overlay!.style.display = 'none';
  }

  initializeToast(json: EditorUpdates) {
    let body = json.gltfChanged ? 'gltf model, ' : '';
    body = json.envChanged ? body.concat('environment image, ') : body;
    body = json.stateChanged ? body.concat('snippet, ') : body;
    body = json.iosChanged ? body.concat('usdz model, ') : body;
    body = body.slice(0, body.length - 2).concat('.');
    this.toastBody = `Loading ${body}`;
    this.toastClassName = 'show';
  }

  // Keep listening for a new update from the editor.
  async fetchLoop() {
    const response = await getWithTimeout(this.sessionUrl);
    if (response.ok) {
      const json: MobilePacket = await response.json();
      this.initializeToast(json.updatedContent);
      setTimeout(() => {
        this.toastClassName = '';
      }, TOAST_TIME);
      await this.waitForData(json);
    } else {
      console.error('Error:', response);
    }
  }

  async triggerFetchLoop() {
    try {
      await this.fetchLoop();
    } catch (error) {
      console.log('error...', error);
    }
    await this.triggerFetchLoop();
  }

  // When the model is loaded, we make a post for this specific model for
  // scene-viewer. Subsequently, everytime scene-viewer is opened, we send the
  // POST again.
  async modelIsLoaded() {
    const glTF = await this.modelViewer!.exportScene();
    const file = new File([glTF], 'model.glb');
    const url = URL.createObjectURL(file);

    const glbContents = await downloadContents(url);
    const {gltfJson, gltfBuffer} = unpackGlb(glbContents);
    const gltf = new GltfModel(gltfJson, gltfBuffer, this.modelViewer);
    this.currentBlob = await prepareGlbBlob(gltf);

    try {
      await post(this.currentBlob, this.modelViewerUrl);
    } catch (error) {
      console.log('Post failed on model loaded...');
    }
  }

  renderIosMessage() {
    return html`
    <div class="ios-message">
      Upload a .usdz or .reality file to view your model in AR.
    </div>
    `
  }

  render() {
    const config = {...this.config};
    applyCameraEdits(config, this.camera);
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
        <model-viewer ...=${spread(this.extraAttributes)}
          src=${this.modelViewerUrl}
          ?ar=${ifDefined(!!this.arConfig.ar)}
          ar-modes=${ifDefined(this.arConfig!.arModes)}
          ios-src=${ifDefined(this.iosUrl)}
          ?autoplay=${!!config.autoplay}
          ?auto-rotate=${!!config.autoRotate}
          ?camera-controls=${!!config.cameraControls}
          environment-image=${ifDefined(this.envImageUrl)}
          skybox-image=${ifDefined(skyboxImage)}
          exposure=${ifDefined(config.exposure)}
          poster=${ifDefined(config.poster)}
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
    ${this.needIosSrc ? this.renderIosMessage() : html``}
    `;
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
