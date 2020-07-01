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
 * istributed under the License is distributed on an 'AS IS' BASIS,
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

import {customElement, html, internalProperty, PropertyValues, query} from 'lit-element';
import {ModelViewerElement} from '@google/model-viewer';

import {GltfModel, ModelViewerConfig, unpackGlb} from '@google/model-viewer-editing-adapter/lib/main.js'
import {safeDownloadCallback} from '@google/model-viewer-editing-adapter/lib/util/safe_download_callback.js'
import {applyCameraEdits, Camera, INITIAL_CAMERA} from '../../redux/camera_state.js';
import {applyEdits, GltfEdits, INITIAL_GLTF_EDITS} from '../../redux/gltf_edits.js';
import {HotspotConfig} from '../../redux/hotspot_config.js';
import {dispatchAddHotspot, dispatchAddHotspotMode, generateUniqueHotspotName} from '../../redux/hotspot_dispatchers.js';
import {dispatchCurrentCameraState, dispatchGltfAndEdits, dispatchInitialCameraState, State} from '../../redux/space_opera_base.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {styles as hotspotStyles} from '../utils/hotspot/hotspot.css.js';
import {renderHotspots} from '../utils/hotspot/render_hotspots.js';
import {renderModelViewer} from '../utils/render_model_viewer.js';

import {styles} from './model_viewer_preview_styles.css.js';

const $edits = Symbol('edits');
const $gltfUrl = Symbol('gltfUrl');
const $gltf = Symbol('gltf');
const $playAnimation = Symbol('playAnimation');

function getCameraState(viewer: ModelViewerElement) {
  return {
    orbit: viewer.getCameraOrbit(),
    target: viewer.getCameraTarget(),
    fieldOfView: viewer.getFieldOfView(),
  } as Camera;
}

