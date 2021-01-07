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
import {customElement, html, internalProperty, LitElement, query} from 'lit-element';
import {ifDefined} from 'lit-html/directives/if-defined';

import {toastStyles} from '../../styles.css.js';
import {ArConfigState} from '../../types.js';
import {applyCameraEdits, Camera, INITIAL_CAMERA} from '../camera_settings/camera_state.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {downloadContents} from '../model_viewer_preview/reducer.js';
import {renderHotspots} from '../utils/hotspot/render_hotspots.js';

import {styles} from './styles.css.js';
import {EditorUpdates, envToSession, getMobileOperatingSystem, getPingUrl, getRandomInt, getSessionUrl, gltfToSession, MobilePacket, MobileSession, post, prepareGlbBlob, usdzToSession} from './types.js';

/**
 * The view loaded at /editor/view/?id=xyz
 */
@customElement('mobile-view')
export class MobileView extends LitElement {
  static styles = [styles, toastStyles];

  @query('model-viewer') readonly modelViewer?: ModelViewerElement;
  @internalProperty() modelViewerUrl: string = '';
  @internalProperty() iosUrl: string = '';
  @internalProperty() currentBlob?: Blob;

  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() arConfig: ArConfigState = {};
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() hotspots: HotspotConfig[] = [];
  @internalProperty() envImageUrl: string = '';

  @internalProperty() pipeId = window.location.search.replace('?id=', '');
  @internalProperty() mobilePingUrl = getPingUrl(this.pipeId);

  @internalProperty() toastClassName: string = '';
  @internalProperty() toastBody: string = '';

  @internalProperty() sessionId = getRandomInt(1e+20);
  @internalProperty() sessionUrl = getSessionUrl(this.pipeId, this.sessionId);

  updateState(snippet: any, envChanged: boolean) {
    // The partialState env link correspondes to the editor's link.
    if (envChanged) {
      snippet.config.environmentImage = undefined;
    } else if (this.config.environmentImage) {
      snippet.config.environmentImage = this.config.environmentImage;
    }

    this.hotspots = snippet.hotspots;
    this.arConfig = snippet.arConfig;
    this.config = snippet.config;
    this.camera = snippet.camera;

    // Send a new POST out for each scene-viewer button press
    if (snippet.arConfig.ar) {
      const arButton =
          this.modelViewer?.shadowRoot!.getElementById('default-ar-button')!;
      // @ts-ignore
      arButton.addEventListener('click', (event: MouseEvent) => {
        post(this.currentBlob!, this.modelViewerUrl);
      });
    }
  }

  // TODO: Fix ios not showing ar button
  async waitForUSDZ(usdzId: number) {
    const response =
        await fetch(usdzToSession(this.pipeId, this.sessionId, usdzId));
    if (response.ok) {
      const blob = await response.blob();
      const usdzUrl = URL.createObjectURL(blob);
      this.arConfig.iosSrc = usdzUrl;
    } else {
      console.error('Error:', response);
    }
  }

  async waitForEnv(envIsHdr: boolean) {
    const response = await fetch(envToSession(this.pipeId, this.sessionId));
    if (response.ok) {
      const blob = await response.blob();
      // simulating createBlobUrlFromEnvironmentImage
      const addOn = envIsHdr ? '#.hdr' : '';
      const envUrl = URL.createObjectURL(blob) + addOn;
      this.envImageUrl = envUrl;
    }
  }

  async waitForData(json: MobilePacket) {
    const updatedContent: EditorUpdates = json.updatedContent;

    if (updatedContent.gltfChanged) {
      this.modelViewerUrl =
          gltfToSession(this.pipeId, this.sessionId, updatedContent.gltfId);
    }

    if (updatedContent.stateChanged) {
      this.updateState(json.snippet, updatedContent.envChanged);
    }

    if (updatedContent.iosChanged) {
      await this.waitForUSDZ(updatedContent.usdzId);
    }

    if (updatedContent.envChanged) {
      await this.waitForEnv(updatedContent.envIsHdr);
    }
  }

  initToast(json: EditorUpdates) {
    let body = json.gltfChanged ? 'gltf model, ' : '';
    body = json.envChanged ? body.concat('environment image, ') : body;
    body = json.stateChanged ? body.concat('snippet, ') : body;
    body = json.iosChanged ? body.concat('usdz model, ') : body;
    body = body.slice(0, body.length - 2).concat('.');
    this.toastBody = `Loading ${body}`;
    this.toastClassName = 'show';
  }

  async fetchLoop() {
    const response = await fetch(this.sessionUrl);
    if (response.ok) {
      const json: MobilePacket = await response.json();
      this.initToast(json.updatedContent);
      setTimeout(() => {
        this.toastClassName = '';
      }, 5000);
      await this.waitForData(json);
    } else {
      console.error('Error:', response);
    }
  }

  async triggerFetchLoop() {
    await this.fetchLoop();
    await this.triggerFetchLoop();
  }

  async newModel() {
    const glTF = await this.modelViewer!.exportScene();
    const file = new File([glTF], 'model.glb');
    const url = URL.createObjectURL(file);

    const glbContents = await downloadContents(url);
    const {gltfJson, gltfBuffer} = unpackGlb(glbContents);
    const gltf = new GltfModel(gltfJson, gltfBuffer, this.modelViewer);
    this.currentBlob = await prepareGlbBlob(gltf);

    await post(this.currentBlob, this.modelViewerUrl);
  }

  render() {
    const config = {...this.config};
    applyCameraEdits(config, this.camera);
    const skyboxImage = config.useEnvAsSkybox ? this.envImageUrl : undefined;
    const childElements = [...renderHotspots(this.hotspots)];
    return html`
    <div class="app">
      <div class="mvContainer">
        <model-viewer
          src=${this.modelViewerUrl}
          ?ar=${ifDefined(!!this.arConfig.ar)}
          ar-modes=${ifDefined(this.arConfig!.arModes)}
          ios-src=${ifDefined(this.arConfig!.iosSrc)}
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
          animation-name=${ifDefined(config.animationName)}
          @load=${this.newModel}
        >${childElements}</model-viewer>
      </div>
    </div>
    <div class="${this.toastClassName}" id="snackbar-mobile">${
        this.toastBody}</div>`;
  }

  // ping back to the editor session
  async ping() {
    const ping: MobileSession = {
      os: getMobileOperatingSystem(),
      id: this.sessionId,
      isStale: true,
    };
    await post(JSON.stringify(ping), this.mobilePingUrl);
  }

  // (Overriding default) Tell editor session that it is ready for data.
  // @ts-ignore changedProperties is unused
  firstUpdated(changedProperties: any) {
    this.ping();
    this.triggerFetchLoop();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mobile-view': MobileView;
  }
}
