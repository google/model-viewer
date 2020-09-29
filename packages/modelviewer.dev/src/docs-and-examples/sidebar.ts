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

var globalCurrentView: string[] = [];
var previouslyActive: string = '';
var toRemove = '';
var globalOrdering: any[] = [];

var isFirstOpen = true;      // is true on the first observation of all entries
var everyEntry: any[] = [];  // a list of all attributes/properties etc.

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
 * name: string of either the id of the attribute in the main view or the
 * sidebarName isId: boolean to determine whether the name is the id or
 * sidebarName
 */
export function getSidebarIds(name: string, isId: boolean, isNewPage: boolean) {
  if (isNewPage) {
    name = previouslyActive;
    console.log(name);
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
      /* tslint:disable:no-unused-variable */
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
 * Hide all of the entries not within the current subcategory, default:
 * Loading->Attributes
 */
function updateSidebarViewFirstTime(entries: any[]) {
  isFirstOpen = false;   // global
  everyEntry = entries;  // Sets global variable for use in updateSidebarView
  /* tslint:disable:no-unused-variable */
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
          // If you are within a long section so the header left view
          if (toRemove.length > 0) {
            let [newSidebarName, newSidebarSubcategory, newSidebarCategory] =
                getSidebarIds(previouslyActive, false, false);
            updateSidebarActive(
                newSidebarName,
                newSidebarSubcategory,
                newSidebarCategory,
                false);
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, true);
            updateSidebarView(newSidebarSubcategory, sidebarSubcategory);
            toRemove = '';
          }
          // If there isn't anything in globalCurrentView
          else if (globalCurrentView.length === 0) {
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, true);
            previouslyActive = sidebarName;
            globalCurrentView.push(sidebarName);

            // sidebarName index lesser means it appears above the currently
            // active view
          } else if (
              globalOrdering.indexOf(previouslyActive) >
              globalOrdering.indexOf(sidebarName)) {
            var newSidebarName = globalCurrentView[0];
            var [newSidebarName, newSidebarSubcategory, newSidebarCategory] =
                getSidebarIds(newSidebarName, false, false);

            updateSidebarActive(
                newSidebarName,
                newSidebarSubcategory,
                newSidebarCategory,
                false);
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, true);
            updateSidebarView(newSidebarSubcategory, sidebarSubcategory);

            globalCurrentView.unshift(sidebarName);
            previouslyActive = sidebarName;

          } else {
            globalCurrentView.push(sidebarName);
          }
          // the intersection was updated and its now out of view, but still
          // within a property
        } else if (globalCurrentView.length === 1) {
          toRemove = previouslyActive;
          // the intersection was updated and its now out of view
        } else {
          // if the thing being removed from view was currently active
          if (previouslyActive === sidebarName) {
            updateSidebarActive(
                sidebarName, sidebarSubcategory, sidebarCategory, false);
            if (globalCurrentView.length >= 2) {
              newSidebarName = globalCurrentView[1];
              [newSidebarName, newSidebarSubcategory, newSidebarCategory] =
                  getSidebarIds(newSidebarName, false, false);
              updateSidebarActive(
                  newSidebarName,
                  newSidebarSubcategory,
                  newSidebarCategory,
                  true);
              updateSidebarView(sidebarSubcategory, newSidebarSubcategory);
              previouslyActive = newSidebarName;
            }
          }
          globalCurrentView = globalCurrentView.filter(e => e !== sidebarName);
        }
      });

      // This is true the first time all of the observers are set.
      // entries will be every possible entry on the whole page.
      if (isFirstOpen) {
        updateSidebarViewFirstTime(entries);
      }
    });

    // Fill the observer with the necessary divs to observe: attributes,
    // properties, etc.
    document.querySelectorAll('div[id*="docs"]').forEach((section) => {
      let idSplitList = section.getAttribute('id')!.split('-');
      if (idSplitList.length === 4) {
        globalOrdering.push(idSplitList.slice(1, 10).join('-'));
        observer.observe(section);
      }
    });
  }
};