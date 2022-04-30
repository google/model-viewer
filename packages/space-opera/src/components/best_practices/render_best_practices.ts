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

import {html} from 'lit';
import {getMobileModelViewer} from '../mobile_view/reducer';
import {getModelViewer} from '../model_viewer_preview/reducer';

export function renderProgressBar(isEditor) {
  if (isEditor) {
    getModelViewer()?.addEventListener('progress', onProgress);
  } else {
    getMobileModelViewer()?.addEventListener('progress', onProgress);
  }
  return html`
<div class="progress-bar hide" slot="progress-bar">
<div class="update-bar"></div>
</div>`;
}

export const onProgress = (event) => {
  const progressBar = event.target.querySelector('.progress-bar');
  const updatingBar = event.target.querySelector('.update-bar');
  if (!progressBar || !updatingBar)
    return;
  updatingBar.style.width = `${event.detail.totalProgress * 100}%`;
  if (event.detail.totalProgress === 1) {
    progressBar.classList.add('hide');
    event.target.removeEventListener('progress', onProgress);
  } else {
    progressBar.classList.remove('hide');
    if (event.detail.totalProgress === 0) {
      event.target.querySelector('.center-pre-prompt')?.classList.add('hide');
    }
  }
};

export function renderARButton() {
  return html`
<button slot="ar-button" id="ar-button">
View in your space
</button>`;
}

export function renderARPrompt() {
  return html`
<div id="ar-prompt">
<img src="https://modelviewer.dev/shared-assets/icons/hand.png">
</div>`;
}