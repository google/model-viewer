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

import {customElement, html, internalProperty} from 'lit-element';

import {reduxStore} from '../../space_opera_base.js';
import {posterControlsStyles, toastStyles} from '../../styles.css.js';
import {State} from '../../types.js';
import {dispatchSaveCameraOrbit, dispatchSetPoster, getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getCameraState, getModelViewer} from '../model_viewer_preview/reducer.js';
import {dispatchSetPosterName} from '../relative_file_paths/reducer.js';
import {createSafeObjectURL, safeDownloadCallback} from '../utils/create_object_url.js';

/** Allow users to create / display a poster. */
@customElement('me-poster-controls')
export class PosterControlsElement extends ConnectedLitElement {
  static styles = [posterControlsStyles, toastStyles];

  @internalProperty() poster?: string;
  @internalProperty() toastClassName: string = '';
  @internalProperty() toastBody: string = '';
  @internalProperty() initialCamera: string = 'auto auto auto';

  stateChanged(state: State) {
    const config = getConfig(state);
    this.poster = config.poster;
    this.initialCamera = config.cameraOrbit ?? 'auto auto auto';
  }

  render() {
    return html`
<me-expandable-tab tabName="Poster">
  <div slot="content">
    <mwc-button unelevated class="PosterButton" 
      @click="${this.onCreatePoster}">Generate Poster</mwc-button>
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
</me-expandable-tab>
<div class="${this.toastClassName}" id="snackbar">${this.toastBody}</div>
        `;
  }

  async onCreatePoster() {
    const modelViewer = getModelViewer()!;
    if (!modelViewer)
      return;

    // otherwise, take the current model-viewer state
    const currentCamera = await getCameraState();
    reduxStore.dispatch(dispatchSaveCameraOrbit(currentCamera.orbit));
    this.toastBody =
        'Initial camera undefined, setting initial camera to current camera.';
    this.toastClassName = 'show';
    setTimeout(() => {
      this.toastClassName = '';
    }, 4000);
    let posterUrl =
        createSafeObjectURL(await modelViewer.toBlob({idealAspect: true}));
    reduxStore.dispatch(dispatchSetPoster(posterUrl.unsafeUrl));

    reduxStore.dispatch(dispatchSetPosterName('poster.png'));
  }

  onDisplayPoster() {
    const modelViewer = getModelViewer()!;
    modelViewer.cameraOrbit = this.initialCamera;
    modelViewer.jumpCameraToGoal();
    requestAnimationFrame(async () => {
      modelViewer.reveal = 'interaction';
      modelViewer.showPoster();
    });
  }

  onDeletePoster() {
    if (this.poster) {
      URL.revokeObjectURL(this.poster);
    }
    reduxStore.dispatch(dispatchSetPoster(undefined));
    reduxStore.dispatch(dispatchSetPosterName(undefined));
  }

  async onDownloadPoster() {
    const modelViewer = getModelViewer()!;
    if (!modelViewer || !this.poster)
      return;
    safeDownloadCallback(
        await (await fetch(this.poster)).blob(), 'poster.png')();
  }
}

declare global {
  interface PosterControlsElement {
    'me-poster-controls': PosterControlsElement;
  }
}
