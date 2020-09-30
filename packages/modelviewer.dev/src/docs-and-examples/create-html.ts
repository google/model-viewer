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

const CategoryConstant: Category = {
  Title: '',
  Attributes: [],
  'CSS Custom Properties': [],
  Properties: [],
  Methods: [],
  Events: [],
  Slots: [],
}

function createEntrySidebar(
    lowerCaseTitle: string, lowerCaseKey: string, entry: Entry):
    HTMLElement {
      const entrySidebar = document.createElement('div');
      entrySidebar.classList.add('element');
      entrySidebar.classList.add('de-active');
      entrySidebar.id =
          lowerCaseTitle.concat('-', lowerCaseKey, '-', entry.htmlName);
      const entryLink = document.createElement('a');
      entryLink.setAttribute(
          'href',
          '#docs-'.concat(
              lowerCaseTitle, '-', lowerCaseKey, '-', entry.htmlName));
      entryLink.classList.add('darken');
      entryLink.innerText = entry.name;
      entrySidebar.appendChild(entryLink);
      return entrySidebar
    }

function createSubcategorySidebar(
    key: string, lowerCaseTitle: string, category: Category):
    HTMLElement {
      const lowerCaseKey = getLowerCaseKey(key);

      // Create subcategory container
      const subcategorySidebarContainer = document.createElement('div');
      subcategorySidebarContainer.classList.add('subCategory');

      // Create subcategory header
      const subcategoryHeader = document.createElement('H4');
      subcategoryHeader.id =
          lowerCaseTitle.concat('-', lowerCaseKey, '-sidebar');
      subcategoryHeader.classList.add('subcategory-header');

      // Create subcategory link
      const subcategoryLink = document.createElement('a');
      subcategoryLink.setAttribute(
          'href', '#'.concat(lowerCaseTitle, '-', lowerCaseKey));
      subcategoryLink.classList.add('darken');
      subcategoryLink.innerText = key;

      subcategoryHeader.appendChild(subcategoryLink);
      subcategorySidebarContainer.append(subcategoryHeader);

      const innerKey = key as keyof typeof CategoryConstant;
      const entries = (<Entry[]>category[innerKey]);
      for (const entry of entries) {
        const entrySidebar =
            createEntrySidebar(lowerCaseTitle, lowerCaseKey, entry);
        subcategorySidebarContainer.append(entrySidebar);
      }
      return subcategorySidebarContainer
    }

function createSidebar(category: Category, docsOrExamples: 'docs'|'examples') {
  const container = document.getElementById('sidebar-category-container');
  const lowerCaseTitle = category.Title.toLowerCase();

  const categoryContainer = document.createElement('div');
  categoryContainer.classList.add('category');

  const categoryHeader = document.createElement('H3');
  categoryHeader.id = lowerCaseTitle.concat('-sidebar');

  const categoryLink = document.createElement('a');
  categoryLink.setAttribute('href', '#'.concat(lowerCaseTitle))
  categoryLink.classList.add('darken');
  categoryLink.innerText = category.Title;

  categoryHeader.appendChild(categoryLink);
  categoryContainer.append(categoryHeader);

  if (docsOrExamples === 'examples') {
    container!.appendChild(categoryContainer);
    return;
  }
  const keys = Object.keys(category);
  for (const key of keys) {
    if (key !== 'Title') {
      const subcategorySidebarContainer =
          createSubcategorySidebar(key, lowerCaseTitle, category);
      categoryContainer.appendChild(subcategorySidebarContainer);
    }
  }
  container!.appendChild(categoryContainer);
}

function createTitle(header: string, docsOrExamples: 'docs'|'examples') {
  const lowerCaseHeader = header.toLowerCase();
  const para = document.createElement('div');
  para.classList.add('header');
  const node = document.createElement('H1');
  node.id = lowerCaseHeader;
  node.innerText = header;
  para.appendChild(node);
  const name = docsOrExamples === 'docs' ? '-docs' : '-examples-header';
  document.getElementById(lowerCaseHeader.concat(name))!.appendChild(para);
}

function getLowerCaseKey(key: string):
    string {
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
    entry: Entry):
    HTMLElement {
      const headerContainer = document.createElement('div');
      headerContainer.classList.add(lowerCaseCategory.concat('-name'));
      headerContainer.id =
          ['docs', lowerCaseHeader, plurallowerCaseCategory, entry.htmlName]
              .join('-');
      const header = document.createElement('H4');
      header.innerText = entry.name;
      headerContainer.appendChild(header);
      return headerContainer
    }

