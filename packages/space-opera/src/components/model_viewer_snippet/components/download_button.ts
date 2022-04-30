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

// tslint:disable-next-line:enforce-name-casing JSZip is a class.
import JSZip from 'jszip';
import {css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {BestPracticesState, ModelViewerConfig, RelativeFilePathsState, State} from '../../../types.js';
import {modelViewerTemplate, progressBar, scriptTemplate} from '../../best_practices/constants.js';
import {getBestPractices} from '../../best_practices/reducer.js';
import {arButtonCSS, arPromptCSS, modelViewerStyles, progressBarCSS} from '../../best_practices/styles.css.js';
import {getConfig} from '../../config/reducer.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {getHotspots} from '../../hotspot_panel/reducer.js';
import {getModelViewer} from '../../model_viewer_preview/reducer.js';
import {getRelativeFilePaths} from '../../relative_file_paths/reducer.js';
import {safeDownloadCallback} from '../../utils/create_object_url.js';
import {styles as hotspotStyles} from '../../utils/hotspot/hotspot.css.js';
import {createPoster} from '../../utils/render_model_viewer.js';

interface Payload {
  blob: Blob;
  filename: string;
}

/**
 * A generic button base class for downloading file resources.
 */
class GenericDownloadButton extends ConnectedLitElement {
  static get styles() {
    return css`
        :host {--mdc-button-disabled-fill-color: rgba(255,255,255,.88)}
        `;
  }

  @state() buttonLabel = '';
  @state() preparePayload?: () => Promise<Payload|null>;

  // NOTE: Because this is async, it is possible for multiple downloads to be
  // kicked off at once. But this is unlikely, and each download has no
  // side-effects anyway, so nothing bad can happen.
  async onDownloadClick() {
    const payload = await this.preparePayload!();
    if (!payload)
      return;
    await safeDownloadCallback(payload.blob, payload.filename)();
  }

  render() {
    return html`<mwc-button unelevated
        icon="file_download"
        ?disabled=${!this.preparePayload}
        @click=${this.onDownloadClick}>
          ${this.buttonLabel}</mwc-button>`;
  }
}

export async function prepareGlbPayload(modelName: string): Promise<Payload> {
  return {blob: await getModelViewer()!.exportScene(), filename: modelName};
}

async function preparePosterPayload(posterName: string): Promise<Payload> {
  return {blob: await createPoster(), filename: posterName};
}

// Fixes some formatting issues with the snippet as it is being placed into the
// template.
function beautify_snippet(snippetList: string[]): string {
  let snippet = '';
  let i = 0;
  for (let line of snippetList) {
    if (i == 0) {
      snippet = `${line}\n`;
    } else if (i !== 0 && line.includes('model-viewer')) {
      snippet = `${snippet}    ${line}`;
    } else {
      snippet = `${snippet}  ${line}\n`;
    }
    i += 1;
  }
  return snippet;
}

/**
 * Add elements to ZIP as necessary.
 */
async function prepareZipArchive(
    config: ModelViewerConfig,
    data: {snippetText: string},
    relativeFilePaths: RelativeFilePathsState,
    bestPractices: BestPracticesState,
    hasHotspots: boolean): Promise<Payload> {
  const zip = new JSZip();

  const glb = await prepareGlbPayload(relativeFilePaths.modelName!);
  zip.file(glb.filename, glb.blob);

  // check if legal envrionment url
  if (config.environmentImage != null &&
      config.environmentImage !== 'neutral') {
    const response = await fetch(config.environmentImage);
    if (!response.ok) {
      throw new Error(`Failed to fetch url ${config.environmentImage}`);
    }
    zip.file(relativeFilePaths.environmentName!, response.blob());
  }

  // always generate a poster image
  const posterBlob = await createPoster();
  zip.file(relativeFilePaths.posterName!, posterBlob);

  let template = modelViewerTemplate;
  // Conditionally set script if anything requires javascript. Currently, this
  // is only the progressbar.
  const script = bestPractices.progressBar ? scriptTemplate : '';
  const arPrompt = 'https://modelviewer.dev/shared-assets/icons/hand.png';
  const arIcon =
      'https://modelviewer.dev/shared-assets/icons/ic_view_in_ar_new_googblue_48dp.png';
  const relativePrompt = 'ar_hand_prompt.png';
  const relativeIcon = 'ar_icon.png';

  let snippet = beautify_snippet(data.snippetText.split('\n'));
  snippet = `${snippet}\n${script}\n`;
  if (bestPractices.arPrompt) {
    snippet = snippet.replace(arPrompt, relativePrompt);
  }

  // Replace placeholders in html strings with content
  template = template.replace('REPLACEME', snippet);
  template = template.replace(/(^[ \t]*\n)/gm, '');  // remove extra newlines
  zip.file('index.html', template);

  // Keep model-viewer snippet
  zip.file('snippet.txt', data.snippetText);

  // Add css file for the model-viewer and other related add ons
  let cssText = modelViewerStyles.cssText;
  if (hasHotspots) {
    cssText = `${cssText}\n${hotspotStyles.cssText}`;
  }
  if (bestPractices.progressBar) {
    cssText = `${cssText}\n${progressBarCSS.cssText}`;
  }
  if (bestPractices.arButton) {
    const arCSS = arButtonCSS.cssText.replace(arIcon, relativeIcon);
    cssText = `${cssText}\n${arCSS}`;
    const response = await fetch(arIcon);
    if (!response.ok) {
      console.log(`Failed to fetch url ${arIcon}`);
    } else {
      zip.file(relativeIcon, response.blob());
    }
  }
  if (bestPractices.arPrompt) {
    cssText = `${cssText}\n${arPromptCSS.cssText}`;
    const response = await fetch(arPrompt);
    if (!response.ok) {
      console.log(`Failed to fetch url ${arPrompt}`);
    } else {
      zip.file(relativePrompt, response.blob());
    }
  }
  zip.file('styles.css', cssText);

  // Add a script file if any javascript is needed
  if (bestPractices.progressBar) {
    zip.file('script.js', progressBar);
  }

  return {
    blob: await zip.generateAsync({type: 'blob', compression: 'DEFLATE'}),
    filename: 'model.zip'
  };
}

/**
 * A button to download GLB file resources.
 */
@customElement('me-export-poster-button')
export class ExportPosterButton extends GenericDownloadButton {
  constructor() {
    super();
    this.buttonLabel = 'POSTER';
  }

  stateChanged(state: State) {
    const loaded = getModelViewer()?.loaded;
    const {posterName} = getRelativeFilePaths(state);
    this.preparePayload =
        loaded ? () => preparePosterPayload(posterName) : undefined;
  }
}

/**
 * A button to download all file resources as a ZIP.
 */
@customElement('me-export-zip-button')
export class ExportZipButton extends GenericDownloadButton {
  snippetText: string = '';

  constructor() {
    super();
    this.buttonLabel = 'DOWNLOAD SCENE';
  }

  stateChanged(state: State) {
    const config = getConfig(state);
    const loaded = getModelViewer()?.loaded;
    const relativeFilePaths = getRelativeFilePaths(state);
    const bestPractices = getBestPractices(state);
    const hasHotspots = getHotspots(state).length > 0;

    if (!loaded) {
      this.preparePayload = undefined;
      return;
    }

    // Note that snippet text will necessarily be set manually post-update,
    // and therefore we must pass a containing object (in our case, this) by
    // reference.
    this.preparePayload = () => prepareZipArchive(
        config, this, relativeFilePaths, bestPractices, hasHotspots);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-export-poster-button': ExportPosterButton;
    'me-export-zip-button': ExportZipButton;
  }
}
