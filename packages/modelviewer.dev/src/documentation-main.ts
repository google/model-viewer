
/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {convertJSONToHTML} from './create-html';
import {getSidebarIds, sidebarObserver} from './sidebar';

export function doClick(newType: string) {
  let allIds = getSidebarIds('', false, true);
  let newSidebarCategory = allIds[2];
  let example = document.getElementById(
      newSidebarCategory.split('-')[0].concat('-examples'));
  let doc =
      document.getElementById(newSidebarCategory.split('-')[0].concat('-docs'));
  if (newType === 'docs') {
    doc!.classList.remove('inactive-doc-example');
    example!.classList.add('inactive-doc-example');
  } else {
    doc!.classList.add('inactive-doc-example');
    example!.classList.remove('inactive-doc-example');
  }
}

window.onscroll = function() {
  stickyHeader()
};

function stickyHeader() {
  let headers = document.getElementsByClassName('header');
  for (let i = 0; i < headers.length; i++) {
    let header = headers[i] as HTMLElement;
    let sticky = header.offsetTop;
    if (window.pageYOffset > sticky) {
      header.classList.add('sticky');
    } else {
      header.classList.remove('sticky');
    }
  }
}

async function fetchHtmlAsText(url: string) {
  const response = await fetch(url);
  return await response.text();
}

async function loadExamples() {
  const loadingExample = document.getElementById('loading-examples');
  loadingExample!.innerHTML = await fetchHtmlAsText('lazy-loading.html');
}

interface JSONCallback {
  (response: string): void
}

function loadJSON(filePath: string, callback: JSONCallback) {
  let xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', filePath, true);
  xobj.onreadystatechange = function() {
    console.log(xobj.status);
    console.log(typeof (xobj.status));
    if (xobj.readyState === 4 && xobj.status === 200) {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

/* Load the JSON asynchronously, then generate the sidebarObserver after all the
 * documentation in the window.
 */
function init() {
  loadJSON('./data/loading.json', function(response: string) {
    let actualJSON = JSON.parse(response);
    convertJSONToHTML(actualJSON);
    sidebarObserver();
  });
}

loadExamples();
init();

(self as any).doClick = doClick;
