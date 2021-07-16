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
const CategoryConstant = {
    Title: '',
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
function getCurrentExample(category) {
    const click = `onclick="switchPages('examples', '../../docs/#${category}')"`;
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
export function starterSidebar(docsOrExample) {
    const nav = document.getElementById('sidenav');
    const inputList = docsOrExample.split('-');
    const category = inputList[inputList.length - 1];
    const isDocs = docsOrExample === 'docs';
    const docsExamples = isDocs ? getCurrentDocs() : getCurrentExample(category);
    const href = isDocs ? '../' : '../../';
    nav.innerHTML = `
<div class="home lockup">
  <a href=${href} class="sidebar-mv inner-home">
    <div class="icon-button icon-modelviewer-black inner-home"></div>
    <div class="inner-home darken"><span class="attribute">&lt;model-viewer&gt;</span></div>
  </a>
</div>
<hr class="sidebar-hr">
<div class="flipper">
  ${docsExamples}
</div>
<div class="categories" id="sidebar-category-container"></div>`;
}
function getExamples(category) {
    const examples = category['examples'];
    let examplesString = '';
    for (const example of examples) {
        examplesString += `
<h4 class="subcategory-header" id="container-${example.htmlId}-sidebar">
  <a class="darken" href="#${example.htmlId}" onclick="sidebarClick()">${example.name}</a>
</h4>`;
    }
    return examplesString;
}
function createExampleSidebarCategory(category) {
    const htmlName = category['htmlName'];
    const windowHref = window.location.href;
    const isActive = windowHref.indexOf(htmlName) >= 0 ? true : false;
    const id = isActive ? 'active-container-sidebar' : htmlName.concat('-sidebar');
    const container = document.getElementById('sidebar-category-container');
    container.innerHTML += `
<div class="category">
  <h3 id=${id}>
    <a class="darken" href="../${htmlName}" onclick="sidebarClick()">${category['name']}</a>
  </h3>
  <div class="subCategory">
    ${isActive ? getExamples(category) : ''}
  </div>
</div>`;
}
export function createExamplesSidebar(json) {
    for (const category of json) {
        createExampleSidebarCategory(category);
    }
}
function createSubcategorySidebar(subcategory, lowerCaseTitle) {
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
function createSidebarName(name) {
    // strip out contents within parenthesis
    return name.replace(/ *\([^)]*\) */g, '');
}
function createSidebar(category) {
    const container = document.getElementById('sidebar-category-container');
    const lowerCaseTitle = getLowerCaseTitle(category.Title);
    let subcategories = Object.keys(category);
    subcategories = subcategories.filter(k => k !== 'Title');
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
    container.innerHTML += categoryContainer;
    const innerCategory = document.getElementById(lowerCaseTitle.concat('aboveHeader'));
    for (const subcategory of subcategories) {
        innerCategory.innerHTML +=
            createSubcategorySidebar(subcategory, lowerCaseTitle);
        const innerSubcategory = document.getElementById(lowerCaseTitle.concat('aboveHeader'));
        const lowerCaseKey = getLowerCaseKey(subcategory);
        const entries = category[subcategory];
        for (const entry of entries) {
            const divId = lowerCaseTitle.concat('-', lowerCaseKey, '-', entry.htmlName);
            const aId = '#entrydocs-'.concat(divId);
            const sidebarName = createSidebarName(entry.name);
            innerSubcategory.innerHTML += `
<div class="element de-active" id=${divId}>
  <a class="darken" href=${aId} onclick="sidebarClick()">${sidebarName}</a>
</div>`;
        }
    }
}
function createTitle(title) {
    const lowerCaseTitle = getLowerCaseTitle(title);
    const titleContainer = document.getElementById(lowerCaseTitle.concat('-docs'));
    titleContainer.innerHTML += `
<div class="header">
  <h1 id=${lowerCaseTitle}>${title}</h1>
</div>`;
}
export function getLowerCaseKey(key) {
    switch (key) {
        case 'Static Methods':
            return 'staticMethods';
        case 'Static Properties':
            return 'staticProperties';
        default:
            return key.toLowerCase();
    }
}
function getLowerCaseTitle(title) {
    return title.replace('&', 'and').replace(/\s/g, '').toLowerCase();
}
function createDefaultTable(entry) {
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
function createLinks(entry, pluralLowerCaseSubcategory, lowerCaseCategory) {
    const id = 'links'.concat(entry.htmlName, pluralLowerCaseSubcategory, lowerCaseCategory);
    return `
<div class="links" id=${id}>
</div>`;
}
function createEntry(entry, lowerCaseCategory, pluralLowerCaseSubcategory) {
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
function createSubcategory(subcategoryArray, category, subcategory, pluralLowerCaseSubcategory) {
    const lowerCaseCategory = getLowerCaseTitle(category);
    const element = document.getElementById(lowerCaseCategory.concat('-docs'));
    const subcategoryContainerId = 'docs-'.concat(lowerCaseCategory, '-', pluralLowerCaseSubcategory);
    const subcategoryContainer = `
<div class=${pluralLowerCaseSubcategory.concat('-container')}>
  <div class='inner-content'>
    <div id=${subcategoryContainerId}>
      <h3 id=${lowerCaseCategory.concat('-', pluralLowerCaseSubcategory)}>
        ${subcategory}
      </h3>
    </div>
  </div>
</div>`;
    element.innerHTML += subcategoryContainer;
    const innerSubcategoryContainer = document.getElementById(subcategoryContainerId);
    for (const entry of subcategoryArray) {
        innerSubcategoryContainer.innerHTML +=
            createEntry(entry, lowerCaseCategory, pluralLowerCaseSubcategory);
        if ('links' in entry) {
            const linksId = 'links'.concat(entry.htmlName, pluralLowerCaseSubcategory, lowerCaseCategory);
            const linksDiv = document.getElementById(linksId);
            for (const link of entry.links) {
                linksDiv.innerHTML += `<div>${link}</div>`;
            }
        }
    }
}
export function createExamplesHeader() {
    const outer = document.getElementById('toggle');
    outer.innerHTML += `
<h1 class="tab" onclick="toggleSidebar()">&#9776</h1>
<div class="exampleHeader">
  <h1>Examples</h1>
</div>
`;
}
function createToggle() {
    const outer = document.getElementById('toggle');
    outer.innerHTML += `
<h1 class="tab" onclick="toggleSidebar()">&#9776</h1>
`;
}
export function convertJSONToHTML(json) {
    createToggle();
    let header = '';
    for (const category of json) {
        for (const key in category) {
            if (key === 'Title') {
                header = category[key];
                createTitle(category[key]);
            }
            else {
                const lowerCaseKey = getLowerCaseKey(key);
                createSubcategory(category[key], header, key, lowerCaseKey);
            }
        }
        createSidebar(category);
    }
}
//# sourceMappingURL=create-html.js.map