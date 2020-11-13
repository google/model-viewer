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

import {customElement, html, internalProperty} from 'lit-element';

import {reduxStore} from '../../../space_opera_base.js';
import {zoomStyles} from '../../../styles.css.js';
import {State} from '../../../types.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {getModelViewer} from '../../model_viewer_preview/model_viewer.js';
import {getCameraState} from '../../model_viewer_preview/model_viewer_preview.js';
import {dispatchFovLimits, dispatchRadiusLimits, dispatchSetMinZoom, dispatchZoomEnabled, getCamera} from '../reducer.js';
import {Limits} from '../types.js';

/** The Camera Settings panel. */
@customElement('me-camera-zoom-limits')
export class ZooomLimits extends ConnectedLitElement {
  static styles = zoomStyles;

  @internalProperty() hasZoom: boolean|undefined = false;
  @internalProperty() fovLimitsDeg: Limits|undefined = undefined;
  @internalProperty() snackClassName: string = '';
  @internalProperty() snackBody: string = '';

  stateChanged(state: State) {
    this.hasZoom = getCamera(state).fovLimitsDeg?.enabled;
    this.fovLimitsDeg = getCamera(state).fovLimitsDeg;
  }

  onToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked && this.fovLimitsDeg === undefined) {
      const newLimits = {
        enabled: checked,
        min: 'auto',
        max: 'auto',
      };
      reduxStore.dispatch(dispatchFovLimits(newLimits));
      reduxStore.dispatch(dispatchRadiusLimits(newLimits));
    } else {
      reduxStore.dispatch(dispatchZoomEnabled(checked));
    }
  }

  dispatchMin() {
    const currentCamera = getCameraState(getModelViewer()!);
    const currFieldOfView = currentCamera.fieldOfViewDeg;
    const currRadius = currentCamera.orbit?.radius;
    reduxStore.dispatch(dispatchSetMinZoom(currFieldOfView!, currRadius!));
  }

  dispatchResetMin() {
    reduxStore.dispatch(dispatchSetMinZoom('auto', 'auto'));
  }

  render() {
    return html`
    <me-card title="Minimum Zoom">
      <div slot="content">
        <me-checkbox
          id="limit-enabled"
          label="Minimum Zoom"
          ?checked="${!!this.hasZoom}"
          @change=${this.onToggle}>
        </me-checkbox>
        ${
        this.hasZoom ? html`
          <mwc-button id="set-min-button" class="SetButton" unelevated 
          @click="${this.dispatchMin}">Set Min</mwc-button>
          <mwc-button id="set-min-button" class="SetButton" unelevated icon="undo"
          @click="${this.dispatchResetMin}">Reset Min</mwc-button>
        ` :
                       html``}
      </div>
    </me-card>
    <div class="${this.snackClassName}" id="snackbar">${this.snackBody}</div>
`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-zoom-limits': ZooomLimits;
  }
}
