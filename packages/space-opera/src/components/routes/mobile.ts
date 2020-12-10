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
import {extractStagingConfig, State} from '../../types.js';
import {applyCameraEdits, Camera, INITIAL_CAMERA} from '../camera_settings/camera_state.js';
import {dispatchSetCamera, getCamera} from '../camera_settings/reducer.js';
import {dispatchCameraControlsEnabled, dispatchEnvrionmentImage, dispatchSetConfig, dispatchSetPoster, getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {dispatchSetHotspots} from '../hotspot_panel/reducer.js';
import {dispatchSetEdits} from '../materials_panel/reducer.js';
import {applyEdits, dispatchGltfAndEdits} from '../model_viewer_preview/gltf_edits.js';
import {dispatchGltfUrl, getGltfModel, getGltfUrl} from '../model_viewer_preview/reducer.js';
import {dispatchConfig} from '../model_viewer_snippet/reducer.js';

import {styles} from './styles.css.js';

/**
 * The main model-viewer editor component for routing.
 */
@customElement('routes-mobile')
export class EditorMobile extends ConnectedLitElement {
  static styles = styles;

  @query('model-viewer') readonly modelViewer?: ModelViewerElement;

  @internalProperty() gltfUrl: string|undefined;
  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() gltf?: GltfModel;

  stateChanged(state: State) {
    this.gltfUrl = getGltfUrl(state);
    this.config = getConfig(state);
    this.camera = getCamera(state);
    this.gltf = getGltfModel(state);
  }

  get pipingServerId(): any {
    // TODO: catch errors
    return window.location.search.replace('?id=', '');
  };

  getSrcPipeUrl(srcType: string): string {
    return `https://ppng.io/modelviewereditor-srcs-${srcType}-${
        this.pipingServerId}`;
  }

  get snippetPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-state-${this.pipingServerId}`;
  }

  // Set model for the most recent model sent. Will partially reset the state,
  // so the model should be sent before the new config is sent.
  async waitForModel() {
    // TODO: handle 404s
    const response = await fetch(this.getSrcPipeUrl('gltf'));
    const modelBlob = await response.blob();
    const modelUrl = URL.createObjectURL(modelBlob);
    reduxStore.dispatch(dispatchGltfUrl(modelUrl));
    dispatchConfig(extractStagingConfig(getConfig(reduxStore.getState())));
    reduxStore.dispatch(dispatchCameraControlsEnabled(true));
    reduxStore.dispatch(dispatchSetHotspots([]));
  }

  // Set state according to newest partial state sent
  async waitForState() {
    // TODO: handle 404s
    const stateResponse = await fetch(this.snippetPipeUrl);
    const partialState = await stateResponse.json();
    reduxStore.dispatch(dispatchSetHotspots(partialState.hotspots));
    reduxStore.dispatch(dispatchSetCamera(partialState.camera));

    // Fill in current links such that they are not erroneously updated.
    if (this.config.environmentImage) {
      partialState.config.environmentImage = this.config.environmentImage;
    }
    if (this.config.poster) {
      partialState.config.poster = this.config.poster;
    }
    if (this.config.src) {
      partialState.config.src = this.config.src;
    }
    reduxStore.dispatch(dispatchSetConfig(partialState.config));
    reduxStore.dispatch(dispatchSetEdits(partialState.edits));

    // TODO: figure out how to update model...
    const gltf = this.gltf;
    dispatchGltfAndEdits(gltf, true);
    const previousEdits = undefined;
    if (gltf) {
      await applyEdits(gltf, partialState.edits, previousEdits);
    }

    console.log('dispatched and updated state');
  }

  // Set environment image, based on most recent image sent
  // This should be called after the snippet is updated such we can populate the
  // correct environment image url in the config.
  async waitForEnv() {
    // TODO: handle 404s
    const envResponse = await fetch(this.getSrcPipeUrl('env'));
    const envBlob = await envResponse.blob();
    // create safe url here...!!!
    // createBlobUrlFromEnvironmentImage adds on hdr, so need to take that into
    // account here as well...
    // TODO: Figure out a way to determine whether or not the file sent is an
    // hdr
    const envUrl = URL.createObjectURL(envBlob) + '#.hdr';
    reduxStore.dispatch(dispatchEnvrionmentImage(envUrl));
  }

  // Set poster, based on most recent poster sent
  // This should be called after the snippet is updated such that model-viewer's
  // camera can be updated accordingly and we can populate the correct poster
  // url.
  async waitForPoster() {
    // TODO: handle 404s
    const posterResponse = await fetch(this.getSrcPipeUrl('poster'));
    const posterBlob = await posterResponse.blob();
    const posterUrl = URL.createObjectURL(posterBlob);
    this.modelViewer?.jumpCameraToGoal();
    requestAnimationFrame(async () => {
      this.modelViewer!.reveal = 'interaction';
      this.modelViewer!.showPoster();
      reduxStore.dispatch(dispatchSetPoster(posterUrl));
    });
  }

  // TODO: Add child elements like hotspots as is done in render model viewer.
  // figure out why I can't use the regular render, and try to incorporate it.

  render() {
    const config = {...this.config};
    applyCameraEdits(config, this.camera);
    const skyboxImage =
        config.useEnvAsSkybox ? config.environmentImage : undefined;
    return html`
    <div style="position: absolute; z-index: 20;">
      <mwc-button unelevated @click=${this.waitForModel}> Model </mwc-button>
      <mwc-button unelevated @click=${this.waitForState}> State </mwc-button>
      <mwc-button unelevated @click=${this.waitForEnv}> Env </mwc-button>
      <mwc-button unelevated @click=${this.waitForPoster}> Poster </mwc-button>
    </div>
    <div class="app">
      <div class="mvContainer">
        <model-viewer
          src=${this.gltfUrl || ''}
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
        ></model-viewer>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'routes-mobile': EditorMobile;
  }
}
