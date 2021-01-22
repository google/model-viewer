/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

import {html} from 'lit-element';
import {getModelViewer} from '../model_viewer_preview/reducer';

// TODO: Add <scripts> to be added into the HTML file.

export function renderProgressBar() {
  getModelViewer()?.addEventListener('progress', onProgress);
  return html`
  <div class="progress-bar" slot="progress-bar">
    <div class="update-bar"></div>
  </div>
  `
}

export function renderARButton() {
  return html`
  <button slot="ar-button" id="ar-button">
    View in your space
  </button>
  `
}

export const onProgress = (event) => {
  const progressBar = event.target.querySelector('.progress-bar');
  const updatingBar = event.target.querySelector('.update-bar');
  updatingBar.style.width = `${event.detail.totalProgress * 100}%`;
  if (event.detail.totalProgress === 1) {
    progressBar.classList.add('hide');
  } else {
    progressBar.classList.remove('hide');
    if (event.detail.totalProgress === 0) {
      event.target.querySelector('.center-pre-prompt')?.classList.add('hide');
    }
  }
};