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

function createSubcategorySidebar(subcategory: string, lowerCaseTitle: string):
    string {
      const lowerCaseKey = getLowerCaseKey(subcategory);
      const headerId = lowerCaseTitle.concat('-', lowerCaseKey, '-sidebar');
      const aHref = lowerCaseTitle.concat('-', lowerCaseKey);
      return `
<div class="subCategory" id=${'subCategory'.concat(subcategory)}>
  <h4 class="subcategory-header" id=${headerId}>
    <a class="darken" href="#${aHref}">${subcategory}</a>
  <h4>
</div>`;
    }

function createSidebar(category: Category, docsOrExamples: 'docs'|'examples') {
  if (docsOrExamples === 'examples')
    return;
  const container = document.getElementById('sidebar-category-container');
  const lowerCaseTitle = category.Title.toLowerCase();
  let subcategories = Object.keys(category);
  subcategories = subcategories.filter(k => k !== 'Title');

  const categoryContainer = `
<div class="category" id=${lowerCaseTitle.concat('aboveHeader')}>
  <h3 id=${lowerCaseTitle.concat('-sidebar')}>
    <a class="darken" href="#${lowerCaseTitle}">${category.Title}</a>
  <h3>
</div>`;

  container!.innerHTML += categoryContainer;

  const innerCategory =
      document.getElementById(lowerCaseTitle.concat('aboveHeader'));
  for (const subcategory of subcategories) {
    innerCategory!.innerHTML +=
        createSubcategorySidebar(subcategory, lowerCaseTitle);

    const innerSubcategory =
        document.getElementById(lowerCaseTitle.concat('aboveHeader'));
    const lowerCaseKey = getLowerCaseKey(subcategory);
    const entries =
        (<Entry[]>category[subcategory as keyof typeof CategoryConstant]);
    for (const entry of entries) {
      const divId =
          lowerCaseTitle.concat('-', lowerCaseKey, '-', entry.htmlName);
      const aId = '#docs-'.concat(
          lowerCaseTitle, '-', lowerCaseKey, '-', entry.htmlName);
      innerSubcategory!.innerHTML += `
<div class="element de-active" id=${divId}>
  <a class="darken" href=${aId}>${entry.name}</a>
</div>`;
    }
  }
}

function createTitle(header: string, docsOrExamples: 'docs'|'examples') {
  const name = docsOrExamples === 'docs' ? '-docs' : '-examples-header';
  const titleContainer =
      document.getElementById(header.toLowerCase().concat(name));
  const title = `
<div class="header">
  <h1 id=${header.toLowerCase()}>${header}<h1>
</div>`;
  titleContainer!.innerHTML += title;
}

function getLowerCaseKey(key: string):
    string {
      if (key === 'CSS Custom Properties') {
        return 'cssProperties';
      } else {
        return key.toLowerCase();
      }
    }

function createDefaultTable(entry: Entry):
    string {
      return `
<table class="value-table">
  <tr>
    <th>Default value</th>
    <th>Type</th>
    <th>Options</th>
  </tr>
  <tr>
    <td>${entry.default[0]}</td>
    <td>${entry.default[1]}</td>
    <td>${entry.default[2]}</td>
  </tr>
</table>`;
    }

function createLinks(
    entry: Entry,
    pluralLowerCaseSubcategory: string,
    lowerCaseCategory: string):
    string {
      const ulId = 'links'.concat(
          entry.htmlName, pluralLowerCaseSubcategory, lowerCaseCategory);
      return `
<div>
  <ul class="links" id=${ulId}>
  </ul>
</div>`;
    }

function createEntry(
    entry: Entry,
    lowerCaseCategory: string,
    pluralLowerCaseSubcategory: string):
    string {
      const lowerCaseSubcategory = pluralLowerCaseSubcategory.slice(0, -1);
      const subcategoryNameId = [
        'docs',
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
    subcategoryArray: Entry[],
    category: string,
    subcategory: string,
    pluralLowerCaseSubcategory: string) {
  const lowerCaseCategory = category.toLowerCase();

  const element = document.getElementById(lowerCaseCategory.concat('-docs'));
  const subcategoryContainerId =
      'docs-'.concat(lowerCaseCategory, '-', pluralLowerCaseSubcategory);

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
  element!.innerHTML += subcategoryContainer;

  const innerSubcategoryContainer =
      document.getElementById(subcategoryContainerId);
  for (const entry of subcategoryArray) {
    innerSubcategoryContainer!.innerHTML +=
        createEntry(entry, lowerCaseCategory, pluralLowerCaseSubcategory);

    if ('links' in entry) {
      const ulId = 'links'.concat(
          entry.htmlName, pluralLowerCaseSubcategory, lowerCaseCategory);
      const ul = document.getElementById(ulId);
      for (const link of entry.links) {
        ul!.innerHTML += `<li>${link}</li>`;
      }
    }
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