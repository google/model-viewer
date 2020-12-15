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

import {GltfModel, ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main';
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
// import {dispatchSetEdits} from '../materials_panel/reducer.js';
// import {applyEdits} from '../model_viewer_preview/gltf_edits.js';
import {dispatchGltfUrl, getGltfModel, getGltfUrl} from '../model_viewer_preview/reducer.js';
import {renderHotspots} from '../utils/hotspot/render_hotspots.js';
import {dispatchArConfig, getArConfig} from './reducer.js';

import {styles} from './styles.css.js';

/**
 * The main model-viewer editor component for routing.
 */
@customElement('mobile-view')
export class MobileView extends ConnectedLitElement {
  static styles = styles;

  @query('model-viewer') readonly modelViewer?: ModelViewerElement;
  @internalProperty() gltfUrl: string|undefined;
  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() arConfig: ArConfigState = {};
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() hotspots: HotspotConfig[] = [];
  @internalProperty() gltf?: GltfModel;

  stateChanged(state: State) {
    this.gltfUrl = getGltfUrl(state);
    this.config = getConfig(state);
    this.arConfig = getArConfig(state);
    this.hotspots = getHotspots(state);
    this.camera = getCamera(state);
    this.gltf = getGltfModel(state);
  }

  get pipingServerId(): any {
    return window.location.search.replace('?id=', '');
  };

  getSrcPipeUrl(srcType: string): string {
    return `https://ppng.io/modelviewereditor-srcs-${srcType}-${
        this.pipingServerId}`;
  }

  get snippetPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-state-${this.pipingServerId}`;
  }

  get updatesPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-updates-${this.pipingServerId}`;
  }

  get mobilePing(): string {
    return `https://ppng.io/modelviewereditor-ping-${this.pipingServerId}`;
  }

  async waitForModel() {
    await fetch(this.getSrcPipeUrl('gltf'))
        .then(response => response.blob())
        .then(blob => {
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

    // If any of these have changed, expect them to be updated in a soon to be
    // executed fetch.
    if (envChanged) {
      partialState.config.environmentImage = undefined;
    } else if (this.config.environmentImage) {
      partialState.config.environmentImage = this.config.environmentImage;
    }

    // This will always be the most up to date src
    // todo reset this with gltfurl
    partialState.config.src = this.gltfUrl;  // this may not be updated yet...

    console.log('partial state:', partialState);
    console.log('gltf url', this.gltfUrl);

    reduxStore.dispatch(dispatchSetHotspots(partialState.hotspots));
    reduxStore.dispatch(dispatchSetCamera(partialState.camera));
    reduxStore.dispatch(dispatchSetConfig(partialState.config));
    reduxStore.dispatch(dispatchArConfig(partialState.arConfig));
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

  async waitForUpdates(json: any) {
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
        .then(json => this.waitForUpdates(json))
        .catch((error) => {
          console.error('Error:', error);
        });
  }

  async triggerFetchLoop() {
    // keep checking for updates..
    await this.fetchLoop();
    await this.triggerFetchLoop();
  }

  // TODO: Add loading circle...

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
          src=${config.src || ''}
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
    await fetch(this.mobilePing, {
      method: 'POST',
      body: JSON.stringify({isPing: true}),
    })
        .then(response => {
          console.log('Success:', response);
        })
        .catch((error) => {
          // TODO: Throw up a popup that says this failed...
          console.log('Error:', error);
          throw new Error(`Failed to post: ${this.mobilePing}`);
        });
  }

  // (Overriding default) Tell editor session that it is ready for data.
  // @ts-ignore changedProperties unused
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
