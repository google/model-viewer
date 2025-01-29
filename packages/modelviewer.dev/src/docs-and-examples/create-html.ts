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

interface Defaults {
  type: string, default: string, options: string,
}

interface Entry {
  name: string, htmlName: string, description: string, default: Defaults,
      links: string[],
}

interface Category {
  Title: string, htmlName: string, Mixin: [], Attributes: Entry[], CSS: Entry[],
      Parts: Entry[], Properties: Entry[], 'Static Properties': Entry[],
      Methods: Entry[], 'Static Methods': Entry[], Events: Entry[],
      Slots: Entry[],
}

const CategoryConstant: Category = {
  Title: '',
  htmlName: '',
  Mixin: [],
  Attributes: [],
  CSS: [],
  Parts: [],
  Properties: [],
  'Static Properties': [],
  Methods: [],
  'Static Methods': [],
  Events: [],
  Slots: [],
};

function getCurrentDocs() {
  const click = `onclick="switchPages('docs', 'examples')"`;
  return `
<div class="inner-flipper" id="documentation-flipper">
  <div class="bolden">DOCUMENTATION</div>
</div>
<div class="inner-flipper">|</div>
<div class="inner-flipper" id="examples-flipper" ${click}>
  <a class="darken">EXAMPLES</a>
</div>
  `;
}

function getCurrentExample(category: string) {
  let target: string;
  if (category === 'postprocessing') {
    target = '../../docs/mve';
  } else {
    target = `../../docs/#${category}`;
  }
  const click = `onclick="switchPages('examples', '${target}')"`;
  return `
<div class="inner-flipper" id="documentation-flipper" ${click}>
  <a class="darken">DOCUMENTATION</a>
</div>
<div class="inner-flipper">|</div>
<div class="inner-flipper" id="examples-flipper">
  <div class="bolden">EXAMPLES</div>
</div>`;
}

/*
 * docsOrExample: 'docs' or 'examples-${category}'
 */
export function starterSidebar(docsOrExample: string) {
  const nav = document.getElementById('sidenav')!;
  const inputList = docsOrExample.split('-');
  const category = inputList[inputList.length - 1];
  const isExample = inputList[0] === 'examples';
  const docsExamples =
      isExample ? getCurrentExample(category) : getCurrentDocs();
  const isPostprocesssing = docsOrExample === 'mve' || category === 'postprocessing';
  const href = isExample ? '../../' : '../';
  nav.innerHTML = `
<div class="home lockup">
  <a href=${href} class="sidebar-mv inner-home">
    <div class="icon-button icon-modelviewer-black inner-home"></div>
    <div class="inner-home darken ${isPostprocesssing && 'inner-home-mve'}"><span class="attribute">&lt;${isPostprocesssing ? 'model-viewer-effects' : 'model-viewer'}&gt;</span></div>
  </a>
</div>
<hr class="sidebar-hr">
${docsOrExample === 'faq' ? '' : `
<div class="flipper">
  ${docsExamples}
</div>
`}
<div class="categories" id="sidebar-category-container"></div>`;
}

function getExamples(category: any): string {
  const examples = category['examples'];
  let examplesString = '';
  for (const example of examples) {
    examplesString += `
<h4 class="subcategory-header" id="container-${example.htmlId}-sidebar">
  <a class="darken" href="#${example.htmlId}" onclick="sidebarClick()">${
        example.name}</a>
</h4>`;
  }
  return examplesString;
}

function createExampleSidebarCategory(category: any) {
  const htmlName = category['htmlName'];
  const windowHref = window.location.href;
  const isActive = windowHref.indexOf(htmlName) >= 0 ? true : false;
  const id =
      isActive ? 'active-container-sidebar' : htmlName.concat('-sidebar');

  const container = document.getElementById('sidebar-category-container');
  container!.innerHTML += `
<div class="category">
  <h3 id=${id}>
    <a class="darken" href="../${htmlName}" onclick="sidebarClick()">${
      category['name']}</a>
  </h3>
  <div class="subCategory">
    ${isActive ? getExamples(category) : ''}
  </div>
</div>`;
}

export function createExamplesSidebar(json: any[]) {
  for (const category of json) {
    createExampleSidebarCategory(category);
  }
}

function createSubcategorySidebar(
    subcategory: string, lowerCaseTitle: string): string {
  const lowerCaseKey = getLowerCaseKey(subcategory);
  const headerId = lowerCaseTitle.concat('-', lowerCaseKey, '-sidebar');
  const aHref = lowerCaseTitle.concat('-', lowerCaseKey);
  return `
<div class="subCategory" id=${'subCategory'.concat(subcategory)}>
  <h4 class="subcategory-header" id=${headerId}>
    <a class="darken" href="#${aHref}" onclick="sidebarClick()">
      ${subcategory}
    </a>
  </h4>
</div>`;
}

function createSidebarName(name: string): string {
  // strip out contents within parenthesis
  return name.replace(/ *\([^)]*\) */g, '');
}

