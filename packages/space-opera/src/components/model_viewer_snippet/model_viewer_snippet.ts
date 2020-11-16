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

import '@material/mwc-button';
import './components/open_button.js';
import './components/download_button.js';
import '../shared/snippet_viewer/snippet_viewer.js';
import '../shared/expandable_content/expandable_tab.js';

import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import {isObjectUrl} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js';
import {customElement, html, internalProperty, property, query} from 'lit-element';

import {State} from '../../types.js';
import {applyCameraEdits, Camera, INITIAL_CAMERA} from '../camera_settings/camera_state.js';
import {getCamera} from '../camera_settings/reducer.js';
import {getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getHotspots} from '../hotspot_panel/reducer.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {getGltfUrl} from '../model_viewer_preview/reducer.js';
import {SnippetViewer} from '../shared/snippet_viewer/snippet_viewer.js';
import {styles as hotspotStyles} from '../utils/hotspot/hotspot.css.js';
import {renderHotspots} from '../utils/hotspot/render_hotspots.js';
import {renderModelViewer} from '../utils/render_model_viewer.js';

import {ExportZipButton} from './components/download_button.js';

/**
 *
 */
@customElement('me-export-panel')
export class ExportPanel extends ConnectedLitElement {
  @property({type: String}) header = '';
  @property({type: Boolean}) isJustOutput? = false;

  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() hotspots: HotspotConfig[] = [];
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() gltfUrl?: string;

  @query('snippet-viewer') snippetViewer!: SnippetViewer;
  @query('me-export-zip-button') exportZipButton!: ExportZipButton;

  stateChanged(state: State) {
    this.config = getConfig(state);
    this.camera = getCamera(state);
    this.hotspots = getHotspots(state);
    this.gltfUrl = getGltfUrl(state);
  }

  snippetCopyToClipboard() {
    this.snippetViewer.copyToClipboard();
  }

  render() {
    const editedConfig = {...this.config};
    applyCameraEdits(editedConfig, this.camera);

    // If the last loaded URL is not an object URL, echo it here for
    // convenience.
    if (this.gltfUrl && !isObjectUrl(this.gltfUrl)) {
      editedConfig.src = this.gltfUrl;
    } else {
      // Uploaded GLB
      editedConfig.src = `Change this to your GLB URL`;
    }

    if (editedConfig.environmentImage &&
        isObjectUrl(editedConfig.environmentImage)) {
      // Uploaded env image
      editedConfig.environmentImage = `Change this to your HDR URL`;
    }

    if (editedConfig.poster && isObjectUrl(editedConfig.poster)) {
      editedConfig.poster = `Change this to your poster URL`;
    }

    const snippet =
        renderModelViewer(editedConfig, {}, renderHotspots(this.hotspots));

    if (this.isJustOutput) {
      return html`
<snippet-viewer id="snippet-header" .renderedSnippet=${snippet}
  .renderedStyle=${this.hotspots.length > 0 ? hotspotStyles.cssText : ``}>
</snippet-viewer>`;
    }

    if (this.header === 'true') {
      return html`
<me-expandable-tab tabName="&lt;model-viewer&gt; snippet" 
  .open=${true} .sticky=${true} 
  .copyFunction=${this.snippetCopyToClipboard.bind(this)}>
  <div slot="content">
    <snippet-viewer id="snippet-header" .renderedSnippet=${snippet}
      .renderedStyle=${this.hotspots.length > 0 ? hotspotStyles.cssText : ``}>
    </snippet-viewer>
  </div>
</me-expandable-tab>`;
    }

    return html`
<me-expandable-tab tabName="File Manager" .open=${true}>
  <div slot="content">
    <me-import-card></me-import-card>
    <me-card title="Export Content">
      <div slot="content" style="margin: 10px 0">
        <me-download-button id="download-gltf"></me-download-button>
        <me-export-zip-button id="export-zip"></me-export-zip-button>
      </div>
    </me-card>
    <me-card title="&lt;model-viewer&gt; snippet" .copyFunction=${
        this.snippetCopyToClipboard.bind(this)}>
      <div slot="content">
        <snippet-viewer .renderedSnippet=${snippet}
          .renderedStyle=${
        this.hotspots.length > 0 ? hotspotStyles.cssText : ``}>
        </snippet-viewer>
      </div>
    </me-card>
  </div>
</me-expandable-tab>`;
  }

  protected updated() {
    this.snippetViewer.updateComplete.then(() => {
      if (this.exportZipButton) {
        this.exportZipButton.snippetText =
            this.snippetViewer.snippet.textContent || '';
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-export-panel': ExportPanel;
  }
}
