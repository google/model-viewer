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
import {getRandomInt, MobileSession} from './types.js';

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
  @internalProperty() base = 'https://piping.nwtgck.repl.co/modelviewereditor';
  @internalProperty() snippetPipeUrl = `${this.base}-state-${this.pipeId}`;
  @internalProperty() updatesPipeUrl = `${this.base}-updates-${this.pipeId}`;
  @internalProperty() mobilePingUrl = `${this.base}-ping-${this.pipeId}`;
  @internalProperty() envPipeUrl = `${this.base}-env-${this.pipeId}`;

  @internalProperty() toastClassName: string = '';
  @internalProperty() toastBody: string = '';
  @internalProperty() updatingIsDone: boolean = true;

  @internalProperty() sessionId = getRandomInt(1e+20);

  async waitForState(envChanged: boolean) {
    let partialState: any = {};
    const response = await fetch(this.snippetPipeUrl);
    if (response.ok) {
      partialState = await response.json();
    } else {
      throw new Error('Something went wrong');
    }

    // The partialState env link correspondes to the editor's link.
    if (envChanged) {
      partialState.config.environmentImage = undefined;
    } else if (this.config.environmentImage) {
      partialState.config.environmentImage = this.config.environmentImage;
    }

    this.hotspots = partialState.hotspots;
    this.arConfig = partialState.arConfig;
    this.config = partialState.config;
    this.camera = partialState.camera;

    // Send a new POST out for each scene-viewer button press
    if (partialState.arConfig.ar) {
      const arButton =
          this.modelViewer?.shadowRoot!.getElementById('default-ar-button')!;
      // @ts-ignore
      arButton.addEventListener('click', (event: MouseEvent) => {
        this.postSceneViewerBlob(this.currentBlob!);
      });
    }
  }

  async waitForEnv(envIsHdr: boolean) {
    const response = await fetch(this.envPipeUrl);
    if (response.ok) {
      const blob = await response.blob();
      // simulating createBlobUrlFromEnvironmentImage
      const addOn = envIsHdr ? '#.hdr' : '';
      const envUrl = URL.createObjectURL(blob) + addOn;
      this.envImageUrl = envUrl;
    }
  }

  async waitForUSDZ(modelIds: number) {
    const response =
        await fetch(`https://piping.nwtgck.repl.co/modelviewereditor-usdz-${
            this.pipeId}-${modelIds}`);
    if (response.ok) {
      const blob = await response.blob();
      const usdzUrl = URL.createObjectURL(blob);
      this.arConfig.iosSrc = usdzUrl;
    } else {
      console.error('Error:', response);
    }
  }

  async waitForData(json: any) {
    if (json.iosChanged) {
      await this.waitForUSDZ(json.modelIds);
      await this.updateComplete;
    }
    if (json.gltfChanged) {
      this.modelViewerUrl =
          `https://piping.nwtgck.repl.co/modelviewereditor-model-${
              this.pipeId}-${json.modelIds}`;
      await this.updateComplete;
    }
    if (json.stateChanged) {
      await this.waitForState(json.envChanged);
    }
    if (json.envChanged) {
      await this.waitForEnv(json.envIsHdr);
    }
  }

  initToast(json: any) {
    let body = json.gltfChanged ? 'gltf model, ' : '';
    body = json.envChanged ? body.concat('environment image, ') : body;
    body = json.stateChanged ? body.concat('snippet, ') : body;
    body = json.iosChanged ? body.concat('usdz model, ') : body;
    body = body.slice(0, body.length - 2).concat('.');
    this.toastBody = `Loading ${body}`;
    this.toastClassName = 'show';
  }

  // TODO: Update with a unique ID;
  // TODO: Fix logic, for things like env image, so we know if we should delete
  // it or not.
  async fetchLoop() {
    const response = await fetch(this.updatesPipeUrl);
    if (response.ok) {
      const json = await response.json();
      this.initToast(json);
      await this.waitForData(json);
      this.toastClassName = '';
    } else {
      console.error('Error:', response);
    }
  }

  async triggerFetchLoop() {
    await this.fetchLoop();
    await this.triggerFetchLoop();
  }

  async prepareGlbBlob(gltf: GltfModel) {
    const glbBuffer = await gltf.packGlb();
    return new Blob([glbBuffer], {type: 'model/gltf-binary'});
  }

  // Post new blob for scene-viewer
  async postSceneViewerBlob(blob: Blob) {
    const response = await fetch(this.modelViewerUrl, {
      method: 'POST',
      body: blob,
    })
    if (response.ok) {
      console.log('Success:', response);
    }
    else {
      throw new Error(`Failed to post: ${this.modelViewerUrl}`);
    }
  }

  async newModel() {
    const glTF = await this.modelViewer!.exportScene();
    const file = new File([glTF], 'model.glb');
    const url = URL.createObjectURL(file);

    const glbContents = await downloadContents(url);
    const {gltfJson, gltfBuffer} = unpackGlb(glbContents);
    const gltf = new GltfModel(gltfJson, gltfBuffer, this.modelViewer);
    this.currentBlob = await this.prepareGlbBlob(gltf);

    await this.postSceneViewerBlob(this.currentBlob);
  }

  render() {
    const config = {...this.config};
    applyCameraEdits(config, this.camera);
    const skyboxImage =
        config.useEnvAsSkybox ? config.environmentImage : undefined;
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

  /**
   * Determine the mobile operating system.
   * This function returns one of 'iOS', 'Android', 'Windows Phone', or
   * 'unknown'.
   * https://stackoverflow.com/questions/21741841/detecting-ios-android-operating-system
   */
  getMobileOperatingSystem(): string {
    // @ts-ignore
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent)) {
      return 'Windows Phone';
    }

    if (/android/i.test(userAgent)) {
      return 'Android';
    }

    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'iOS';
    }

    return 'unknown';
  }

  // ping back to the editor session
  async ping() {
    const ping: MobileSession = {
      os: this.getMobileOperatingSystem(),
      id: this.sessionId,
      isPing: true,
      isStale: true,
    };
    const response = await fetch(this.mobilePingUrl, {
      method: 'POST',
      body: JSON.stringify(ping),
    })
    if (response.ok) {
      console.log('Success:', response);
    }
    else {
      throw new Error(`Failed to post: ${this.mobilePingUrl}`);
    }
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