function createDescription(lowerCaseCategory: string, entry: Entry):
    HTMLElement {
      const descriptionContainer = document.createElement('div');
      descriptionContainer.classList.add(
          lowerCaseCategory.concat('-definition'));
      const description = document.createElement('p');
      description.innerHTML = entry.description;
      descriptionContainer.appendChild(description);
      return descriptionContainer;
    }

function createDefaultTable(entry: Entry):
    HTMLElement {
      const table = document.createElement('TABLE');
      table.classList.add('value-table');
      const tableRowHeaders = document.createElement('TR');
      const tableRowValues = document.createElement('TR');
      const tableHeaders = ['Default value', 'Type', 'Options'];
      for (const i in tableHeaders) {
        const th = document.createElement('TH');
        th.innerText = tableHeaders[i];
        const td = document.createElement('TD');
        td.innerText = entry.default[i];
        tableRowHeaders.appendChild(th);
        tableRowValues.appendChild(td);
      }
      table.appendChild(tableRowHeaders);
      table.appendChild(tableRowValues);
      return table;
    }

function createLinks(entry: Entry):
    HTMLElement {
      const linksContainer = document.createElement('div');
      const ul = document.createElement('UL');
      ul.classList.add('links');
      for (const link of entry.links) {
        const li = document.createElement('LI');
        li.innerHTML = link;
        ul.appendChild(li);
      }
      linksContainer.appendChild(ul)
      return linksContainer;
    }

function createEntry(
    entry: Entry, lowerCaseHeader: string, plurallowerCaseCategory: string):
    HTMLElement {
      const lowerCaseCategory = plurallowerCaseCategory.slice(0, -1);

      const entryContainer = document.createElement('div');
      entryContainer.classList.add(lowerCaseCategory.concat('-container'));

      const headerContainer = createHeader(
          lowerCaseCategory, plurallowerCaseCategory, lowerCaseHeader, entry);
      entryContainer.appendChild(headerContainer);

      const descriptionContainer = createDescription(lowerCaseCategory, entry);
      entryContainer.appendChild(descriptionContainer);

      if ('default' in entry && entry.default.length > 0) {
        const table = createDefaultTable(entry);
        entryContainer.appendChild(table);
      }

      if ('links' in entry && entry.links.length > 0) {
        const linksContainer = createLinks(entry);
        entryContainer.appendChild(linksContainer);
      }

      return entryContainer;
    }

function createSubcategory(
    subcategoryArray: Entry[],
    header: string,
    category: string,
    categoryLower: string) {
  const lowerCaseHeader = header.toLowerCase();

  const element = document.getElementById(lowerCaseHeader.concat('-docs'));

  const subcategoryContainer = document.createElement('div');
  subcategoryContainer.classList.add(categoryLower.concat('-container'));

  const middleContainer = document.createElement('div');
  middleContainer.classList.add('inner-content');

  const innerSubcategoryContainer = document.createElement('div');
  innerSubcategoryContainer.id =
      'docs-'.concat(lowerCaseHeader, '-', categoryLower);

  const headerNode = document.createElement('H3');
  headerNode.id = lowerCaseHeader.concat('-', categoryLower);
  headerNode.innerText = category;

  innerSubcategoryContainer.appendChild(headerNode);
  middleContainer.appendChild(innerSubcategoryContainer);
  subcategoryContainer.appendChild(middleContainer);
  element!.appendChild(subcategoryContainer);

  for (const entry of subcategoryArray) {
    innerSubcategoryContainer.appendChild(
        createEntry(entry, lowerCaseHeader, categoryLower));
  }
}

export function convertJSONToHTML(
    json: any[], docsOrExamples: 'docs'|'examples') {
  let header = '';
  for (const category of json) {
    for (const key in category) {
      if (key === 'Title') {
        header = category[key];
        createTitle(category[key], docsOrExamples);
      } else if (docsOrExamples === 'docs') {
        const lowerCaseKey = getLowerCaseKey(key);
        createSubcategory(category[key], header, key, lowerCaseKey);
      }
    }
    createSidebar(category, docsOrExamples);
  }
}