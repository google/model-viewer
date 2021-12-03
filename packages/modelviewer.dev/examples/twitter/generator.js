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

const playerLocation =
    'player.html';  //'https://modelviewer.dev/examples/twitter/player.html';
const player = document.querySelector('#player');
const url = document.querySelector('#url');
const glb = document.querySelector('#glb');
const description = document.querySelector('#description');
const prop = document.querySelector('#property');
const val = document.querySelector('#value');
const addExtra = document.querySelector('#add');
const downloader = document.querySelector('#download');
const display = document.querySelector('#display');

const extrasList = [{p: prop, v: val}];

const getPosterUrl = () => {
  return glb.value.replace(/\.[^/.]+$/, '') + '.webp';
};

const update = () => {
  const posterUrl = getPosterUrl();
  let extraParams = '';
  for (const e of extrasList) {
    if (!!e.p.value) {
      extraParams += `&${e.p.value}=${e.v.value}`;
    }
  }
  const playerUrl = `${playerLocation}?src=${glb.value}&poster=${
      posterUrl}&alt=${description.value}${extraParams}`;
  player.src = playerUrl;
  display.textContent = `
<meta name="twitter:card" content="player"/>
<meta name="twitter:site" content="modelviewer"/>
<meta name="twitter:player:width" content="480"/>
<meta name="twitter:player:height" content="480"/>
<meta id="link" name="twitter:player" content="${playerUrl}"/>
<meta property="og:title" content="&lt;model-viewer&gt; embed"/>
<meta property="og:description" content="${description.value}"/>
<meta property="og:image" content="${posterUrl}"/>
<meta http-equiv="refresh" content="0; url='${url.value}'"/>
    `;
};

const newExtra = () => {
  const p = document.createElement('input');
  const v = document.createElement('input');
  extrasList.push({p, v});
  addExtra.before(p);
  addExtra.before(v);
  addExtra.before(document.createElement('br'));
  p.addEventListener('change', update);
  v.addEventListener('change', update);
};

const download = () => {
  const posterUrl = getPosterUrl().replace(/^.*?([^\\\/]*)$/, '$1');
  player.contentWindow.downloadPoster(posterUrl);
};

url.addEventListener('change', update);
glb.addEventListener('change', update);
description.addEventListener('change', update);
prop.addEventListener('change', update);
val.addEventListener('change', update);
addExtra.addEventListener('click', newExtra);
downloader.addEventListener('click', download);

update();