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

interface Entry {
  name: string, htmlName: string, description: string, default: string[],
      links: string[],
}

interface Category {
  Title: string, Attributes: Entry[], 'CSS Custom Properties': Entry[],
      Properties: Entry[], Methods: Entry[], Events: Entry[], Slots: Entry[],
}

const CategoryConstant: Category =
    {
      Title: '',
      Attributes: [],
      'CSS Custom Properties': [],
      Properties: [],
      Methods: [],
      Events: [],
      Slots: [],
    }

function createEntrySidebar(
    lowerCaseTitle: string, lowerCaseKey: string, entry: Entry) {
  let entrySidebar = document.createElement('div');
  entrySidebar.classList.add('element');
  entrySidebar.classList.add('de-active');
  entrySidebar.id =
      lowerCaseTitle.concat('-', lowerCaseKey, '-', entry.htmlName);
  let entryLink = document.createElement('a');
  entryLink.setAttribute(
      'href',
      '#docs-'.concat(lowerCaseTitle, '-', lowerCaseKey, '-', entry.htmlName));
  entryLink.classList.add('darken');
  entryLink.innerText = entry.name;
  entrySidebar.appendChild(entryLink);
  return entrySidebar
}

function createSubcategorySidebar(
    key: string, lowerCaseTitle: string, category: Category) {
  let lowerCaseKey = getLowerCaseKey(key);

  // Create subcategory container
  let subcategorySidebarContainer = document.createElement('div');
  subcategorySidebarContainer.classList.add('subCategory');

  // Create subcategory header
  let subcategoryHeader = document.createElement('H4');
  subcategoryHeader.id = lowerCaseTitle.concat('-', lowerCaseKey, '-sidebar');
  subcategoryHeader.classList.add('subcategory-header');

  // Create subcategory link
  let subcategoryLink = document.createElement('a');
  subcategoryLink.setAttribute(
      'href', '#'.concat(lowerCaseTitle, '-', lowerCaseKey));
  subcategoryLink.classList.add('darken');
  subcategoryLink.innerText = key;

  subcategoryHeader.appendChild(subcategoryLink);
  subcategorySidebarContainer.append(subcategoryHeader);

  const innerKey = key as keyof typeof CategoryConstant;  // hack to use later
  (<Entry[]>category[innerKey]).forEach(function(entry: Entry) {
    let entrySidebar = createEntrySidebar(lowerCaseTitle, lowerCaseKey, entry);
    subcategorySidebarContainer.append(entrySidebar);
  });
  return subcategorySidebarContainer
}

function createSidebar(category: Category, docsOrExamples: string) {
  let container = document.getElementById('sidebar-category-container');
  let lowerCaseTitle = category.Title.toLowerCase();

  let categoryContainer = document.createElement('div');
  categoryContainer.classList.add('category');

  let categoryHeader = document.createElement('H3');
  categoryHeader.id = lowerCaseTitle.concat('-sidebar');

  let categoryLink = document.createElement('a');
  categoryLink.setAttribute('href', '#'.concat(lowerCaseTitle))
  categoryLink.classList.add('darken');
  categoryLink.innerText = category.Title;

  categoryHeader.appendChild(categoryLink);
  categoryContainer.append(categoryHeader);

  if (docsOrExamples === 'examples') {
    container!.appendChild(categoryContainer);
    return;
  }

  Object.keys(category).forEach((key) => {
    if (key !== 'Title') {
      let subcategorySidebarContainer =
          createSubcategorySidebar(key, lowerCaseTitle, category);
      categoryContainer.appendChild(subcategorySidebarContainer);
    }
  });
  container!.appendChild(categoryContainer);
}

function createTitle(header: string, docsOrExamples: string) {
  let lowerCaseHeader = header.toLowerCase();
  let element: HTMLElement;
  let para = document.createElement('div');
  para.classList.add('header');
  let node = document.createElement('H1');
  node.id = lowerCaseHeader;
  node.innerText = header;
  para.appendChild(node);
  if (docsOrExamples === 'docs') {
    element = document.getElementById(lowerCaseHeader.concat('-docs'))!;
  } else {
    element =
        document.getElementById(lowerCaseHeader.concat('-examples-header'))!;
  }
  element!.appendChild(para);
}

function getLowerCaseKey(key: string) {
  if (key === 'CSS Custom Properties') {
    return 'cssProperties';
  } else {
    return key.toLowerCase();
  }
}

