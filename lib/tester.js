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
import { ModelViewerElement } from '@google/model-viewer/lib/model-viewer';
import { SimpleDropzone } from 'simple-dropzone';
const viewer = document.getElementById('loading-demo');
const inputElement = document.querySelector('#input');
const dropControl = new SimpleDropzone(viewer, inputElement);
dropControl.on('drop', ({ files }) => load(files));
['src', 'environmentImage']
    .forEach((property) => {
    document.getElementById(`${property}`).addEventListener('input', (event) => {
        viewer[property] = event.target.value;
        if (viewer.environmentImage === '') {
            useSkybox.disabled = true;
            useSkybox.checked = false;
            viewer.skyboxImage = null;
        }
        else {
            useSkybox.disabled = false;
        }
        if (useSkybox.checked) {
            viewer.skyboxImage = viewer.environmentImage;
        }
        if (property === 'src') {
            resetModel();
        }
    });
});
function resetModel() {
    viewer.reveal = 'auto';
    viewer.dismissPoster();
    downloadButton.disabled = true;
    displayButton.disabled = true;
    // remove hotspots
    while (viewer.firstChild) {
        viewer.removeChild(viewer.firstChild);
    }
}
const useSkybox = document.getElementById('useSkybox');
useSkybox.addEventListener('change', (_event) => {
    if (useSkybox.checked) {
        viewer.skyboxImage = viewer.environmentImage;
    }
    else {
        viewer.skyboxImage = null;
    }
});
['exposure', 'shadowIntensity', 'shadowSoftness']
    .forEach((property) => {
    const input = document.getElementById(`${property}`);
    const output = document.getElementById(`${property}Value`);
    input.addEventListener('input', (event) => {
        output.value = event.target.value;
        viewer[property] = parseFloat(output.value);
    });
    output.addEventListener('input', (event) => {
        input.value = event.target.value;
        viewer[property] = parseFloat(output.value);
    });
});
['autoRotate'].forEach((property) => {
    const checkbox = document.getElementById(`${property}`);
    checkbox.addEventListener('change', (_event) => {
        viewer[property] = checkbox.checked;
    });
});
let posterUrl = '';
const a = document.createElement('a');
const downloadButton = document.getElementById('download');
const displayButton = document.getElementById('display');
downloadButton.disabled = true;
displayButton.disabled = true;
const orbitString = document.getElementById('cameraOrbit');
export async function createPoster() {
    const orbit = viewer.getCameraOrbit();
    orbitString.textContent = `${orbit.theta}rad ${orbit.phi}rad auto`;
    viewer.fieldOfView = 'auto';
    viewer.jumpCameraToGoal();
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
    URL.revokeObjectURL(posterUrl);
    const blob = await viewer.toBlob({ mimeType: 'image/png', idealAspect: true });
    posterUrl = URL.createObjectURL(blob);
    downloadButton.disabled = false;
    displayButton.disabled = false;
}
export function reloadScene() {
    viewer.poster = posterUrl;
    viewer.reveal = 'interaction';
    viewer.cameraOrbit = orbitString.textContent;
    viewer.jumpCameraToGoal();
    const src = viewer.src;
    viewer.src = null;
    viewer.src = src;
}
export function downloadPoster() {
    a.href = posterUrl;
    a.download = 'poster.png';
    a.click();
}
export function addHotspot() {
    viewer.addEventListener('click', onClick);
}
let hotspotCounter = 0;
let selectedHotspot = undefined;
export function removeHotspot() {
    if (selectedHotspot != null) {
        viewer.removeChild(selectedHotspot);
    }
}
function select(hotspot) {
    for (let i = 0; i < viewer.children.length; i++) {
        viewer.children[i].classList.remove('selected');
    }
    hotspot.classList.add('selected');
    selectedHotspot = hotspot;
}
function onClick(event) {
    const rect = viewer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const positionAndNormal = viewer.positionAndNormalFromPoint(x, y);
    if (positionAndNormal == null) {
        console.log('no hit result: mouse = ', x, ', ', y);
        return;
    }
    const { position, normal } = positionAndNormal;
    const hotspot = document.createElement('button');
    hotspot.slot = `hotspot-${hotspotCounter++}`;
    hotspot.classList.add('hotspot');
    hotspot.dataset.position = position.toString();
    if (normal != null) {
        hotspot.dataset.normal = normal.toString();
    }
    viewer.appendChild(hotspot);
    select(hotspot);
    hotspot.addEventListener('click', () => { select(hotspot); });
    const label = document.createElement('div');
    label.classList.add('annotation');
    label.textContent =
        'data-position:\r\n' + position + '\r\ndata-normal:\r\n' + normal;
    hotspot.appendChild(label);
    viewer.removeEventListener('click', onClick);
}
self.createPoster = createPoster;
self.reloadScene = reloadScene;
self.downloadPoster = downloadPoster;
self.addHotspot = addHotspot;
self.removeHotspot = removeHotspot;
function load(fileMap) {
    let rootPath;
    Array.from(fileMap).forEach(([path, file]) => {
        const filename = file.name.toLowerCase();
        if (filename.match(/\.(gltf|glb)$/)) {
            const blobURLs = [];
            rootPath = path.replace(file.name, '');
            ModelViewerElement.mapURLs((url) => {
                const index = url.lastIndexOf('/');
                const normalizedURL = rootPath + url.substr(index + 1).replace(/^(\.?\/)/, '');
                if (fileMap.has(normalizedURL)) {
                    const blob = fileMap.get(normalizedURL);
                    const blobURL = URL.createObjectURL(blob);
                    blobURLs.push(blobURL);
                    return blobURL;
                }
                return url;
            });
            viewer.addEventListener('load', () => {
                blobURLs.forEach(URL.revokeObjectURL);
            });
            const fileURL = typeof file === 'string' ? file : URL.createObjectURL(file);
            viewer.src = fileURL;
            resetModel();
        }
    });
    if (fileMap.size === 1) {
        const file = fileMap.values().next().value;
        const filename = file.name.toLowerCase();
        if (filename.match(/\.(hdr)$/)) {
            viewer.environmentImage = URL.createObjectURL(file) + '#.hdr';
        }
        else if (filename.match(/\.(png|jpg)$/)) {
            viewer.environmentImage = URL.createObjectURL(file);
        }
        if (useSkybox.checked) {
            viewer.skyboxImage = viewer.environmentImage;
        }
    }
}
//# sourceMappingURL=tester.js.map