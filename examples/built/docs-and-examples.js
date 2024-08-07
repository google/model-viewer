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
    let target;
    if (category === 'postprocessing') {
        target = '../../docs/mve';
    }
    else {
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
function starterSidebar(docsOrExample) {
    const nav = document.getElementById('sidenav');
    const inputList = docsOrExample.split('-');
    const category = inputList[inputList.length - 1];
    const isExample = inputList[0] === 'examples';
    const docsExamples = isExample ? getCurrentExample(category) : getCurrentDocs();
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
function createExamplesSidebar(json) {
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
    container.innerHTML += categoryContainer;
    const innerCategory = document.getElementById(lowerCaseTitle.concat('aboveHeader'));
    for (const subcategory of subcategories) {
        if (subcategory !== 'Questions') {
            innerCategory.innerHTML +=
                createSubcategorySidebar(subcategory, lowerCaseTitle);
        }
        const lowerCaseKey = getLowerCaseKey(subcategory);
        const entries = category[subcategory];
        for (const entry of entries) {
            const divId = lowerCaseTitle.concat('-', lowerCaseKey, '-', entry.htmlName);
            const aId = '#entrydocs-'.concat(divId);
            const sidebarName = createSidebarName(entry.name);
            innerCategory.innerHTML += `
<div class="element de-active" id=${divId}>
  <a class="darken" href=${aId} onclick="sidebarClick()">${sidebarName}</a>
</div>`;
        }
    }
}
function createTitle(title, htmlName, description) {
    const titleContainer = document.getElementById(htmlName.concat('-docs'));
    titleContainer.innerHTML += `
<div class="header">
  <h1 id=${htmlName}>${title}</h1>
  ${description ? `<h4>${description}</h4>` : ''}
</div>`;
}
function getLowerCaseKey(key) {
    return key.split(' ').map((value) => value.toLowerCase()).join('');
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
    let linksEntry = `<div class="links" id=${id}>`;
    for (const link of entry.links) {
        linksEntry += `<div>${link}</div>`;
    }
    linksEntry += `</div>`;
    return linksEntry;
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
function createSubcategory(subcategoryArray, category, subcategory) {
    const pluralLowerCaseSubcategory = getLowerCaseKey(subcategory);
    const element = document.getElementById(category.concat('-docs'));
    const subcategoryContainerId = 'docs-'.concat(category, '-', pluralLowerCaseSubcategory);
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
    element.innerHTML += subcategoryContainer;
    const innerSubcategoryContainer = document.getElementById(subcategoryContainerId);
    for (const entry of subcategoryArray) {
        innerSubcategoryContainer.innerHTML +=
            createEntry(entry, category, pluralLowerCaseSubcategory);
    }
}
function createExamplesHeader() {
    const outer = document.getElementById('toggle');
    outer.innerHTML += `
<h1 class="tab" onclick="toggleSidebar()">&#9776</h1>
`;
}
function createToggle() {
    const outer = document.getElementById('toggle');
    outer.innerHTML += `
<h1 class="tab" onclick="toggleSidebar()">&#9776</h1>
`;
}
function convertJSONToHTML(json) {
    createToggle();
    for (const category of json) {
        const { Title, htmlName, Description } = category;
        createTitle(Title, htmlName, Description);
        for (const key in category) {
            if (key !== 'Title' && key !== 'htmlName' && key !== 'Description') {
                createSubcategory(category[key], htmlName, key);
            }
        }
        createSidebar(category);
    }
}

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
let globalCurrentView = [];
let previouslyActive = '';
let toRemove = '';
let order = new Map();
let isSideBarClick = false;
let isFirstOpen = true; // is true on the first observation of all entries
let everyEntry = []; // a list of all attributes/properties etc.
function activateSidebar(sidebarIds) {
    var _a;
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.add('active');
    (_a = document.querySelector(`h4[id=${sidebarIds.subcategory}]`)) === null || _a === void 0 ? void 0 : _a.classList.add('active');
    document.querySelector(`h3[id=${sidebarIds.category}]`).classList.add('active');
}
function deactivateSidebar(sidebarIds) {
    var _a;
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.remove('active');
    (_a = document.querySelector(`h4[id=${sidebarIds.subcategory}]`)) === null || _a === void 0 ? void 0 : _a.classList.remove('active');
    document.querySelector(`h3[id=${sidebarIds.category}]`).classList.remove('active');
}
function addDeactive(sidebarIds) {
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.add('de-active');
}
function addDeactiveCategory(sidebarIds) {
    var _a;
    (_a = document.querySelector(`h4[id=${sidebarIds.subcategory}]`)) === null || _a === void 0 ? void 0 : _a.classList.add('de-active');
}
function removeDeactive(sidebarIds) {
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.remove('de-active');
}
function removeDeactiveCategory(sidebarIds) {
    var _a;
    (_a = document.querySelector(`h4[id=${sidebarIds.subcategory}]`)) === null || _a === void 0 ? void 0 : _a.classList.remove('de-active');
}
const identicalCategories = ['loading', 'augmentedreality', 'stagingandcameras', 'annotations', 'lightingandenv', 'animation', 'scenegraph'];
function getSidebarCategoryForNewPage() {
    const category = previouslyActive.split('-')[0];
    if (identicalCategories.includes(category)) {
        return category;
    }
    else {
        return 'postprocessing';
    }
}
function getSidebarIdsFromSidebarName(name) {
    const sb = 'sidebar';
    const sidebarName = name;
    let sidebarSub = sidebarName.split('-').slice(0, 2);
    let sidebarCat = sidebarName.split('-').slice(0, 1);
    sidebarSub.push(sb);
    const sidebarSubcategory = sidebarSub.join('-');
    sidebarCat.push(sb);
    const sidebarCategory = sidebarCat.join('-');
    return {
        name: sidebarName,
        subcategory: sidebarSubcategory,
        category: sidebarCategory
    };
}
function getSidebarIdsFromId(id) {
    const sb = 'sidebar';
    const sidebarName = id.split('-').slice(1, 10).join('-');
    let sidebarSub = id.split('-').slice(1, 3);
    let sidebarCat = id.split('-').slice(1, 2);
    sidebarSub.push(sb);
    const sidebarSubcategory = sidebarSub.join('-');
    sidebarCat.push(sb);
    const sidebarCategory = sidebarCat.join('-');
    return {
        name: sidebarName,
        subcategory: sidebarSubcategory,
        category: sidebarCategory
    };
}
/*
 * sidebarSubcategory: string of the old subcategory being replaced
 * newSidebarSubcategory: string of the new subcategory
 * example:
 *  sidebarSubcategory = loading-attributes-sidebar
 *  newSidebarSubcategory = loading-cssProperties-sidebar
 */
function updateSidebarView(sidebarSubcategory, newSidebarSubcategory) {
    const newCategoryList = newSidebarSubcategory.split('-');
    const newSidebarCategory = newCategoryList[0].concat('-sidebar');
    if (sidebarSubcategory !== newSidebarSubcategory) {
        for (const entry of everyEntry) {
            const id = entry.target.getAttribute('id');
            const sidebarIds = getSidebarIdsFromId(id);
            if (sidebarIds.subcategory !== newSidebarSubcategory) {
                addDeactive(sidebarIds);
            }
            else {
                removeDeactive(sidebarIds);
            }
            if (sidebarIds.category !== newSidebarCategory) {
                addDeactiveCategory(sidebarIds);
            }
            else {
                removeDeactiveCategory(sidebarIds);
            }
        }
    }
}
/*
 * Hide all of the entries not within the current subcategory
 * entries should be every entry on the page when this is called
 */
function updateSidebarViewFirstTime(entries) {
    isFirstOpen = false; // global
    everyEntry = entries; // Sets global variable for use in updateSidebarView
    const sidebarIds = getSidebarIdsFromSidebarName(previouslyActive);
    updateSidebarView('', sidebarIds.subcategory);
}
function updateFromOldToNew(prev, sidebarIds) {
    const prevSidebarIds = getSidebarIdsFromSidebarName(prev);
    deactivateSidebar(prevSidebarIds);
    activateSidebar(sidebarIds);
    updateSidebarView(prevSidebarIds.subcategory, sidebarIds.subcategory);
}
function removeActiveEntry(sidebarIds) {
    deactivateSidebar(sidebarIds);
    if (globalCurrentView.length >= 2) {
        const newSidebarIds = getSidebarIdsFromSidebarName(globalCurrentView[1]);
        activateSidebar(newSidebarIds);
        updateSidebarView(sidebarIds.subcategory, newSidebarIds.subcategory);
        previouslyActive = newSidebarIds.name;
    }
}
function updateHeader() {
    var _a;
    const sidebarIds = getSidebarIdsFromSidebarName(previouslyActive);
    const subCat = (_a = document.querySelector(`h4[id=${sidebarIds.subcategory}]`)) === null || _a === void 0 ? void 0 : _a.firstElementChild.innerHTML;
    const cat = document.querySelector(`h3[id=${sidebarIds.category}]`).firstElementChild.innerHTML;
    const outerHeaderId = sidebarIds.category.split('-')[0];
    const outerHeader = document.querySelector(`h1[id=${outerHeaderId}]`);
    if (subCat) {
        outerHeader.innerHTML = cat.concat(': ', subCat);
    }
}
function handleHTMLEntry(htmlEntry) {
    const id = htmlEntry.target.getAttribute('id');
    const sidebarIds = getSidebarIdsFromId(id);
    // entry inside viewing window
    if (htmlEntry.intersectionRatio > 0) {
        if (toRemove.length > 0) {
            // inside a large div
            updateFromOldToNew(toRemove, sidebarIds);
            toRemove = '';
        }
        else if (globalCurrentView.length === 0) {
            // empty globalCurrentView, add to view
            activateSidebar(sidebarIds);
            previouslyActive = sidebarIds.name;
            globalCurrentView.push(sidebarIds.name);
        }
        else if (order.get(previouslyActive) > order.get(sidebarIds.name)) {
            // scrolling up
            updateFromOldToNew(globalCurrentView[0], sidebarIds);
            globalCurrentView.unshift(sidebarIds.name);
            previouslyActive = sidebarIds.name;
        }
        else {
            // an entry is in view under the current active entry
            globalCurrentView.push(sidebarIds.name);
        }
    }
    else if (globalCurrentView.length === 1) {
        // entry outside viewing window, but entry is the only element
        toRemove = previouslyActive;
    }
    else {
        // entry outside viewing window, active entry now out of view
        if (previouslyActive === sidebarIds.name) {
            // entry being removed from view is currently active
            removeActiveEntry(sidebarIds);
        }
        // always remove entry when out of view
        globalCurrentView = globalCurrentView.filter(e => e !== sidebarIds.name);
    }
}
/*
 * for page jump its just easier to restart, so deactivate everything, clear
 * the global view, then only update with whats in view
 */
function handlePageJump(entries) {
    isSideBarClick = false;
    toRemove = '';
    updateSidebarView('', 'null');
    // deactivate all of the entries
    for (const entry of everyEntry) {
        const id = entry.target.getAttribute('id');
        const sidebarIds = getSidebarIdsFromId(id);
        deactivateSidebar(sidebarIds);
    }
    // remove entries not in view, add entries that are in view
    for (const entry of entries) {
        const id = entry.target.getAttribute('id');
        const sidebarIds = getSidebarIdsFromId(id);
        if (!entry.isIntersecting) {
            globalCurrentView = globalCurrentView.filter(e => e !== sidebarIds.name);
        }
        else {
            globalCurrentView.push(sidebarIds.name);
        }
    }
    // sort current view
    globalCurrentView.sort(function (nameA, nameB) {
        if (order.get(nameA) < order.get(nameB)) {
            return -1;
        }
        else if (order.get(nameA) > order.get(nameB)) {
            return 1;
        }
        else {
            return 0;
        }
    });
    // update current view based on the current highest view
    const sidebarIds = getSidebarIdsFromSidebarName(globalCurrentView[0]);
    const prevSidebarIds = getSidebarIdsFromSidebarName(previouslyActive);
    deactivateSidebar(prevSidebarIds);
    activateSidebar(sidebarIds);
    updateSidebarView('', sidebarIds.subcategory);
    previouslyActive = sidebarIds.name;
}
let intersectionRatios = new Map();
function handleExamples(entries, _observer) {
    if (isFirstOpen) {
        everyEntry = entries;
        isFirstOpen = false;
        document.querySelector(`h3[id="active-container-sidebar"`).classList.add('active');
    }
    for (const entry of entries) {
        const id = entry.target.getAttribute('id');
        intersectionRatios.set(id, entry.intersectionRatio);
    }
    let maxRatio = 0;
    let maxName = '';
    for (const name of intersectionRatios.keys()) {
        const ratio = intersectionRatios.get(name);
        if (ratio > maxRatio) {
            maxRatio = ratio;
            maxName = name;
        }
    }
    for (const entry of everyEntry) {
        const id = entry.target.getAttribute('id');
        const sidebarName = `container-${id}-sidebar`;
        const sidebarElement = document.querySelector(`h4[id=${sidebarName}`);
        if (sidebarElement == null) {
            return;
        }
        if (id === maxName) {
            sidebarElement.classList.add('active');
        }
        else {
            sidebarElement.classList.remove('active');
        }
    }
}
/*
 * Update the table of contents based on how the page is viewed.
 */
function sidebarDocsObserver() {
    const observer = new IntersectionObserver(entries => {
        if (isSideBarClick) { // sidebar click
            handlePageJump(entries);
        }
        else { // scroll
            for (const htmlEntry of entries) {
                handleHTMLEntry(htmlEntry);
            }
        }
        if (isFirstOpen) { // page load
            updateSidebarViewFirstTime(entries);
        }
        updateHeader();
    });
    // i.e. attributes, properties, events, methods, slots, custom css.
    let orderIndex = 0;
    document.querySelectorAll('div[id*="entrydocs"]').forEach((section) => {
        const idSplitList = section.getAttribute('id').split('-');
        const id = idSplitList.slice(1, 10).join('-');
        order.set(id, orderIndex);
        orderIndex += 1;
        observer.observe(section);
    });
}
function sidebarExamplesObserver() {
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
    };
    const observer = new IntersectionObserver(handleExamples, options);
    document.querySelectorAll('div[class="demo"]').forEach((section) => {
        observer.observe(section);
    });
}
function sidebarClick() {
    isSideBarClick = true;
    // close sidebar if click in sidebar on mobile
    if (window.innerWidth <= 800) {
        const root = document.documentElement;
        root.style.setProperty('--sidebar-width', '0px');
    }
}
self.sidebarClick = sidebarClick;

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
// TODO: Handle going from examples back to docs (old state), possibly
// include a previous state to revert to in URI
function switchPages(oldLocation, newLocation) {
    if (oldLocation !== newLocation) {
        let URI = '';
        if (oldLocation === 'docs') {
            const category = getSidebarCategoryForNewPage();
            URI = '../examples/'.concat(category);
        }
        else {
            URI = newLocation;
        }
        const d = document.createElement('a');
        d.setAttribute('href', URI);
        window.location.href = d.href;
    }
}
window.onscroll = function () {
    stickyHeader();
};
function stickyHeader() {
    const headers = document.getElementsByClassName('header');
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const sticky = header.offsetTop;
        if (window.pageYOffset > sticky) {
            header.classList.add('sticky');
        }
        else {
            header.classList.remove('sticky');
        }
    }
}
function loadJSON(filePath, callback) {
    const xobj = new XMLHttpRequest();
    xobj.overrideMimeType('application/json');
    xobj.open('GET', filePath, true);
    xobj.onreadystatechange = function () {
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
function initFooterLinks() {
    const footerLinks = document.getElementById('footer-links');
    footerLinks.innerHTML = `
<div>
  <a href="https://github.com/google/model-viewer">Github</a> ∙ <a href="https://model-viewer.glitch.me/">Glitch</a> ∙ <a href="https://github.com/google/model-viewer/issues">Bug report</a> ∙ <a href="https://policies.google.com/privacy">Privacy</a>
</div>`;
}
/* Load the JSON asynchronously, then generate the sidebarObserver after all the
 * documentation in the window.
 * docsOrExample: 'docs' or 'examples-${category}'
 */
function init(docsOrExample) {
    const base = docsOrExample.split('-')[0];
    const filePath = (base === 'examples' ? '../' : '') + '../data/' + base + '.json';
    loadJSON(filePath, function (response) {
        const json = JSON.parse(response);
        starterSidebar(docsOrExample);
        if (base === 'examples') {
            createExamplesSidebar(json);
            createExamplesHeader();
            sidebarExamplesObserver();
        }
        else {
            convertJSONToHTML(json);
            sidebarDocsObserver();
        }
        jumpToSection();
    });
}
function toggleSidebar() {
    const root = document.documentElement;
    const nav = document.getElementById('sidenav');
    if (nav.offsetWidth > 150) {
        root.style.setProperty('--sidebar-width', '0px');
        root.style.setProperty('--neg-sidebar-width', '-300px');
    }
    else {
        root.style.setProperty('--sidebar-width', '300px');
        root.style.setProperty('--neg-sidebar-width', '0px');
    }
}
self.toggleSidebar = toggleSidebar;
self.switchPages = switchPages;
self.init = init;
self.initFooterLinks = initFooterLinks;
function handleSideBarClickToggle(event) {
    const nav = document.getElementById('sidenav');
    var mouseClickWidth = event.clientX;
    // toggle nav when clicking outside of nav on small device
    if (nav && mouseClickWidth > nav.offsetWidth && nav.offsetWidth > 150 &&
        window.innerWidth <= 800) {
        toggleSidebar();
    }
}
document.addEventListener('click', handleSideBarClickToggle);
//# sourceMappingURL=docs-and-examples.js.map
