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

import {customElement, html, LitElement} from 'lit-element';
import {styles} from './styles.css.js';

/**
 * The main model-viewer editor component for routing.
 */
@customElement('routes-editor')
export class EditorMain extends LitElement {
  static styles = styles;

  render() {
    return html`
  <model-editor>
    <div class="app">
      <div class="editor-body-root">
        <div class="mvContainer">
          <model-viewer-preview id="editing_adapter">
          </model-viewer-preview>
        </div>
        <me-tabs>
          <me-tabbed-panel icon="import_export">
            <me-export-panel></me-export-panel>
            <div class="privacy">
              This &lt;model-viewer&gt; editor does not send any imported content to servers:
              <a href="https://policies.google.com/privacy" class="privacy-link">
                Privacy
              </a>
            </div>
          </me-tabbed-panel>
          <me-tabbed-panel icon="create">
            <me-export-panel header="true"></me-export-panel>
            <me-transformation-controls></me-transformation-controls>
            <me-ibl-selector></me-ibl-selector>
            <me-animation-controls></me-animation-controls>
            <me-hotspot-panel></me-hotspot-panel>
            <me-poster-controls></me-poster-controls>
          </me-tabbed-panel>
          <me-tabbed-panel icon="photo_camera">
            <me-export-panel header="true"></me-export-panel>
            <me-camera-settings></me-camera-settings>
          </me-tabbed-panel>
          <me-tabbed-panel icon="color_lens">
            <me-materials-panel></me-materials-panel>
          </me-tabbed-panel>
          <me-tabbed-panel icon="search">
            <me-inspector-panel></me-inspector-panel>
          </me-tabbed-panel>
        </me-tabs>
      </div>
    </div>
  </model-editor>
`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'routes-editor': EditorMain;
  }
}
