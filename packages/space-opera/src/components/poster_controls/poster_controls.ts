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
import {State} from '../../types.js';
import {dispatchSaveCameraOrbit} from '../camera_settings/reducer.js';
import {dispatchSetPoster} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getModelViewer} from '../model_viewer_preview/model_viewer.js';
import {getCameraState} from '../model_viewer_preview/model_viewer_preview.js';

import {styles} from './poster_controls.css';

/** Allow users to create / display a poster. */
@customElement('me-poster-controls')
export class PosterControlsElement extends ConnectedLitElement {
  static styles = styles;

  @internalProperty() poster?: string;

  stateChanged(state: State) {
    this.poster = state.config.poster;
  }

  render() {
    return html`
      <me-expandable-tab tabName="Poster">
        <div slot="content">
          <div class="ButtonContainer">
            <mwc-button unelevated
              @click="${this.onCreatePoster}">Create Poster</mwc-button>
          </div>
          ${
    !!this.poster ? html`
            <div class="ButtonContainer">
              <mwc-button unelevated
                @click="${this.onDownloadPoster}">Download</mwc-button>
            </div>
            <div class="ButtonContainer">
            <mwc-button unelevated
              @click="${this.onDisplayPoster}">Display Poster</mwc-button>
          </div>
          <div class="ButtonContainer">
            <mwc-button unelevated
              @click="${this.onDeletePoster}">Delete Poster</mwc-button>
          </div>` :
                    html` `}
        </div>
      </me-expandable-tab>
        `;
  }

  async onCreatePoster() {
    const modelViewer = getModelViewer()!;
    if (!modelViewer)
      return;
    const posterUrl =
        createSafeObjectURL(await modelViewer.toBlob({idealAspect: true}));
    reduxStore.dispatch(dispatchSetPoster(posterUrl.unsafeUrl));
    const currentOrbit = getCameraState(modelViewer).orbit;
    const currentFieldOfViewDeg = getCameraState(modelViewer).fieldOfViewDeg;
    reduxStore.dispatch(
        dispatchSaveCameraOrbit(currentOrbit, currentFieldOfViewDeg));
  }

  onDisplayPoster() {
    const modelViewer = getModelViewer()!;
    if (!modelViewer)
      return;
    // TODO, fix such that we aren't modifying modelViewer in here. i.e. add
    // settings to modelViewerPreview
    const src = modelViewer.src;
    // Normally we can just use dispatchSetReveal, but the value has to be
    // changed immediately before reload.
    modelViewer.reveal = 'interaction';
    // Force reload the model
    modelViewer.src = '';
    modelViewer.src = src;
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
