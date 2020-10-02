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

let globalCurrentView: string[] = [];
let previouslyActive: string = '';
let toRemove = '';
let order: any[] = [];  // TODO, switch to dictionary

let isFirstOpen = true;      // is true on the first observation of all entries
let everyEntry: any[] = [];  // a list of all attributes/properties etc.

interface SidebarIds {
  name: string, subcategory: string, category: string
}

function activateSidebar(sidebarIds: SidebarIds) {
  document.querySelector(`div[id=${sidebarIds.name}]`)!.classList.add('active');
  document.querySelector(`h4[id=${sidebarIds.subcategory}]`)!.classList.add(
      'active');
  document.querySelector(`h3[id=${sidebarIds.category}]`)!.classList.add(
      'active');
}

function deactivateSidebar(sidebarIds: SidebarIds) {
  document.querySelector(`div[id=${sidebarIds.name}]`)!.classList.remove(
      'active');
  document.querySelector(`h4[id=${sidebarIds.subcategory}]`)!.classList.remove(
      'active');
  document.querySelector(`h3[id=${sidebarIds.category}]`)!.classList.remove(
      'active');
}

function addDeactive(sidebarName: string) {
  document.querySelector(`div[id=${sidebarName}]`)!.classList.add('de-active');
}

function removeDeactive(sidebarName: string) {
  document.querySelector(`div[id=${sidebarName}]`)!.classList.remove(
      'de-active');
}

export function getSidebarCategoryForNewPage(): string {
  return previouslyActive.split('-')[0];
}

