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

import {convertJSONToHTML, createExamplesHeader, createExamplesSidebar, starterSidebar} from './create-html';
import {getSidebarCategoryForNewPage, sidebarDocsObserver, sidebarExamplesObserver} from './sidebar';


// TODO: Handle going from examples back to docs (old state), possibly
// include a previous state to revert to in URI
export function switchPages(oldLocation: string, newLocation: string) {
  if (oldLocation !== newLocation) {
    let URI = '';
    if (oldLocation === 'docs') {
      const category = getSidebarCategoryForNewPage();
      URI = '../examples/'.concat(category);
    } else {
      URI = newLocation;
    }
    const d = document.createElement('a');
    d.setAttribute('href', URI);
    window.location.href = d.href;
  }
}

window.onscroll = function() {
  stickyHeader()
};

function stickyHeader() {
  const headers = document.getElementsByClassName('header');
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i] as HTMLElement;
    const sticky = header.offsetTop;
    if (window.pageYOffset > sticky) {
      header.classList.add('sticky');
    } else {
      header.classList.remove('sticky');
    }
  }
}

interface JSONCallback {
  (response: string): void
}

function loadJSON(filePath: string, callback: JSONCallback) {
  const xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', filePath, true);
  xobj.onreadystatechange = function() {
    if (xobj.readyState === 4 && xobj.status === 200) {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

/*
 * On a page load if # is given, jump to section
 */
function jumpToSection() {
  const windowHref = window.location.href;
  const hashtagIndex = windowHref.indexOf('#');
  if (hashtagIndex >= 0 && windowHref.length > hashtagIndex) {
    const jumpToId = windowHref.slice(hashtagIndex + 1);
    const element = document.getElementById(jumpToId);
    if (element) {
      const fakeA = document.createElement('a');
      fakeA.href = '#'.concat(jumpToId);
      fakeA.click();
    }
  }
}

export function initFooterLinks() {
  const footerLinks = document.getElementById('footer-links');
  footerLinks!.innerHTML = `
<div>
  <a href="https://github.com/google/model-viewer">Github</a> ∙ <a href="https://model-viewer.glitch.me/">Glitch</a> ∙ <a href="https://github.com/google/model-viewer/issues">Bug report</a> ∙ <a href="https://policies.google.com/privacy">Privacy</a>
</div>`;
}

/* Load the JSON asynchronously, then generate the sidebarObserver after all the
 * documentation in the window.
 * docsOrExample: 'docs' or 'examples-${category}'
 */
export function init(docsOrExample: string) {
  const base = docsOrExample.split('-')[0];
  const filePath =
      (base === 'examples' ? '../' : '') + '../data/' + base + '.json';
  loadJSON(filePath, function(response: string) {
    const json = JSON.parse(response);
    starterSidebar(docsOrExample);
    if (base === 'examples') {
      createExamplesSidebar(json);
      createExamplesHeader();
      sidebarExamplesObserver();
    } else {
      convertJSONToHTML(json);
      sidebarDocsObserver();
    }
    jumpToSection();
  });
}

// export function toggleSidebar() {
//   document.getElementById('sidenav')?.classList.toggle('active');
// }

// (self as any).toggleSidebar = toggleSidebar;
(self as any).switchPages = switchPages;
(self as any).init = init;
(self as any).initFooterLinks = initFooterLinks;

function handleSideBarClickToggle(event: any) {
  if (!(event.target.classList.contains('sidebar') || event.target.closest(".sidebar")) && !event.target.classList.contains("hamburgerInput")) {
    if (event.target.classList.contains('tab')) {
      document.getElementById('sidenav')?.classList.toggle('active');
    } else {
      if (document.getElementById('sidenav')?.classList.contains('active')) {
        document.getElementById('sidenav')?.classList.remove('active');
      }
    }
  }
}

document.addEventListener('click', handleSideBarClickToggle);