async function downloadContents(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch url ${url}`);
  }
  const blob = await response.blob();
  if (!blob) {
    throw new Error(`Could not extract binary blob from response of ${url}`);
  }

  return blob.arrayBuffer();
}

/**
 * Renders and updates the model-viewer tag, serving as a preview of the edits.
 */
@customElement('model-viewer-preview')
export class ModelViewerPreview extends ConnectedLitElement {
  static styles = [styles, hotspotStyles];
  @query('model-viewer') private readonly modelViewer?: ModelViewerElement;
  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() hotspots: HotspotConfig[] = [];
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() addHotspotMode = false;
  @internalProperty()[$playAnimation]?: boolean;
  @internalProperty()[$edits]: GltfEdits = INITIAL_GLTF_EDITS;
  @internalProperty()[$gltf]?: GltfModel;
  @internalProperty()[$gltfUrl]?: string;

  stateChanged(state: State) {
    this.addHotspotMode = state.addHotspotMode || false;
    this.camera = state.camera;
    this.config = state.config;
    this.hotspots = state.hotspots;
    this[$edits] = state.edits;
    this[$gltf] = state.gltf;
    this[$gltfUrl] = state.gltfUrl;
    this[$playAnimation] = state.playAnimation;
  }

  private async onGltfUrlChanged() {
    if (!this.modelViewer) {
      throw new Error(`model-viewer element was not ready`);
    }

    const url = this[$gltfUrl];
    if (url) {
      // TODO: we should probably do validation of the GLB and
      // show a UI error if it doesn't unpack successfully.
      const glbContents = await downloadContents(url);
      const {gltfJson, gltfBuffer} = unpackGlb(glbContents);
      const gltf = new GltfModel(gltfJson, gltfBuffer, this.modelViewer);
      await dispatchGltfAndEdits(gltf);
    } else {
      await dispatchGltfAndEdits(undefined);
    }
  }

  // We need to do different things depending on if both GLTF and edits changed,
  // or if only edits changed.
  private async updateGltf(gltfChanged: boolean, previousEdits?: GltfEdits) {
    // NOTE: There is a potential race here. If another update is running, we
    // may finish before it, and it would overwrite our correct results. We'll
    // live with this for now. If it becomes an issue, the proper solution is
    // probably to do async operations only at the data level, not affecting
    // the UI until data is ready.

    if (gltfChanged) {
      // Got a new GLTF, assume that previous edits were not applied yet.
      previousEdits = undefined;
    }

    const gltf = this[$gltf];
    if (gltf) {
      await applyEdits(gltf, this[$edits], previousEdits);
    }
  }

  protected updated(changedProperties: PropertyValues) {
    this.enforcePlayAnimation();

    if (changedProperties.has($gltfUrl)) {
      this.onGltfUrlChanged();
    }

    const previousEdits =
        changedProperties.get($edits) as GltfEdits | undefined;
    const gltfChanged = changedProperties.has($gltf);

    // Only call if needed - otherwise infinite-async-loops are possible.
    if (previousEdits || gltfChanged) {
      this.updateGltf(gltfChanged, previousEdits);
    }
  }

  protected render() {
    const editedConfig = {
      ...this.config,
      // If the gltf model has a URL, it must be more recent
      src: this[$gltf]?.getModelViewerSource() ?? this[$gltfUrl],
      // Always enable camera controls for preview
      cameraControls: true
    };
    applyCameraEdits(editedConfig, this.camera);

    const workletElement = html`<script
    src="./node_modules/@google/model-viewer-editing-adapter/dist/scene_graph_worklet.js"
    type="experimental-scene-graph-worklet"
    allow="messaging; material-properties"></script>`;
    const screenshotButton =
        html`<mwc-icon-button icon="photo_camera" class="ScreenShotButton" @click=${
            this.downloadScreenshot}></mwc-icon-button>`;
    const childElements =
        [workletElement, ...renderHotspots(this.hotspots), screenshotButton];

    return html`${
        renderModelViewer(
            editedConfig, {
              load: () => {
                this.onModelLoaded();
              },
              cameraChange: () => {
                this.onCameraChange();
              },
              modelVisibility: () => {
                this.onModelVisible();
              },
              // Other things can cause the animation to play/pause, like
              // setting autoplay to true, so make sure we enforce what WE want
              // after that.
              play: () => {
                this.enforcePlayAnimation();
              },
              pause: () => {
                this.enforcePlayAnimation();
              },
              click: (event: MouseEvent) => {
                if (this.addHotspotMode) {
                  this.addHotspot(event);
                }
              }
            },
            childElements)}`;
  }

  private onModelLoaded() {
    // Handle the case when the model is loaded for the first time.
    this.enforcePlayAnimation();
  }

  private onModelVisible() {
    if (!this.modelViewer || !this.modelViewer.loaded) {
      throw new Error('onModelVisible called before mv was loaded');
    }
    dispatchInitialCameraState(getCameraState(this.modelViewer));
  }

  private onCameraChange() {
    if (!this.modelViewer) {
      throw new Error('onCameraChange called before modelViewer defined');
    }
    dispatchCurrentCameraState(getCameraState(this.modelViewer));
  }

  private enforcePlayAnimation() {
    if (this.modelViewer && this.modelViewer.loaded) {
      // Calling play with no animation name will result in the first animation
      // getting played. Don't want that.
      if (this[$playAnimation] && this.config.animationName) {
        this.modelViewer.play();
      } else {
        this.modelViewer.pause();
      }
    }
  }

  private addHotspot(event: MouseEvent) {
    if (!this.modelViewer) {
      throw new Error('Model Viewer doesn\'t exist');
    }
    const rect = this.modelViewer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const positionAndNormal = this.modelViewer.positionAndNormalFromPoint(x, y);
    if (!positionAndNormal) {
      throw new Error('invalid click position');
    }
    dispatchAddHotspot({
      name: generateUniqueHotspotName(),
      position: positionAndNormal.position,
      normal: positionAndNormal.normal,
    });
    dispatchAddHotspotMode(false);
  }

  private async downloadScreenshot() {
    if (!this.modelViewer) return;
    await safeDownloadCallback(
        await this.modelViewer.toBlob(), 'Space Opera Screenshot.png', '')();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'model-viewer-preview': ModelViewerPreview;
  }
}
