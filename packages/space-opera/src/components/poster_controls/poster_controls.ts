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


import '../shared/expandable_content/expandable_tab.js';
import '@material/mwc-button';

import {createSafeObjectURL} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js';
import {safeDownloadCallback} from '@google/model-viewer-editing-adapter/lib/util/safe_download_callback.js';
import {customElement, html, internalProperty} from 'lit-element';

import {reduxStore} from '../../space_opera_base.js';
import {posterControlsStyles} from '../../styles.css.js';
import {toastStyles} from '../../styles.css.js';
import {State} from '../../types.js';
import {Camera, getOrbitString} from '../camera_settings/camera_state.js';
import {dispatchSaveCameraOrbit, getCamera} from '../camera_settings/reducer.js';
import {dispatchSetPoster, getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getModelViewer} from '../model_viewer_preview/model_viewer.js';
import {getCameraState} from '../model_viewer_preview/model_viewer_preview.js';

/** Allow users to create / display a poster. */
@customElement('me-poster-controls')
export class PosterControlsElement extends ConnectedLitElement {
  static styles = [posterControlsStyles, toastStyles];

  @internalProperty() poster?: string;
  @internalProperty() toastClassName: string = '';
  @internalProperty() toastBody: string = '';
  @internalProperty() cameraSnippet: Camera = {};

  stateChanged(state: State) {
    this.poster = getConfig(state).poster;
    this.cameraSnippet = getCamera(state);
  }

  render() {
    return html`
<me-expandable-tab tabName="Poster">
  <div slot="content">
    <me-card title="Poster Creation">
      <div slot="content">
        <mwc-button unelevated class="PosterButton" 
          @click="${
        this.onCreatePoster}">Generate Poster At Initial Camera</mwc-button>
        <div class="PosterHelperButtons">
        ${
    !!this.poster ? html`
        <mwc-button unelevated class="PosterButton"
          @click="${this.onDownloadPoster}">Download Poster</mwc-button>
        <mwc-button unelevated class="PosterButton"
          @click="${this.onDisplayPoster}">Display Poster</mwc-button>
        <mwc-button unelevated class="PosterButton"
          @click="${this.onDeletePoster}">Delete Poster</mwc-button>` :
                    html` `}
        </div>
      </div>
    </me-card>
  </div>
</me-expandable-tab>
<div class="${this.toastClassName}" id="snackbar">${this.toastBody}</div>
        `;
  }

  async onCreatePoster() {
    const modelViewer = getModelViewer()!;
    if (!modelViewer)
      return;

    // if we've already set the initial camera, use it
    if (this.cameraSnippet.orbit !== undefined) {
      const initialOrbit = this.cameraSnippet.orbit;
      modelViewer.cameraOrbit = getOrbitString(initialOrbit);
      modelViewer.jumpCameraToGoal();
      requestAnimationFrame(async () => {
        let posterUrl =
            createSafeObjectURL(await modelViewer.toBlob({idealAspect: true}));
        reduxStore.dispatch(dispatchSetPoster(posterUrl.unsafeUrl));
      });
    } else {
      // otherwise, take the current model-viewer state
      const currentOrbit = getCameraState(modelViewer).orbit;
      reduxStore.dispatch(dispatchSaveCameraOrbit(currentOrbit));
      this.toastBody =
          'Initial camera undefined, setting initial camera to current camera.';
      this.toastClassName = 'show';
      setTimeout(() => {
        this.toastClassName = '';
      }, 4000);
      let posterUrl =
          createSafeObjectURL(await modelViewer.toBlob({idealAspect: true}));
      reduxStore.dispatch(dispatchSetPoster(posterUrl.unsafeUrl));
    }
  }

  onDisplayPoster() {
    const modelViewer = getModelViewer()!;
    if (!modelViewer)
      return;
    if (this.cameraSnippet.orbit !== undefined) {
      const initialOrbit = this.cameraSnippet.orbit;
      modelViewer.cameraOrbit = getOrbitString(initialOrbit);
      modelViewer.jumpCameraToGoal();
      requestAnimationFrame(async () => {
        modelViewer.reveal = 'interaction';
        modelViewer.showPoster()
      });
    }
  }

  onDeletePoster() {
    if (this.poster) {
      URL.revokeObjectURL(this.poster);
    }
    reduxStore.dispatch(dispatchSetPoster(undefined));
  }

  async onDownloadPoster() {
    const modelViewer = getModelViewer()!;
    if (!modelViewer || !this.poster)
      return;
    safeDownloadCallback(
        await (await fetch(this.poster)).blob(), 'poster.png', '')();
  }
}

declare global {
  interface PosterControlsElement {
    'me-poster-controls': PosterControlsElement;
  }
}
