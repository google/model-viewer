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
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.add('active');
    document.querySelector(`h4[id=${sidebarIds.subcategory}]`).classList.add('active');
    document.querySelector(`h3[id=${sidebarIds.category}]`).classList.add('active');
}
function deactivateSidebar(sidebarIds) {
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.remove('active');
    document.querySelector(`h4[id=${sidebarIds.subcategory}]`).classList.remove('active');
    document.querySelector(`h3[id=${sidebarIds.category}]`).classList.remove('active');
}
function addDeactive(sidebarIds) {
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.add('de-active');
}
function addDeactiveCategory(sidebarIds) {
    document.querySelector(`h4[id=${sidebarIds.subcategory}]`).classList.add('de-active');
}
function removeDeactive(sidebarIds) {
    document.querySelector(`div[id=${sidebarIds.name}]`).classList.remove('de-active');
}
function removeDeactiveCategory(sidebarIds) {
    document.querySelector(`h4[id=${sidebarIds.subcategory}]`).classList.remove('de-active');
}
export function getSidebarCategoryForNewPage() {
    return previouslyActive.split('-')[0];
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
    const sidebarIds = getSidebarIdsFromSidebarName(previouslyActive);
    const subCat = document.querySelector(`h4[id=${sidebarIds.subcategory}]`).firstElementChild.innerHTML;
    const cat = document.querySelector(`h3[id=${sidebarIds.category}]`).firstElementChild.innerHTML;
    const outerHeaderId = sidebarIds.category.split('-')[0];
    const outerHeader = document.querySelector(`h1[id=${outerHeaderId}]`);
    outerHeader.innerHTML = cat.concat(': ', subCat);
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
        if (id === maxName) {
            document.querySelector(`h4[id=${sidebarName}`).classList.add('active');
        }
        else {
            document.querySelector(`h4[id=${sidebarName}`).classList.remove('active');
        }
    }
}
/*
 * Update the table of contents based on how the page is viewed.
 */
export function sidebarObserver(docsOrExample) {
    if (docsOrExample === 'docs') {
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
    else {
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
}
export function sidebarClick() {
    isSideBarClick = true;
    // close sidebar if click in sidebar on mobile
    if (window.innerWidth <= 800) {
        const root = document.documentElement;
        root.style.setProperty('--sidebar-width', '0px');
    }
}
self.sidebarClick = sidebarClick;
//# sourceMappingURL=sidebar.js.map