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

import '@material/mwc-tab';
import '../shared/expandable_content/expandable_tab.js';

import {customElement, html, property} from 'lit-element';

import {homeStyles} from '../../styles.css.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';

const CARD_CONTENT = {
  save: {
    icon:
        'https://fonts.gstatic.com/s/i/materialiconsextended/import_export/v6/grey600-24dp/1x/baseline_import_export_grey600_24dp.png',
    header: 'Import/ Export',
    body: 'Import or export GLB models as well as model-viewer HTML snippets.'
  },
  edit: {
    icon:
        'https://fonts.gstatic.com/s/i/googlematerialicons/create/v6/grey600-24dp/1x/gm_create_grey600_24dp.png',
    header: 'Edit',
    body:
        'Adjust <model-viewer>\'s parameters for lighting, hotspots, and posters.'
  },
  camera: {
    icon:
        'https://fonts.gstatic.com/s/i/materialiconsextended/photo_camera/v6/grey600-24dp/1x/baseline_photo_camera_grey600_24dp.png',
    header: 'Camera',
    body:
        'Adjust <model-viewer>\'s camera parameters for interactivity, rotation, and targets.'
  },
  materials: {
    icon:
        'https://fonts.gstatic.com/s/i/materialiconsextended/color_lens/v7/grey600-24dp/1x/baseline_color_lens_grey600_24dp.png',
    header: 'Materials',
    body:
        'Modify GLB materials such as base color, roughness, normal maps, etc.'
  },
  inspector: {
    icon:
        'https://fonts.gstatic.com/s/i/materialiconsextended/search/v7/grey600-24dp/1x/baseline_search_grey600_24dp.png',
    header: 'Inspector',
    body: 'Visualize the model\'s JSON string.'
  }
};

interface CardContentInterface {
  icon?: string;
  header?: string;
  body?: string;
}

/**
 * Home Container Card
 */
@customElement('home-container-card')
export class HomeContainerCard extends ConnectedLitElement {
  static styles = homeStyles;
  @property({type: Object}) content: CardContentInterface = {};

  render() {
    return html`
      <div class="CardContainer">
        <div class="CardContent">
          <img src=${this.content.icon}>
        </div>
        <div class="CardContent text">
          <div class="HomeCardHeader">${this.content.header}</div> 
          <div class="HomeCardContent">${this.content.body}</div>
        </div>
      </div>
    `;
  }
}

/**
 * Home Container
 */
@customElement('home-container')
export class HomeContainer extends ConnectedLitElement {
  static styles = homeStyles;

  render() {
    return html`
      <me-expandable-tab tabName="Home" .open=${true} .sticky=${true}>
        <div slot="content">
          <div class="note">
            Welcome to the model viewer editor where you can generate &lt;model-viewer&gt; HTML snippets, as well as edit GLBs.
          </div>
          <a href="https://policies.google.com/privacy" style="color: black">Privacy</a>
        </div>
      </me-expandable-tab>
      <me-expandable-tab tabName="Modules" .open=${true}>
        <div slot="content">
          <me-card title="File Manager">
            <div slot="content">
              <home-container-card .content=${CARD_CONTENT.save}>
              </home-container-card>
            </div>
          </me-card>
          <me-card title="&lt;model-viewer&gt; snippet">
            <div slot="content">
              <home-container-card .content=${CARD_CONTENT.edit}>
              </home-container-card>
              <home-container-card .content=${CARD_CONTENT.camera}>
              </home-container-card>
            </div>
          </me-card>
          <me-card title="GLB Model">
            <div slot="content">
              <home-container-card .content=${CARD_CONTENT.materials}>
              </home-container-card>
              <home-container-card .content=${CARD_CONTENT.inspector}>
              </home-container-card>
            </div>
          </me-card>
        </div>
      </me-expandable-tab>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-container': HomeContainer;
    'home-container-card': HomeContainerCard;
  }
}
