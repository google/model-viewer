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
import {customElement, html} from 'lit-element';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';

/**
 * Home
 */
@customElement('home-container')
export class HomeContainer extends ConnectedLitElement {
  render() {
    return html`
      <me-expandable-tab tabName="home" .open=${true}>
        <div slot="content">
          <div>
            Welcome to the model viewer editor where you can generate &lt;model-viewer&gt; HTML snippets, as well as edit GLBs.
          </div>
          <a href="https://policies.google.com/privacy" style="color: white">Privacy</a>
        </div>
      </me-expandable-tab>
      <me-expandable-tab tabName="beginner" .open=${true}>
        <div slot="content">
          <me-card title="Quick Start">
            <div slot="content">
              <p>Assembly Line</p> 
              <p>This module is for beginners. Assembly Line is a bundle of features including: loading, basic editing, and export.</p> 
            </div>
          </me-card>
        </div>
      </me-expandable-tab>
      <me-expandable-tab tabName="advanced" .open=${true}>
        <div slot="content">
          <me-card title="File Manager">
            <div slot="content">
              <p>Import&sol; Export</p> 
              <p>Import or export your GLB models as well as insert or copy &lt;model-viewer&gt; HTML snippets.</p> 
            </div>
          </me-card>
          <me-card title="&lt;model-viewer&gt;">
            <div slot="content">
              <p>Edit</p> 
              <p>Adjust your lighting, hotspots, or posters in finer detail.</p> 
              <p>Camera</p> 
              <p>Update the camera settings including adding interactivity, rotation, and targets.</p> 
            </div>
          </me-card>
          <me-card title="GLB Model">
            <div slot="content">
              <p>Materials</p> 
              <p>Modify properties of materials such as color, metallic roughness, normal maps, etc.</p> 
              <p>Inspector</p> 
              <p>Visualize the gltf json string generated from your imported model.</p> 
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
  }
}
