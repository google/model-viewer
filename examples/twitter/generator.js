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

const playerLocation = 'player.html';
const player = document.querySelector('#player');
const url = document.querySelector('#url');
const glb = document.querySelector('#glb');
const description = document.querySelector('#description');
const prop = document.querySelector('#property');
const val = document.querySelector('#value');
const addExtra = document.querySelector('#add');
const downloader = document.querySelector('#download');
const display = document.querySelector('#display');
const copy = document.querySelector('#copy');

const extrasList = [{p: prop, v: val}];

// 900x900 is the maximum PNG size Twitter will allow (no WebP support)
const height = 900 / window.devicePixelRatio;
player.style.width = `${height}px`;
player.style.height = `${height}px`;

const getPosterUrl = () => {
  return glb.value.replace(/\.[^/.]+$/, '') + 'Poster.webp';
};

const getImageUrl = () => {
  return glb.value.replace(/\.[^/.]+$/, '') + '.png';
};

const update = () => {
  let extraParams = '';
  for (const e of extrasList) {
    if (!!e.p.value && !!e.v.value) {
      extraParams += `&${e.p.value}=${encodeURIComponent(e.v.value)}`;
    }
  }

  const playerUrl =
      `${playerLocation}?src=${glb.value}&poster=${getPosterUrl()}&alt=${
          encodeURIComponent(description.value)}${extraParams}`;

  player.src = playerUrl;
  display.textContent = `
<meta name="twitter:card" content="player"/>
<meta name="twitter:site" content="modelviewer"/>
<meta name="twitter:player:width" content="480"/>
<meta name="twitter:player:height" content="480"/>
<meta name="twitter:player" content="${player.src}"/>
<meta property="og:title" content="3D model-viewer embed"/>
<meta property="og:description" content="${description.value}"/>
<meta property="og:image" content="${getImageUrl()}"/>

<meta http-equiv="refresh" content="0; url='${url.value}'"/>
    `;
};

const newExtra = () => {
  const p = document.createElement('input');
  const v = document.createElement('input');
  p.addEventListener('change', update);
  v.addEventListener('change', update);

  extrasList.push({p, v});
  addExtra.before(p);
  addExtra.before(document.createTextNode(' = '));
  addExtra.before(v);
  addExtra.before(document.createElement('br'));
};

url.addEventListener('change', update);
glb.addEventListener('change', update);
description.addEventListener('change', update);
prop.addEventListener('change', update);
val.addEventListener('change', update);
addExtra.addEventListener('click', newExtra);
copy.addEventListener(
    'click', () => navigator.clipboard.writeText(display.textContent));

let download = null;

player.addEventListener('load', () => {
  downloader.removeEventListener('click', download);

  download = async () => {
    const modelViewer = player.contentWindow.document.querySelector('#mv');

    // Ensure full-res capture
    const ModelViewerElement =
        player.contentWindow.customElements.get('model-viewer');
    const oldMinScale = ModelViewerElement.minimumRenderScale;
    ModelViewerElement.minimumRenderScale = 1;

    // Set to beginning of animation
    modelViewer.pause();
    modelViewer.currentTime = 0;

    // Set to initial camera orbit
    const cameraOrbit = modelViewer.cameraOrbit;
    modelViewer.cameraOrbit = null;
    modelViewer.cameraOrbit = cameraOrbit;
    modelViewer.autoRotate = false;
    modelViewer.interactionPrompt = 'none';
    modelViewer.resetTurntableRotation();
    modelViewer.jumpCameraToGoal();

    // Wait for model-viewer to resize and render.
    await new Promise(
        resolve => requestAnimationFrame(
            () => {requestAnimationFrame(() => resolve())}));

    // Take screenshots
    const thumbnailBlob = await modelViewer.toBlob({mimeType: 'image/png'});
    const posterBlob = await modelViewer.toBlob(
        {idealAspect: true, mimeType: 'image/webp', qualityArgument: 0.85});

    // Reset to original state
    modelViewer.play();
    modelViewer.autoRotate = true;
    modelViewer.interactionPrompt = 'auto';
    ModelViewerElement.minimumRenderScale = oldMinScale;

    const downloadImage = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 250);
    };

    // Download the poster and thumbnail
    downloadImage(posterBlob, getPosterUrl().replace(/^.*?([^\\\/]*)$/, '$1'));
    downloadImage(
        thumbnailBlob, getImageUrl().replace(/^.*?([^\\\/]*)$/, '$1'));
  };

  downloader.addEventListener('click', download);
});

update();