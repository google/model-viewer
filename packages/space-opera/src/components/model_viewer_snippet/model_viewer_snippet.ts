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

import {html} from 'lit';
import {customElement, state, property, query} from 'lit/decorators.js';

import {reduxStore} from '../../space_opera_base.js';
import {ArConfigState, BestPracticesState, ImageType, INITIAL_STATE, ModelViewerConfig, RelativeFilePathsState, State} from '../../types.js';
import {getBestPractices} from '../best_practices/reducer.js';
import {getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getHotspots} from '../hotspot_panel/reducer.js';
import {HotspotConfig} from '../hotspot_panel/types.js';
import {getArConfig} from '../mobile_view/reducer.js';
import {getGltfUrl, renderCommonChildElements} from '../model_viewer_preview/reducer.js';
import {dispatchSetPosterName, getRelativeFilePaths} from '../relative_file_paths/reducer.js';
import {DraggableInput} from '../shared/draggable_input/draggable_input.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SnippetViewer} from '../shared/snippet_viewer/snippet_viewer.js';
import {renderModelViewer} from '../utils/render_model_viewer.js';

import {ExportZipButton} from './components/download_button.js';
import {ImportCard} from './components/open_button.js';
import {applyRelativeFilePaths, dispatchHeight, dispatchMimeType, getExtraAttributes} from './reducer.js';

const DEFAULT_POSTER_HEIGHT =
    INITIAL_STATE.entities.modelViewerSnippet.poster.height;

/**
 *
 */
@customElement('me-export-panel')
export class ExportPanel extends ConnectedLitElement {
  @property({type: Boolean}) header = false;

  @state() config: ModelViewerConfig = {};
  @state() arConfig: ArConfigState = {};
  @state() hotspots: HotspotConfig[] = [];
  @state() relativeFilePaths?: RelativeFilePathsState;
  @state() gltfUrl?: string;
  @state() extraAttributes: any = {};
  @state() bestPractices?: BestPracticesState;

  @query('snippet-viewer') snippetViewer!: SnippetViewer;
  @query('me-export-zip-button') exportZipButton!: ExportZipButton;
  @query('me-import-card') importCard!: ImportCard;
  @query('me-draggable-input#height') heightInput!: DraggableInput;

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

  onHeightChange() {
    reduxStore.dispatch(dispatchHeight(this.heightInput.value));
  }

  onPosterSelect(event: CustomEvent) {
    const dropdown = event.target as Dropdown;
    const type = dropdown.selectedItem.getAttribute('value') as ImageType;
    reduxStore.dispatch(dispatchMimeType(type));
    const name = 'poster.' + type.substring(6);
    reduxStore.dispatch(dispatchSetPosterName(name));
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
    <me-section-row class="Row" style="display: flex; margin-top: 10px;" label="Poster:">
      <me-draggable-input id="height" style="width: 100px; align-self: center;" value=${
        DEFAULT_POSTER_HEIGHT}
      min=256 max=2048 precision=0 dragStepSize=8 @change=${
        this.onHeightChange} innerLabel="Height"></me-draggable-input>
      <me-dropdown style="width: 80px; margin-left: 10px;"
        @select=${this.onPosterSelect}
      >
        <paper-item value='image/webp'>WEBP</paper-item>
        <paper-item value='image/png'>PNG</paper-item>
        <paper-item value='image/jpeg'>JPEG</paper-item>
      </me-dropdown>
    </me-section-row>
    <div style="display: flex; justify-content: space-between; margin-top: 10px;">
      <me-export-zip-button id="export-zip"></me-export-zip-button>
      <me-export-poster-button></me-export-poster-button>
    </div>
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
