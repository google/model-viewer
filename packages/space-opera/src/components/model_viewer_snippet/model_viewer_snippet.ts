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
import '../mobile_view/open_mobile_view.js';
import '../shared/snippet_viewer/snippet_viewer.js';
import '../shared/expandable_content/expandable_tab.js';

import {customElement, html, internalProperty, property, query} from 'lit-element';

import {ArConfigState, BestPracticesState, ModelViewerConfig, RelativeFilePathsState, State} from '../../types.js';
import {getBestPractices} from '../best_practices/reducer.js';
import {getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getHotspots} from '../hotspot_panel/reducer.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {getArConfig} from '../mobile_view/reducer.js';
import {getGltfUrl, renderCommonChildElements} from '../model_viewer_preview/reducer.js';
import {getRelativeFilePaths} from '../relative_file_paths/reducer.js';
import {SnippetViewer} from '../shared/snippet_viewer/snippet_viewer.js';
import {renderModelViewer} from '../utils/render_model_viewer.js';

import {ExportZipButton} from './components/download_button.js';
import {ImportCard} from './components/open_button.js';
import {applyRelativeFilePaths, getExtraAttributes} from './reducer.js';

/**
 *
 */
@customElement('me-export-panel')
export class ExportPanel extends ConnectedLitElement {
  @property({type: Boolean}) header = false;

  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() arConfig: ArConfigState = {};
  @internalProperty() hotspots: HotspotConfig[] = [];
  @internalProperty() relativeFilePaths?: RelativeFilePathsState;
  @internalProperty() gltfUrl?: string;
  @internalProperty() extraAttributes: any = {};
  @internalProperty() bestPractices?: BestPracticesState;

  @query('snippet-viewer') snippetViewer!: SnippetViewer;
  @query('me-export-zip-button') exportZipButton!: ExportZipButton;
  @query('me-import-card') importCard!: ImportCard;

  stateChanged(state: State) {
    this.config = getConfig(state);
    this.arConfig = getArConfig(state);
    this.hotspots = getHotspots(state);
    this.gltfUrl = getGltfUrl(state);
    this.relativeFilePaths = getRelativeFilePaths(state);
    this.extraAttributes = getExtraAttributes(state);
    this.bestPractices = getBestPractices(state);
  }

  snippetCopyToClipboard() {
    this.snippetViewer.copyToClipboard();
  }

  onSnippetOpen() {
    this.importCard.onSnippetOpen();
  }

  render() {
    const editedConfig = {...this.config};
    applyRelativeFilePaths(editedConfig, this.gltfUrl, this.relativeFilePaths!);

    const childElements =
        renderCommonChildElements(this.hotspots, this.bestPractices!);

    const snippet = renderModelViewer(
        editedConfig, this.arConfig, this.extraAttributes, {}, childElements);

    if (this.header === true) {
      return html`
<me-expandable-tab tabName="&lt;model-viewer&gt; snippet" 
  .open=${true} .sticky=${false} 
  .copyFunction=${this.snippetCopyToClipboard.bind(this)}>
  <div slot="content">
    <snippet-viewer id="snippet-header" .renderedSnippet=${snippet}>
    </snippet-viewer>
  </div>
</me-expandable-tab>`;
    }

    // on import/export tab
    return html`
<me-expandable-tab tabName="&lt;model-viewer&gt; snippet" 
  .open=${true} .sticky=${false} 
  .copyFunction=${this.snippetCopyToClipboard.bind(this)}>
  <div slot="content">
    <snippet-viewer id="snippet-header" .renderedSnippet=${snippet}>
    </snippet-viewer>
    <mwc-button unelevated @click=${this.onSnippetOpen}>
      Edit Snippet
    </mwc-button>
  </div>
</me-expandable-tab>
<me-expandable-tab tabName="File Manager" .open=${true}>
  <div slot="content">
    <me-import-card></me-import-card>
    <me-export-zip-button id="export-zip" style="display: block; margin-top: 10px;"></me-export-zip-button>
  </div>
</me-expandable-tab>
<me-expandable-tab tabName="Mobile View" .open=${true}>
  <open-mobile-view slot="content"></open-mobile-view>
</me-expandable-tab>
<me-expandable-tab tabName="Best Practices" .open=${true}>
  <best-practices slot="content"></best-practices>
</me-expandable-tab>
`;
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
