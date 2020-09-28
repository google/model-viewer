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

const CategoryCon: Category =
    {
      Title: '',
      Attributes: [],
      'CSS Custom Properties': [],
      Properties: [],
      Methods: [],
      Events: [],
      Slots: [],
    }

function makeSidebar(category: Category) {
  let container = document.getElementById('sidebar-category-container');
  let titleLower = category.Title.toLowerCase();

  let categoryDiv = document.createElement('div');
  categoryDiv.classList.add('category');

  let categoryHeader = document.createElement('H3');
  categoryHeader.id = titleLower.concat('-sidebar');

  let categoryLink = document.createElement('a');
  categoryLink.setAttribute('href', '#'.concat(titleLower))
  categoryLink.classList.add('darken');
  categoryLink.innerText = category.Title;

  categoryHeader.appendChild(categoryLink);
  categoryDiv.append(categoryHeader);

  Object.keys(category).forEach((key) => {
    const innerKey = key as keyof typeof CategoryCon;
    if (key !== 'Title') {
      let subCategory = document.createElement('div');
      subCategory.classList.add('subCategory');

      let subCategoryLink = document.createElement('a');
      let lowerCaseKey = getLowerCaseKey(key);

      let subCategoryHeader = document.createElement('H4');
      subCategoryHeader.id = titleLower.concat('-', lowerCaseKey, '-sidebar');
      subCategoryHeader.classList.add('subcategory-header');

      subCategoryLink.setAttribute(
          'href', '#'.concat(titleLower, '-', lowerCaseKey));
      subCategoryLink.classList.add('darken');
      subCategoryLink.innerText = key;

      subCategoryHeader.appendChild(subCategoryLink);
      subCategory.append(subCategoryHeader);

      (<Entry[]>category[innerKey]).forEach(function(element: Entry) {
        let ele = document.createElement('div');
        ele.classList.add('element');
        ele.classList.add('de-active');
        ele.id = titleLower.concat('-', lowerCaseKey, '-', element.htmlName);
        let eleLink = document.createElement('a');
        eleLink.setAttribute(
            'href',
            '#docs-'.concat(
                titleLower, '-', lowerCaseKey, '-', element.htmlName));
        eleLink.classList.add('darken');
        eleLink.innerText = element.name;
        ele.appendChild(eleLink);
        subCategory.append(ele);
      });

      categoryDiv.appendChild(subCategory);
    }
  });
  container!.appendChild(categoryDiv);
}

function addHeader(header: string) {
  let lowerHeader = header.toLowerCase();

  let para = document.createElement('div');
  para.classList.add('header');
  let node = document.createElement('H1');
  node.id = lowerHeader;
  node.innerText = header;
  para.appendChild(node);
  let element = document.getElementById(lowerHeader.concat('-docs'));
  element!.appendChild(para);
}

function makeElement(
    attribute: Entry,
    lowerHeader: string,
    pluralCategoryLower: string,
    categoryLower: string) {
  let attributeContainer = document.createElement('div');
  attributeContainer.classList.add(categoryLower.concat('-container'));

  // Creating the header
  let headerContainer = document.createElement('div');
  headerContainer.classList.add(categoryLower.concat('-name'));
  headerContainer.id =
      ['docs', lowerHeader, pluralCategoryLower, attribute.htmlName].join('-');

  let header = document.createElement('H4');
  header.innerText = attribute.name;

  headerContainer.appendChild(header);
  attributeContainer.appendChild(headerContainer);

  // Creating the description
  let descriptionContainer = document.createElement('div');
  descriptionContainer.classList.add(categoryLower.concat('-definition'));

  let description = document.createElement('p');
  description['innerHTML'] = attribute.description;

  descriptionContainer.appendChild(description);
  attributeContainer.appendChild(descriptionContainer);

  if ('default' in attribute && attribute.default.length > 0) {
    if (categoryLower === 'attribute' || categoryLower == 'cssPropertie') {
      let table = document.createElement('TABLE');
      table.classList.add('value-table');

      let tr1 = document.createElement('TR');
      let th1 = document.createElement('TH');
      th1.innerText = 'Default value';
      let th2 = document.createElement('TH');
      th2.innerText = 'Type';
      let th3 = document.createElement('TH');
      th3.innerText = 'Options';
      tr1.appendChild(th1);
      tr1.appendChild(th2);
      tr1.appendChild(th3);
      table.appendChild(tr1);

      let tr2 = document.createElement('TR');
      let td1 = document.createElement('TD');
      td1.innerText = attribute.default[0];
      let td2 = document.createElement('TD');
      td2.innerText = attribute.default[1];
      let td3 = document.createElement('TD');
      td3.innerText = attribute.default[2];
      tr2.appendChild(td1);
      tr2.appendChild(td2);
      tr2.appendChild(td3);
      table.appendChild(tr2);

      attributeContainer.appendChild(table);
    }
  }

  // Creating the links for an attribute
  if ('links' in attribute && attribute.links.length > 0) {
    let linksContainer = document.createElement('div');

    let ul = document.createElement('UL');
    ul.classList.add('links');

    attribute.links.forEach(function(link: string) {
      let li = document.createElement('LI');
      li.innerHTML = link;
      ul.appendChild(li);
    });

    linksContainer.appendChild(ul)
    attributeContainer.appendChild(linksContainer);
  }

  return attributeContainer;
}

function addAttributes(
    attributeArray: Entry[],
    header: string,
    category: string,
    categoryLower: string) {
  let lowerHeader = header.toLowerCase();

  let element = document.getElementById(lowerHeader.concat('-docs'));

  let outer = document.createElement('div');
  outer.classList.add(categoryLower.concat('-container'));

  let middle = document.createElement('div');
  middle.classList.add('inner-content');

  let container = document.createElement('div');
  container.id = 'docs-'.concat(lowerHeader, '-', categoryLower);

  let headerNode = document.createElement('H3');
  headerNode.id = lowerHeader.concat('-', categoryLower);
  headerNode.innerText = category;

  outer.appendChild(middle);
  middle.appendChild(container);
  container.appendChild(headerNode);
  element!.appendChild(outer);

  attributeArray.forEach(function(attribute: Entry) {
    let attr = makeElement(
        attribute, lowerHeader, categoryLower, categoryLower.slice(0, -1));
    container.appendChild(attr);
  });
}

function getLowerCaseKey(key: string) {
  if (key === 'CSS Custom Properties') {
    return 'cssProperties';
  } else {
    return key.toLowerCase();
  }
}

export function convertJSONToHTML(json: any[]) {
  let header = '';
  json.forEach(function(category) {
    // Make body content
    for (let key in category) {
      if (key === 'Title') {
        header = category[key];
        addHeader(category[key]);
      } else {
        let lowerCaseKey = getLowerCaseKey(key);
        addAttributes(category[key], header, key, lowerCaseKey);
      }
    }
    makeSidebar(category);
  });
}