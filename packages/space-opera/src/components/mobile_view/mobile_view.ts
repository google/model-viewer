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
import {customElement, html, internalProperty, query} from 'lit-element';
import {ifDefined} from 'lit-html/directives/if-defined';

import {reduxStore} from '../../space_opera_base.js';
import {ArConfigState, State} from '../../types.js';
import {applyCameraEdits, Camera, INITIAL_CAMERA} from '../camera_settings/camera_state.js';
import {dispatchSetCamera, getCamera} from '../camera_settings/reducer.js';
import {dispatchEnvrionmentImage, dispatchSetConfig, getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {dispatchSetHotspots, getHotspots} from '../hotspot_panel/reducer.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {downloadContents} from '../model_viewer_preview/reducer.js';
import {renderHotspots} from '../utils/hotspot/render_hotspots.js';
import {dispatchArConfig, getArConfig} from './reducer.js';

import {styles} from './styles.css.js';

/**
 * The view loaded at /editor/view/?id=xyz
 */
@customElement('mobile-view')
export class MobileView extends ConnectedLitElement {
  static styles = styles;

  @query('model-viewer') readonly modelViewer?: ModelViewerElement;
  @internalProperty() modelViewerUrl: string = '';
  @internalProperty() currentBlob?: Blob;

  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() arConfig: ArConfigState = {};
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() hotspots: HotspotConfig[] = [];
  @internalProperty() gltf?: GltfModel;

  @internalProperty() pipeId = window.location.search.replace('?id=', '');
  @internalProperty() base = 'https://ppng.io/modelviewereditor';
  @internalProperty() snippetPipeUrl = `${this.base}-state-${this.pipeId}`;
  @internalProperty() updatesPipeUrl = `${this.base}-updates-${this.pipeId}`;
  @internalProperty() mobilePingUrl = `${this.base}-ping-${this.pipeId}`;
  @internalProperty() envPipeUrl = `${this.base}-env-${this.pipeId}`;

  stateChanged(state: State) {
    this.config = getConfig(state);
    this.arConfig = getArConfig(state);
    this.hotspots = getHotspots(state);
    this.camera = getCamera(state);
  }

  setNewModelSrc(id: number) {
    this.modelViewerUrl =
        `https://ppng.io/modelviewereditor-model-${this.pipeId}-${id}`;
  }

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

    reduxStore.dispatch(dispatchSetHotspots(partialState.hotspots));
    reduxStore.dispatch(dispatchSetCamera(partialState.camera));
    reduxStore.dispatch(dispatchSetConfig(partialState.config));
    reduxStore.dispatch(dispatchArConfig(partialState.arConfig));

    await this.updateComplete;

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
      reduxStore.dispatch(dispatchEnvrionmentImage(envUrl));
    }
  }

  async waitForData(json: any) {
    if (json.gltfChanged) {
      await this.setNewModelSrc(json.gltfId);
      await this.updateComplete;
    }
    if (json.stateChanged) {
      await this.waitForState(json.envChanged);
    }
    if (json.envChanged) {
      await this.waitForEnv(json.envIsHdr);
    }
  }

  async fetchLoop() {
    const response = await fetch(this.updatesPipeUrl);
    if (response.ok) {
      const json = await response.json();
      this.waitForData(json)
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
          ?autoplay=${!!config.autoplay}
          ?auto-rotate=${!!config.autoRotate}
          ?camera-controls=${!!config.cameraControls}
          environment-image=${ifDefined(config.environmentImage)}
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
    </div>`;
  }

  /**
   * Determine the mobile operating system.
   * This function returns one of 'iOS', 'Android', 'Windows Phone', or
   * 'unknown'.
   */
  getMobileOperatingSystem(): string {
    // @ts-ignore
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;

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
    const response = await fetch(this.mobilePingUrl, {
      method: 'POST',
      body: JSON.stringify({isPing: true, os: this.getMobileOperatingSystem()}),
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
