/* @license
 * Copyright 2021 Google Inc. All Rights Reserved.
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
 */

const modelViewer = document.querySelector('#mv');
const queryParams = window.location.search.substring(1).split('&');
for (const param of queryParams) {
  const keyVal = param.split('=');
  const num = Number(keyVal[1]);
  modelViewer[keyVal[0]] = isFinite(num) ? num : keyVal[1];
}

async function downloadPoster(filename) {
  // Ensure full-res capture
  const ModelViewerElement = customElements.get('model-viewer');
  const oldMinScale = ModelViewerElement.minimumRenderScale;
  ModelViewerElement.minimumRenderScale = 1;

  // Set to beginning of animation
  modelViewer.pause();
  modelViewer.currentTime = 0;

  // Set to initial camera orbit
  modelViewer.cameraOrbit = null;
  modelViewer.cameraOrbit = cameraOrbit;
  modelViewer.jumpCameraToGoal();

  // Wait for model-viewer to resize and render.
  await new Promise(resolve => requestAnimationFrame(() => resolve()));
  const posterBlob =
      await modelViewer.toBlob({mimeType: 'image/webp', qualityArgument: 0.85});

  // Reset to original state
  modelViewer.play();
  ModelViewerElement.minimumRenderScale = oldMinScale;

  // Download the poster
  const url = URL.createObjectURL(posterBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 250);
}