function createHeader(
    lowerCaseCategory: string,
    plurallowerCaseCategory: string,
    lowerCaseHeader: string,
    entry: Entry) {
  let headerContainer = document.createElement('div');
  headerContainer.classList.add(lowerCaseCategory.concat('-name'));
  headerContainer.id =
      ['docs', lowerCaseHeader, plurallowerCaseCategory, entry.htmlName].join(
          '-');
  let header = document.createElement('H4');
  header.innerText = entry.name;
  headerContainer.appendChild(header);
  return headerContainer
}

function createDescription(lowerCaseCategory: string, entry: Entry) {
  let descriptionContainer = document.createElement('div');
  descriptionContainer.classList.add(lowerCaseCategory.concat('-definition'));
  let description = document.createElement('p');
  description.innerHTML = entry.description;
  descriptionContainer.appendChild(description);
  return descriptionContainer;
}

function createDefaultTable(entry: Entry) {
  let table = document.createElement('TABLE');
  table.classList.add('value-table');
  let tableRowHeaders = document.createElement('TR');
  let tableRowValues = document.createElement('TR');
  const tableHeaders = ['Default value', 'Type', 'Options'];
  for (let i = 0; i < tableHeaders.length; i++) {
    let th = document.createElement('TH');
    th.innerText = tableHeaders[i];
    let td = document.createElement('TD');
    td.innerText = entry.default[i];
    tableRowHeaders.appendChild(th);
    tableRowValues.appendChild(td);
  }
  table.appendChild(tableRowHeaders);
  table.appendChild(tableRowValues);
  return table;
}

function createLinks(entry: Entry) {
  let linksContainer = document.createElement('div');
  let ul = document.createElement('UL');
  ul.classList.add('links');
  entry.links.forEach(function(link: string) {
    let li = document.createElement('LI');
    li.innerHTML = link;
    ul.appendChild(li);
  });
  linksContainer.appendChild(ul)
  return linksContainer;
}

function createEntry(
    entry: Entry, lowerCaseHeader: string, plurallowerCaseCategory: string) {
  let lowerCaseCategory = plurallowerCaseCategory.slice(0, -1);

  let entryContainer = document.createElement('div');
  entryContainer.classList.add(lowerCaseCategory.concat('-container'));

  let headerContainer = createHeader(
      lowerCaseCategory, plurallowerCaseCategory, lowerCaseHeader, entry);
  entryContainer.appendChild(headerContainer);

  let descriptionContainer = createDescription(lowerCaseCategory, entry);
  entryContainer.appendChild(descriptionContainer);

  if ('default' in entry && entry.default.length > 0) {
    let table = createDefaultTable(entry);
    entryContainer.appendChild(table);
  }

  if ('links' in entry && entry.links.length > 0) {
    let linksContainer = createLinks(entry);
    entryContainer.appendChild(linksContainer);
  }

  return entryContainer;
}

function createSubcategory(
    subcategoryArray: Entry[],
    header: string,
    category: string,
    categoryLower: string) {
  let lowerCaseHeader = header.toLowerCase();

  let element = document.getElementById(lowerCaseHeader.concat('-docs'));

  let subcategoryContainer = document.createElement('div');
  subcategoryContainer.classList.add(categoryLower.concat('-container'));

  let middleContainer = document.createElement('div');
  middleContainer.classList.add('inner-content');

  let innerSubcategoryContainer = document.createElement('div');
  innerSubcategoryContainer.id =
      'docs-'.concat(lowerCaseHeader, '-', categoryLower);

  let headerNode = document.createElement('H3');
  headerNode.id = lowerCaseHeader.concat('-', categoryLower);
  headerNode.innerText = category;

  innerSubcategoryContainer.appendChild(headerNode);
  middleContainer.appendChild(innerSubcategoryContainer);
  subcategoryContainer.appendChild(middleContainer);
  element!.appendChild(subcategoryContainer);

  subcategoryArray.forEach(function(entry: Entry) {
    innerSubcategoryContainer.appendChild(
        createEntry(entry, lowerCaseHeader, categoryLower));
  });
}

export function convertJSONToHTML(json: any[], docsOrExamples: string) {
  let header = '';
  json.forEach(function(category) {
    for (let key in category) {
      if (key === 'Title') {
        header = category[key];
        createTitle(category[key], docsOrExamples);
      } else if (docsOrExamples === 'docs') {
        let lowerCaseKey = getLowerCaseKey(key);
        createSubcategory(category[key], header, key, lowerCaseKey);
      }
    }
    createSidebar(category, docsOrExamples);
  });
}