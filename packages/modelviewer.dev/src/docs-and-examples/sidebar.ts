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
let globalOrdering: any[] = [];

let isFirstOpen = true;      // is true on the first observation of all entries
let everyEntry: any[] = [];  // a list of all attributes/properties etc.

/*
 * Add or remove the active class from a sidebarName, sidebarSubcategory and
 * sidebarCategory. i.e. src, Attribute, Loading
 */
function updateSidebarActive(
    sidebarName: string,
    sidebarSubcategory: string,
    sidebarCategory: string,
    isActive: boolean) {
  if (isActive) {
    document.querySelector(`div[id=${sidebarName}]`)!.classList.add('active');
    document.querySelector(`h4[id=${sidebarSubcategory}]`)!.classList.add(
        'active');
    document.querySelector(`h3[id=${sidebarCategory}]`)!.classList.add(
        'active');
  } else {
    document.querySelector(`div[id=${sidebarName}]`)!.classList.remove(
        'active');
    document.querySelector(`h4[id=${sidebarSubcategory}]`)!.classList.remove(
        'active');
    document.querySelector(`h3[id=${sidebarCategory}]`)!.classList.remove(
        'active');
  }
};

function addDeactive(sidebarName: string) {
  document.querySelector(`div[id=${sidebarName}]`)!.classList.add('de-active');
}

function removeDeactive(sidebarName: string) {
  document.querySelector(`div[id=${sidebarName}]`)!.classList.remove(
      'de-active');
}

/*
 * name: either the id of the attribute in the main view or the sidebarName
 * isId: boolean to determine whether the name is the id or sidebarName
 * isNewPage: when going to a new page, simply want current state to save
 */
export function getSidebarIds(name: string, isId: boolean, isNewPage: boolean) {
  if (isNewPage) {
    name = previouslyActive;
  }

  const sb = 'sidebar';
  let sidebarName: string = '';
  let sidebarSub: string[];
  let sidebarCat: string[];

  if (isId) {
    sidebarName = name.split('-').slice(1, 10).join('-');
    sidebarSub = name.split('-').slice(1, 3);
    sidebarCat = name.split('-').slice(1, 2);
  } else {
    sidebarName = name;
    sidebarSub = sidebarName.split('-').slice(0, 2);
    sidebarCat = sidebarName.split('-').slice(0, 1);
  }
  sidebarSub.push(sb);
  const sidebarSubcategory = sidebarSub.join('-');
  sidebarCat.push(sb);
  const sidebarCategory = sidebarCat.join('-');
  return [sidebarName, sidebarSubcategory, sidebarCategory];
}

/*
 * Update the sidebar
 * sidebarSubcategory: string of the old subcategory being replaced
 * newSidebarSubcategory: string of the new subcategory
 * example:
 *  sidebarSubcategory = loading-attributes
 *  newSidebarSubcategory = loading-cssProperties
 */
function updateSidebarView(
    sidebarSubcategory: string, newSidebarSubcategory: string) {
  if (sidebarSubcategory !== newSidebarSubcategory) {
    everyEntry.forEach(entry => {
      const id = entry.target.getAttribute('id');
      const allIds = getSidebarIds(id, true, false);
      const currentSidebarName = allIds[0];
      const currentSidebarSubcategory = allIds[1];
      if (currentSidebarSubcategory !== newSidebarSubcategory) {
        addDeactive(currentSidebarName);
      } else {
        removeDeactive(currentSidebarName);
      }
    });
  }
}

/*
 * Hide all of the entries not within the current subcategory
 */
function updateSidebarViewFirstTime(entries: any[]) {
  isFirstOpen = false;   // global
  everyEntry = entries;  // Sets global variable for use in updateSidebarView
  const allIds = getSidebarIds(previouslyActive, false, false);
  const sidebarSubcategory = allIds[1];
  updateSidebarView('', sidebarSubcategory);
}

/*
 * Update the table of contents based on how the page is viewed.
 */
export function sidebarObserver(docsOrExamples: string) {
  if (docsOrExamples === 'docs') {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('id')!;
        const [sidebarName, sidebarSubcategory, sidebarCategory] =
            getSidebarIds(id, true, false);

        if (entry.intersectionRatio > 0) {
          if (toRemove.length > 0) {
            let [prevSidebarName, prevSidebarSubcategory, prevSidebarCategory] =
                getSidebarIds(previouslyActive, false, false);
            // If you are within a long section so the header left view
            updateSidebarActive(
                prevSidebarName,
                prevSidebarSubcategory,
                prevSidebarCategory,
                false);
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, true);
            updateSidebarView(prevSidebarSubcategory, sidebarSubcategory);
            toRemove = '';
          } else if (globalCurrentView.length === 0) {
            // Empty globalCurrentView, add to view
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, true);
            previouslyActive = sidebarName;
            globalCurrentView.push(sidebarName);
          } else if (
              globalOrdering.indexOf(previouslyActive) >
              globalOrdering.indexOf(sidebarName)) {
            // sidebarName index lesser indicates scrolling up
            let [prevSidebarName, prevSidebarSubcategory, prevSidebarCategory] =
                getSidebarIds(globalCurrentView[0], false, false);
            updateSidebarActive(
                prevSidebarName,
                prevSidebarSubcategory,
                prevSidebarCategory,
                false);
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, true);
            updateSidebarView(prevSidebarSubcategory, sidebarSubcategory);
            globalCurrentView.unshift(sidebarName);
            previouslyActive = sidebarName;
          } else {
            // an entry is in view under the current active entry
            globalCurrentView.push(sidebarName);
          }
        } else if (globalCurrentView.length === 1) {
          // within a long entry (because there is nothing else in view)
          toRemove = previouslyActive;
        } else {
          // entry out of now out of view
          if (previouslyActive === sidebarName) {
            // entry being removed from view is currently active
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, false);
            if (globalCurrentView.length >= 2) {
              let [newSidebarName, newSidebarSubcategory, newSidebarCategory] =
                  getSidebarIds(globalCurrentView[1], false, false);
              updateSidebarActive(
                  newSidebarName,
                  newSidebarSubcategory,
                  newSidebarCategory,
                  true);
              updateSidebarView(sidebarSubcategory, newSidebarSubcategory);
              previouslyActive = newSidebarName;
            }
          }
          // always remove entry when out of view
          globalCurrentView = globalCurrentView.filter(e => e !== sidebarName);
        }
      });

      // True the first time all of the observers are set.
      // entries will be every possible entry on the whole page.
      if (isFirstOpen) {
        updateSidebarViewFirstTime(entries);
      }
    });

    // Fill the observer with the necessary divs to observe:
    // i.e. attributes, properties, events, methods, slots, custom css.
    document.querySelectorAll('div[id*="docs"]').forEach((section) => {
      let idSplitList = section.getAttribute('id')!.split('-');
      if (idSplitList.length === 4) {
        globalOrdering.push(idSplitList.slice(1, 10).join('-'));
        observer.observe(section);
      }
    });
  }
};