function createSidebar(category: Category) {
  const container = document.getElementById('sidebar-category-container');
  const lowerCaseTitle = category.htmlName;
  let subcategories = Object.keys(category);
  subcategories = subcategories.filter(k => k !== 'Title' && k !== 'htmlName' && k !== 'Description');

  // Link category href (Loading) to first subcategory (Loading, Attributes)
  let lowerKey = '';
  for (const subcategory of subcategories) {
    lowerKey = getLowerCaseKey(subcategory);
    break;
  }
  const href = lowerCaseTitle.concat('-', lowerKey);

  const categoryContainer = `
<div class="category" id=${lowerCaseTitle.concat('aboveHeader')}>
  <h3 id=${lowerCaseTitle.concat('-sidebar')}>
    <a class="darken" href="#${href}" onclick="sidebarClick()">
        ${category.Title}
    </a>
  </h3>
</div>`;

  container!.innerHTML += categoryContainer;

  const innerCategory =
      document.getElementById(lowerCaseTitle.concat('aboveHeader'));
  for (const subcategory of subcategories) {
    if (subcategory !== 'Questions') {
      innerCategory!.innerHTML +=
          createSubcategorySidebar(subcategory, lowerCaseTitle);
    }

    const lowerCaseKey = getLowerCaseKey(subcategory);
    const entries =
        (<Entry[]>category[subcategory as keyof typeof CategoryConstant]);
    for (const entry of entries) {
      const divId =
          lowerCaseTitle.concat('-', lowerCaseKey, '-', entry.htmlName);
      const aId = '#entrydocs-'.concat(divId);
      const sidebarName = createSidebarName(entry.name);
      innerCategory!.innerHTML += `
<div class="element de-active" id=${divId}>
  <a class="darken" href=${aId} onclick="sidebarClick()">${sidebarName}</a>
</div>`;
    }
  }
}

function createTitle(title: string, htmlName: string, description: string) {
  const titleContainer = document.getElementById(htmlName.concat('-docs'));
  titleContainer!.innerHTML += `
<div class="header">
  <h1 id=${htmlName}>${title}</h1>
  ${description ? `<h4>${description}</h4>` : ''}
</div>`;
}

export function getLowerCaseKey(key: string): string {
  return key.split(' ').map((value) => value.toLowerCase()).join('');
}

function createDefaultTable(entry: Entry): string {
  return `
<table class="value-table">
  <tr>
    <th>Default Value</th>
    <th>Options</th>
  </tr>
  <tr>
    <td>${entry.default.default}</td>
    <td>${entry.default.options}</td>
  </tr>
</table>`;
}

function createLinks(
    entry: Entry,
    pluralLowerCaseSubcategory: string,
    lowerCaseCategory: string): string {
  const id = 'links'.concat(
      entry.htmlName, pluralLowerCaseSubcategory, lowerCaseCategory);

  let linksEntry = `<div class="links" id=${id}>`;
  for (const link of entry.links) {
    linksEntry += `<div>${link}</div>`;
  }
  linksEntry += `</div>`;
  return linksEntry;
}

function createEntry(
    entry: Entry,
    lowerCaseCategory: string,
    pluralLowerCaseSubcategory: string): string {
  const lowerCaseSubcategory = pluralLowerCaseSubcategory.slice(0, -1);
  const subcategoryNameId = [
    'entrydocs',
    lowerCaseCategory,
    pluralLowerCaseSubcategory,
    entry.htmlName
  ].join('-');

  const links = 'links' in entry ?
      createLinks(entry, pluralLowerCaseSubcategory, lowerCaseCategory) :
      '';

  const entryContainer = `
<div class=${lowerCaseSubcategory.concat('-container')}>
  <div class=${lowerCaseSubcategory.concat('-name')} id=${subcategoryNameId}>
    <h4>${entry.name}</h4>
  </div>
  <div class=${lowerCaseSubcategory.concat('-definition')}>
    <p>${entry.description}</p>
  </div>
  ${'default' in entry ? createDefaultTable(entry) : ''}
  ${links}
</div>`;
  return entryContainer;
}

function createSubcategory(
    subcategoryArray: Entry[], category: string, subcategory: string) {
  const pluralLowerCaseSubcategory = getLowerCaseKey(subcategory);
  const element = document.getElementById(category.concat('-docs'));
  const subcategoryContainerId =
      'docs-'.concat(category, '-', pluralLowerCaseSubcategory);

  const subcategoryContainer = `
<div class=${pluralLowerCaseSubcategory.concat('-container')}>
  <div class='inner-content'>
    <div id=${subcategoryContainerId}>
      <h3 id=${category.concat('-', pluralLowerCaseSubcategory)}>
        ${subcategory === 'Questions' || subcategory === 'Mixin' ? '' : subcategory}
      </h3>
    </div>
  </div>
</div>`;
  element!.innerHTML += subcategoryContainer;

  const innerSubcategoryContainer =
      document.getElementById(subcategoryContainerId);
  for (const entry of subcategoryArray) {
    innerSubcategoryContainer!.innerHTML +=
        createEntry(entry, category, pluralLowerCaseSubcategory);
  }
}

export function createExamplesHeader() {
  const outer = document.getElementById('toggle');
  outer!.innerHTML += `
<label class="tab">
    <input class="hamburgerInput" type="checkbox">
    <svg viewBox="0 0 32 32">
      <path class="line line-top-bottom"
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22">
      </path>
      <path class="line" d="M7 16 27 16"></path>
    </svg>
  </label>
`;
}

function createToggle() {
  const outer = document.getElementById('toggle');
  outer!.innerHTML += `
  <label class="tab">
    <input class="hamburgerInput" type="checkbox">
    <svg viewBox="0 0 32 32">
      <path class="line line-top-bottom"
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22">
      </path>
      <path class="line" d="M7 16 27 16"></path>
    </svg>
  </label>`;
}

export function convertJSONToHTML(json: any[]) {
  createToggle();
  for (const category of json) {
    const {Title, htmlName, Description} = category;
    createTitle(Title, htmlName, Description);
    for (const key in category) {
      if (key !== 'Title' && key !== 'htmlName' && key !== 'Description') {
        createSubcategory(category[key], htmlName, key);
      }
    }
    createSidebar(category);
  }
}