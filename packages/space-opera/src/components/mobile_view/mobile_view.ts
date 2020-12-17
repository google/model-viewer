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
import {dispatchGltfUrl, downloadContents, getGltfUrl} from '../model_viewer_preview/reducer.js';
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

  @internalProperty() gltfUrl: string|undefined;
  @internalProperty() useGltfUrl = true;
  @internalProperty() sceneViewerUrl: string = '';

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

  stateChanged(state: State) {
    this.gltfUrl = getGltfUrl(state);
    this.config = getConfig(state);
    this.arConfig = getArConfig(state);
    this.hotspots = getHotspots(state);
    this.camera = getCamera(state);
  }

  getSrcPipeUrl(srcType: string): string {
    return `https://ppng.io/modelviewereditor-srcs-${srcType}-${this.pipeId}`;
  }

  // TODO: https://javascript.info/fetch-progress
  // todo: make this receive an ID that is then used in the render
  async waitForModel() {
    this.useGltfUrl = true;
    await fetch(this.getSrcPipeUrl('gltf'))
        .then(response => response.blob())
        .then(blob => {
          // Modelviewer blob won't work with scene viewer
          // https://github.com/google/model-viewer/issues/617
          const modelUrl = URL.createObjectURL(blob);
          reduxStore.dispatch(dispatchGltfUrl(modelUrl));
          reduxStore.dispatch(dispatchSetHotspots([]));
        })
        .catch((error) => {
          console.error('Error:', error);
        });
  }

  async waitForState(envChanged: boolean) {
    let partialState: any = {};
    await fetch(this.snippetPipeUrl)
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Something went wrong');
          }
        })
        .then((responseJson) => {
          partialState = responseJson;
        })
        .catch((error) => {
          console.log('error', error);
        });

    // These links would be corresponding to the original editor's link.
    if (envChanged) {
      partialState.config.environmentImage = undefined;
    } else if (this.config.environmentImage) {
      partialState.config.environmentImage = this.config.environmentImage;
    }
    partialState.config.src = this.gltfUrl;

    reduxStore.dispatch(dispatchSetHotspots(partialState.hotspots));
    reduxStore.dispatch(dispatchSetCamera(partialState.camera));
    reduxStore.dispatch(dispatchSetConfig(partialState.config));
    reduxStore.dispatch(dispatchArConfig(partialState.arConfig));

    await this.updateComplete;

    if (partialState.arConfig.ar) {
      const arButton =
          this.modelViewer?.shadowRoot!.getElementById('default-ar-button')!;
      // @ts-ignore
      arButton.addEventListener('click', async (event: MouseEvent) => {
        this.useGltfUrl = false;
        this.sceneViewerUrl = this.getSrcPipeUrl('scene-viewer');
        this.sendSceneViewerPost();
        await this.updateComplete;
      });
    }
  }

  async waitForEnv(envIsHdr: boolean) {
    await fetch(this.getSrcPipeUrl('env'))
        .then(response => response.blob())
        .then(blob => {
          // simulating createBlobUrlFromEnvironmentImage
          const addOn = envIsHdr ? '#.hdr' : '';
          const envUrl = URL.createObjectURL(blob) + addOn;
          reduxStore.dispatch(dispatchEnvrionmentImage(envUrl));
        })
        .catch((error) => {
          console.error('Error:', error);
        });
  }

  async waitForData(json: any) {
    if (json.gltfChanged) {
      await this.waitForModel();
    }
    if (json.stateChanged) {
      await this.waitForState(json.envChanged);
    }
    if (json.envChanged) {
      await this.waitForEnv(json.envIsHdr);
    }
  }

  async fetchLoop() {
    await fetch(this.updatesPipeUrl)
        .then(response => response.json())
        .then(json => this.waitForData(json))
        .catch((error) => {
          console.error('Error:', error);
        });
  }

  async triggerFetchLoop() {
    await this.fetchLoop();
    await this.triggerFetchLoop();
  }

  async prepareGlbBlob(gltf: GltfModel) {
    const glbBuffer = await gltf.packGlb();
    return new Blob([glbBuffer], {type: 'model/gltf-binary'});
  }

  async postBlob(blob: Blob, srcType: string) {
    await fetch(this.getSrcPipeUrl(srcType), {
      method: 'POST',
      body: blob,
    })
        .then(response => {
          console.log('Success:', response);
        })
        .catch((error) => {
          console.log('Error:', error);
          throw new Error(`Failed to post: ${this.getSrcPipeUrl(srcType)}`);
        });
  }

  async sendSceneViewerPost() {
    // remove dependency on url...
    const glbContents = await downloadContents(this.gltfUrl!);
    const {gltfJson, gltfBuffer} = unpackGlb(glbContents);
    const gltf = new GltfModel(gltfJson, gltfBuffer, this.modelViewer);
    const blob = await this.prepareGlbBlob(gltf);
    await this.postBlob(blob, 'scene-viewer');
    await this.postBlob(blob, 'scene-viewer');
  }

  render() {
    const config = {...this.config};
    applyCameraEdits(config, this.camera);
    const skyboxImage =
        config.useEnvAsSkybox ? config.environmentImage : undefined;
    const childElements = [...renderHotspots(this.hotspots)];

    // todo; remove
    const modelViewerSrc =
        this.useGltfUrl ? (this.gltfUrl || '') : this.sceneViewerUrl

    return html`
    <div style="position: absolute; z-index: 20;">
      <mwc-button unelevated @click=${
        this.sendSceneViewerPost}> Scene Viewer Post </mwc-button>
    </div>
    <div class="app">
      <div class="mvContainer">
        <model-viewer
          src=${modelViewerSrc}
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
        >${childElements}</model-viewer>
      </div>
    </div>`;
  }

  async ping() {
    await fetch(this.mobilePingUrl, {
      method: 'POST',
      body: JSON.stringify({isPing: true}),
    })
        .then(response => {
          console.log('Success:', response);
        })
        .catch((error) => {
          console.log('Error:', error);
          throw new Error(`Failed to post: ${this.mobilePingUrl}`);
        });
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
