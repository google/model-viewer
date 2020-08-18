import {ModelViewerElement} from '../model-viewer';
import {Constructor} from '../utilities';

import {BasicSpecTemplate} from './templates';

// const expect = chai.expect;

suite.only('ModelViewerElement', () => {
  // global variable
  let nextId: number = 0;
  let tagName: string;
  let ModelViewer: Constructor<ModelViewerElement>;

  setup(() => {
    tagName = `model-viewer-${nextId++}`;
    ModelViewer = class extends ModelViewerElement {
      static get is() {
        return tagName;
      }
    }
    // not sure what does this do
    customElements.define(tagName, ModelViewer);
  })

  BasicSpecTemplate(() => ModelViewer, () => tagName);
  // tear down

  // basic template (optional)

  suite(
      'Fidelity Test',
      () => {
          // setup-fidleity test,  read config file here

          // test each scenarios

      })
})