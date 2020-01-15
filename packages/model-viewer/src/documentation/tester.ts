/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ModelViewerElement} from '../model-viewer.js';

const viewer = document.getElementById('loading-demo') as ModelViewerElement;

viewer.addEventListener('dragover', (event) => {
  event.preventDefault();
});

viewer.addEventListener('drop', (event) => {
  event.preventDefault();
  const file = event.dataTransfer!.files[0];
  const filename = file.name.toLowerCase();
  const target = event.target as ModelViewerElement;
  if (filename.match(/\.(gltf|glb)$/)) {
    target.src = URL.createObjectURL(file);
  } else if (filename.match(/\.(hdr)$/)) {
    target.skyboxImage = URL.createObjectURL(file) + '#.hdr';
  } else if (filename.match(/\.(png|jpg)$/)) {
    target.skyboxImage = URL.createObjectURL(file);
  }
});

viewer.addEventListener('error', (event) => {
  console.error((event as any).detail);
  viewer.src = 'assets/Astronaut.glb';
});

(['src', 'environmentImage', 'backgroundColor'] as
 Array<'src'|'environmentImage'|'backgroundColor'>)
    .forEach((property) => {
      document.getElementById(`${property}`)!.addEventListener(
          'input', (event) => {
            viewer[property] = (event.target as HTMLInputElement).value;
          });
    });

const useSkybox = document.getElementById('useSkybox') as HTMLInputElement;
useSkybox.addEventListener('change', (_event) => {
  const backgroundColor =
      document.getElementById('backgroundColor') as HTMLInputElement;
  if (useSkybox.checked) {
    viewer.skyboxImage = viewer.environmentImage;
    backgroundColor.disabled = true;
  } else {
    viewer.skyboxImage = null;
    backgroundColor.disabled = false;
  }
});

(['exposure', 'shadowIntensity', 'shadowSoftness'] as
 Array<'exposure'|'shadowIntensity'|'shadowSoftness'>)
    .forEach((property) => {
      const input = document.getElementById(`${property}`) as HTMLInputElement;
      const output =
          document.getElementById(`${property}Value`) as HTMLInputElement;
      input.addEventListener('input', (event) => {
        output.value = (event.target as HTMLInputElement).value;
        viewer[property] = parseFloat(output.value);
      });
      output.addEventListener('input', (event) => {
        input.value = (event.target as HTMLInputElement).value;
        viewer[property] = parseFloat(output.value);
      });
    });

(['autoRotate'] as Array<'autoRotate'>).forEach((property) => {
  const checkbox = document.getElementById(`${property}`) as HTMLInputElement;
  checkbox.addEventListener('change', (_event) => {
    viewer[property] = checkbox.checked;
  });
});

let posterUrl = '';
const a = document.createElement('a');
const downloadButton = document.getElementById('download') as HTMLButtonElement;
const displayButton = document.getElementById('display') as HTMLButtonElement;
downloadButton.disabled = true;
displayButton.disabled = true;
const orbitString = document.getElementById('cameraOrbit') as HTMLDivElement;

export async function createPoster() {
  const orbit = viewer.getCameraOrbit();
  orbitString.textContent = `${orbit.theta}rad ${orbit.phi}rad auto`;
  viewer.fieldOfView = 'auto';
  viewer.jumpCameraToGoal();
  await new Promise(resolve => requestAnimationFrame(() => resolve()));
  URL.revokeObjectURL(posterUrl);
  const blob = await viewer.toBlob({mimeType: 'image/jpeg', idealAspect: true});
  posterUrl = URL.createObjectURL(blob);
  downloadButton.disabled = false;
  displayButton.disabled = false;
}

export function reloadScene() {
  viewer.poster = posterUrl;
  viewer.reveal = 'interaction';
  viewer.cameraOrbit = orbitString.textContent!;
  const src = viewer.src;
  viewer.src = null;
  viewer.src = src;
}

export function downloadPoster() {
  a.href = posterUrl;
  a.download = 'poster.jpg';
  a.click();
}

(self as any).createPoster = createPoster;
(self as any).reloadScene = reloadScene;
(self as any).downloadPoster = downloadPoster;