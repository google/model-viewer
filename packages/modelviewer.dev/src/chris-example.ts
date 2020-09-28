async function fetchHtmlAsText(url: string) {
  const response = await fetch(url);
  return await response.text();
}

async function loadExamples() {
  const loadingExample = document.getElementById('loading-examples');
  loadingExample!.innerHTML = await fetchHtmlAsText('lazy-loading.html');
}

loadExamples();

export function doClick(newType: string) {
  let allIds = getSidebarIds(previouslyActive, false);
  let newSidebarCategory = allIds[2];
  let example = document.getElementById(
      newSidebarCategory.split('-')[0].concat('-examples'));
  let doc =
      document.getElementById(newSidebarCategory.split('-')[0].concat('-docs'));
  if (newType === 'docs') {
    doc!.classList.remove('inactive-doc-example');
    example!.classList.add('inactive-doc-example');
  } else {
    doc!.classList.add('inactive-doc-example');
    example!.classList.remove('inactive-doc-example');
  }
}

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

function
makeSidebar(category: Category) {
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

interface ICallBack {
  (response: string): void
}

function loadJSON(filePath: string, callback: ICallBack) {
  let xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', filePath, true);
  xobj.onreadystatechange = function() {
    console.log(xobj.status);
    console.log(typeof (xobj.status));
    if (xobj.readyState === 4 && xobj.status === 200) {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
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

function convertJSONToHTML(json: any[]) {
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
function getSidebarIds(name: string, isId: boolean) {
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

var globalCurrentView: string[] = [];
var previouslyActive = '';
var toRemove = '';
var globalOrdering: any[] = [];

var isFirstOpen = true;      // is true on the first observation of all entries
var everyEntry: any[] = [];  // a list of all attributes/properties etc.

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
      const allIds = getSidebarIds(id, true);
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
  const allIds = getSidebarIds(previouslyActive, false);
  const sidebarSubcategory = allIds[1];
  updateSidebarView('', sidebarSubcategory);
}

/*
 * Update the table of contents based on how the page is viewed.
 */
function sidebarObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('id')!;
      const [sidebarName, sidebarSubcategory, sidebarCategory] =
          getSidebarIds(id, true);

      if (entry.intersectionRatio > 0) {
        // If you are within a long section so the header left view
        if (toRemove.length > 0) {
          let [newSidebarName, newSidebarSubcategory, newSidebarCategory] =
              getSidebarIds(previouslyActive, false);
          updateSidebarActive(
              newSidebarName, newSidebarSubcategory, newSidebarCategory, false);
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
              getSidebarIds(newSidebarName, false);

          updateSidebarActive(
              newSidebarName, newSidebarSubcategory, newSidebarCategory, false);
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
                getSidebarIds(newSidebarName, false);
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
};

// Load the JSON asynchronously, then generate the sidebarObserver after all the
// documentation in the window.
function init() {
  loadJSON('./data/loading.json', function(response: string) {
    let actualJSON = JSON.parse(response);
    convertJSONToHTML(actualJSON);
    sidebarObserver();
  });
}

init();

window.onscroll = function() {
  stickyHeader()
};

function stickyHeader() {
  let headers = document.getElementsByClassName('header');
  for (let i = 0; i < headers.length; i++) {
    let header = headers[i] as HTMLElement;
    let sticky = header.offsetTop;
    if (window.pageYOffset > sticky) {
      header.classList.add('sticky');
    } else {
      header.classList.remove('sticky');
    }
  }
}

(self as any).doClick = doClick;