function getSidebarIdsFromSidebarName(name: string): SidebarIds {
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

function getSidebarIdsFromId(id: string): SidebarIds {
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
 *  sidebarSubcategory = loading-attributes
 *  newSidebarSubcategory = loading-cssProperties
 */
function updateSidebarView(
    sidebarSubcategory: string, newSidebarSubcategory: string) {
  if (sidebarSubcategory !== newSidebarSubcategory) {
    for (const entry of everyEntry) {
      const id = entry.target.getAttribute('id');
      const sidebarIds = getSidebarIdsFromId(id);
      const currentSidebarName = sidebarIds.name;
      if (sidebarIds.subcategory !== newSidebarSubcategory) {
        addDeactive(currentSidebarName);
      } else {
        removeDeactive(currentSidebarName);
      }
    }
  }
}

/*
 * Hide all of the entries not within the current subcategory
 * entries should be every entry on the page when this is called
 */
function updateSidebarViewFirstTime(entries: any[]) {
  isFirstOpen = false;   // global
  everyEntry = entries;  // Sets global variable for use in updateSidebarView
  const sidebarIds = getSidebarIdsFromSidebarName(previouslyActive);
  updateSidebarView('', sidebarIds.subcategory);
}

function updateFromOldToNew(prev: string, sidebarIds: SidebarIds) {
  const prevSidebarIds = getSidebarIdsFromSidebarName(prev);
  deactivateSidebar(prevSidebarIds);
  activateSidebar(sidebarIds);
  updateSidebarView(prevSidebarIds.subcategory, sidebarIds.subcategory);
}

function removeActiveEntry(sidebarIds: SidebarIds) {
  deactivateSidebar(sidebarIds);
  if (globalCurrentView.length >= 2) {
    const newSidebarIds = getSidebarIdsFromSidebarName(globalCurrentView[1]);
    activateSidebar(newSidebarIds);
    updateSidebarView(sidebarIds.subcategory, newSidebarIds.subcategory);
    previouslyActive = newSidebarIds.name;
  }
}

function handleHTMLEntry(htmlEntry: IntersectionObserverEntry) {
  const id = htmlEntry.target.getAttribute('id')!;
  const sidebarIds = getSidebarIdsFromId(id);

  // entry inside viewing window
  if (htmlEntry.intersectionRatio > 0) {
    if (toRemove.length > 0) {
      // inside a large div
      updateFromOldToNew(toRemove, sidebarIds);
      toRemove = '';
    } else if (globalCurrentView.length === 0) {
      // empty globalCurrentView, add to view
      activateSidebar(sidebarIds);
      previouslyActive = sidebarIds.name;
      globalCurrentView.push(sidebarIds.name);
    } else if (
        order.indexOf(previouslyActive) > order.indexOf(sidebarIds.name)) {
      // scrolling up
      updateFromOldToNew(globalCurrentView[0], sidebarIds);
      globalCurrentView.unshift(sidebarIds.name);
      previouslyActive = sidebarIds.name;
    } else {
      // an entry is in view under the current active entry
      globalCurrentView.push(sidebarIds.name);
    }
  } else if (globalCurrentView.length === 1) {
    // entry outside viewing window, but entry is the only element
    toRemove = previouslyActive;
  } else {
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
function handlePageJump(entries: IntersectionObserverEntry[]) {
  globalCurrentView = [];
  toRemove = '';
  previouslyActive = '';
  updateSidebarView('', 'null');
  for (const htmlEntry of entries) {
    const id = htmlEntry.target.getAttribute('id')!;
    const sidebarIds = getSidebarIdsFromId(id);
    deactivateSidebar(sidebarIds);
  }
  let isAtTop = true;
  for (const htmlEntry of entries) {
    if (htmlEntry.intersectionRatio > 0) {
      if (isAtTop) {
        isAtTop = false;
        const id = htmlEntry.target.getAttribute('id')!;
        const sidebarIds = getSidebarIdsFromId(id);
        updateSidebarView('', sidebarIds.subcategory);
      }
      handleHTMLEntry(htmlEntry);
    }
  }
}
let intersectionRatios = new Map<string, number>();
function handleExamples(entries: IntersectionObserverEntry[]) {
  if (isFirstOpen) {
    everyEntry = entries;
    isFirstOpen = false;
    document.querySelector(`h3[id="active-container-sidebar"`)!.classList.add(
        'active');
  }

  for (const entry of entries) {
    const id = entry.target.getAttribute('id')!;
    intersectionRatios.set(id, entry.intersectionRatio);
  }

  let maxRatio = 0;
  let maxName = '';
  for (const name of intersectionRatios.keys()) {
    if (intersectionRatios.get(name)! > maxRatio) {
      maxRatio = intersectionRatios.get(name)!;
      maxName = name;
    }
  }

  for (const entry of everyEntry) {
    const id = entry.target.getAttribute('id')!;
    const sidebarName = `container-${id.slice(-1)}-sidebar`;
    if (id === maxName) {
      document.querySelector(`h4[id=${sidebarName}`)!.classList.add('active');
    } else {
      document.querySelector(`h4[id=${sidebarName}`)!.classList.remove(
          'active');
    }
  }
}

function handleExampleIntersect(
    entries: IntersectionObserverEntry[], observer: any) {
  handleExamples(entries);
  console.log(observer);
}

/*
 * Update the table of contents based on how the page is viewed.
 */
export function sidebarObserver(docsOrExamples: string) {
  if (docsOrExamples === 'docs') {
    const observer = new IntersectionObserver(entries => {
      if (!isFirstOpen && entries.length > 2) {
        handlePageJump(entries);
      } else {
        for (const htmlEntry of entries) {
          handleHTMLEntry(htmlEntry);
        }
      }
      if (isFirstOpen) {
        updateSidebarViewFirstTime(entries);
      }
    });
    // i.e. attributes, properties, events, methods, slots, custom css.
    document.querySelectorAll('div[id*="docs"]').forEach((section) => {
      const idSplitList = section.getAttribute('id')!.split('-');
      if (idSplitList.length === 4) {
        order.push(idSplitList.slice(1, 10).join('-'));
        observer.observe(section);
      }
    });
  } else {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };
    const observer = new IntersectionObserver(handleExampleIntersect, options);
    document.querySelectorAll('div[id*="demo-container-"]')
        .forEach((section) => {
          const id = section.getAttribute('id');
          order.push(id);
          observer.observe(section);
        });
  }
}