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

import {html} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {reduxStore} from '../../../space_opera_base.js';
import {zoomStyles} from '../../../styles.css.js';
import {dispatchSetMinZoom} from '../../config/reducer.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {getModelViewer} from '../../model_viewer_preview/reducer.js';

/** The Camera Settings panel. */
@customElement('me-camera-zoom-limits')
export class ZooomLimits extends ConnectedLitElement {
  static styles = zoomStyles;

  @state() enabled = false;
  @state() minRadius?: number = undefined;
  @state() minFov?: number = undefined;

  onToggle(event: Event) {
    this.enabled = (event.target as HTMLInputElement).checked;

    if (this.enabled) {
      reduxStore.dispatch(dispatchSetMinZoom(this.minFov, this.minRadius));
    } else {
      reduxStore.dispatch(dispatchSetMinZoom());
    }
  }

  dispatchMin() {
    const modelViewer = getModelViewer()!;
    this.minFov = modelViewer.getFieldOfView();
    const currentOrbit = modelViewer.getCameraOrbit();
    this.minRadius = currentOrbit.radius;
    reduxStore.dispatch(dispatchSetMinZoom(this.minFov, this.minRadius));
  }

  dispatchResetMin() {
    this.minRadius = undefined;
    this.minFov = undefined;
    reduxStore.dispatch(dispatchSetMinZoom());
  }

  render() {
    return html`
    <me-checkbox
      id="limit-enabled"
      label="Apply Minimum Zoom"
      ?checked="${this.enabled}"
      @change=${this.onToggle}>
    </me-checkbox>
    ${
        this.enabled ? html`
      <mwc-button id="set-min-button" class="SetButton" unelevated
      @click="${this.dispatchMin}">Set Min</mwc-button>
      <mwc-button id="set-min-button" class="SetButton" unelevated icon="undo"
      @click="${this.dispatchResetMin}">Reset Min</mwc-button>
    ` :
                       html``}
`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-zoom-limits': ZooomLimits;
  }
}
