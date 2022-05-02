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

/**
 * @fileoverview Use lit-html to output a model-viewer tag with the current
 * settings applied to the GLB.
 */

import '@material/mwc-icon-button';

import {ModelViewerElement} from '@google/model-viewer/lib/model-viewer';
import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';

import {reduxStore} from '../../space_opera_base.js';
import {modelViewerPreviewStyles} from '../../styles.css.js';
import {BestPracticesState, extractStagingConfig, ModelViewerConfig, State} from '../../types.js';
import {getBestPractices} from '../best_practices/reducer.js';
import {arButtonCSS, progressBarCSS} from '../best_practices/styles.css.js';
import {dispatchCameraIsDirty} from '../camera_settings/reducer.js';
import {dispatchAutoplayEnabled, dispatchCameraControlsEnabled, dispatchConfig, dispatchEnvrionmentImage, getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {dispatchAddHotspot, dispatchSetHotspots, dispatchUpdateHotspotMode, generateUniqueHotspotName, getHotspotMode, getHotspots} from '../hotspot_panel/reducer.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {createBlobUrlFromEnvironmentImage, dispatchAddEnvironmentImage} from '../ibl_selector/reducer.js';
import {dispatchSetForcePost, getRefreshable} from '../mobile_view/reducer.js';
import {getExtraAttributes} from '../model_viewer_snippet/reducer.js';
import {dispatchSetEnvironmentName, dispatchSetModelName} from '../relative_file_paths/reducer.js';
import {createSafeObjectUrlFromArrayBuffer} from '../utils/create_object_url.js';
import {styles as hotspotStyles} from '../utils/hotspot/hotspot.css.js';
import {renderModelViewer} from '../utils/render_model_viewer.js';

import {dispatchGltfUrl, dispatchModel, getGltfUrl, renderCommonChildElements} from './reducer.js';

/**
 * Renders and updates the model-viewer tag, serving as a preview of the edits.
 */
@customElement('model-viewer-preview')
export class ModelViewerPreview extends ConnectedLitElement {
  static styles =
      [modelViewerPreviewStyles, hotspotStyles, arButtonCSS, progressBarCSS];
  @query('model-viewer') readonly modelViewer!: ModelViewerElement;
  @state() config: ModelViewerConfig = {};
  @state() hotspots: HotspotConfig[] = [];
  @state() addHotspotMode = false;
  @state() gltfUrl?: string;
  @state() extraAttributes: any = {};
  @state() refreshButtonIsReady: boolean = false;
  @state() bestPractices?: BestPracticesState;

  // The loadComplete promise is a testing hook that resolves once all async
  // load-related operations have completed. Await this promise after causing a
  // gltfUrl to be dispatched and after awaiting this element's updateComplete.
  loadComplete?: Promise<void>;
  private resolveLoad = () => {};

  stateChanged(state: State) {
    this.addHotspotMode = getHotspotMode(state) || false;
    this.config = getConfig(state);
    this.hotspots = getHotspots(state);
    this.extraAttributes = getExtraAttributes(state);
    this.refreshButtonIsReady = getRefreshable(state);
    this.bestPractices = getBestPractices(state);

    const gltfUrl = getGltfUrl(state);
    if (gltfUrl !== this.gltfUrl) {
      this.loadComplete = new Promise((resolve) => {
        this.resolveLoad = resolve;
      });
      this.gltfUrl = gltfUrl;
    }
  }

  firstUpdated() {
    this.addEventListener('drop', this.onDrop);
    this.addEventListener('dragover', this.onDragover);
    (self as any).ModelViewerElement = (self as any).ModelViewerElement || {};
    (self as any).ModelViewerElement.meshoptDecoderLocation =
        'https://unpkg.com/meshoptimizer/meshopt_decoder.js';
  }

  private async onGltfUrlChanged() {
    // Clear potential poster settings.
    if (this.modelViewer.reveal === 'interaction' ||
        this.modelViewer.reveal === 'manual') {
      this.modelViewer.reveal = 'auto';
    } else {
      this.modelViewer.reveal = 'auto';
    }
    this.modelViewer.poster = this.config.poster || '';
  }

  forcePost() {
    reduxStore.dispatch(dispatchSetForcePost(true));
  }

  protected render() {
    const editedConfig = {
      ...this.config,
      src: this.gltfUrl,
      // Always enable camera controls for preview
      cameraControls: true,
      interactionPrompt: 'none'
    };

    const hasModel = !!editedConfig.src;

    const refreshMobileButton = this.refreshButtonIsReady === true ? html
    `<mwc-button icon="cached" @click=${this.forcePost}
      style="--mdc-theme-primary: #DC143C; border: #DC143C" class="RefreshMobileButton">
      Refresh Mobile
    </mwc-button>`: html``;

    // Renders elements common between mobile and editor.
    const childElements =
        renderCommonChildElements(this.hotspots, this.bestPractices!, true);

    // Add additional elements, editor specific.
    childElements.push(refreshMobileButton);
    if (!hasModel) {
      childElements.push(
          html
          `<div class="HelpText">Drag a glTF or GLB here!<br/>
          <small>Groups, folders, and Zip archives supported</small><br/>
          <small>Drop an HDR for lighting</small></div>`);
    }

    const emptyARConfig = {};

    return html`${
        renderModelViewer(
            editedConfig,
            emptyARConfig,
            this.extraAttributes,
            {
              load: () => {
                this.onModelLoaded();
              },
              cameraChange: () => {
                this.onCameraChange();
              },
              click: (event: MouseEvent) => {
                if (this.addHotspotMode) {
                  this.addHotspot(event);
                }
              }
            },
            childElements)}`;
  }

  // Handle the case when the model is loaded for the first time.
  private async onModelLoaded() {
    reduxStore.dispatch(await dispatchModel());
    // only update on poster reveal
    if (this.modelViewer.reveal === 'interaction') {
      await this.onGltfUrlChanged();
    }
    if (this.modelViewer.availableAnimations.length > 0) {
      reduxStore.dispatch(dispatchAutoplayEnabled(true));
    }
    const config = getConfig(reduxStore.getState());
    reduxStore.dispatch(dispatchConfig({...config}));
    this.resolveLoad();
  }

  private onCameraChange() {
    reduxStore.dispatch(dispatchCameraIsDirty());
  }

  private addHotspot(event: MouseEvent) {
    const positionAndNormal = this.modelViewer.positionAndNormalFromPoint(
        event.clientX, event.clientY);
    if (!positionAndNormal) {
      console.log('Click was not on model, no hotspot added.');
      return;
    }
    reduxStore.dispatch(dispatchAddHotspot({
      name: generateUniqueHotspotName(),
      position: positionAndNormal.position,
      normal: positionAndNormal.normal,
    }));
    reduxStore.dispatch(dispatchUpdateHotspotMode(false));
  }

  private onDragover(event: DragEvent) {
    if (!event.dataTransfer)
      return;

    event.stopPropagation();
    event.preventDefault();
  }

  private async onDrop(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (event.dataTransfer && event.dataTransfer.items[0].kind === 'file') {
      const file = event.dataTransfer.items[0].getAsFile();
      if (!file)
        return;
      if (file.name.match(/\.(glb|gltf)$/i)) {
        const arrayBuffer = await file.arrayBuffer();
        reduxStore.dispatch(dispatchSetModelName(file.name));
        const url = createSafeObjectUrlFromArrayBuffer(arrayBuffer).unsafeUrl;
        reduxStore.dispatch(dispatchGltfUrl(url));
        dispatchConfig(extractStagingConfig(this.config));
        reduxStore.dispatch(dispatchCameraControlsEnabled(true));
        reduxStore.dispatch(dispatchSetHotspots([]));
      }
      if (file.name.match(/\.(hdr|png|jpg|jpeg)$/i)) {
        const unsafeUrl = await createBlobUrlFromEnvironmentImage(file);
        reduxStore.dispatch(
            dispatchAddEnvironmentImage({uri: unsafeUrl, name: file.name}));
        reduxStore.dispatch(dispatchEnvrionmentImage(unsafeUrl));
        reduxStore.dispatch(dispatchSetEnvironmentName(file.name));
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'model-viewer-preview': ModelViewerPreview;
  }
}
