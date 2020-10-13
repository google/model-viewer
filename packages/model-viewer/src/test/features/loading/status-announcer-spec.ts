/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {LoadingMixin} from '../../../features/loading.js';
import {FINISHED_LOADING_ANNOUNCEMENT, INITIAL_STATUS_ANNOUNCEMENT, LoadingStatusAnnouncer} from '../../../features/loading/status-announcer.js';
import ModelViewerElementBase from '../../../model-viewer-base.js';
import {waitForEvent} from '../../../utilities.js';
import {assetPath, isInDocumentTree, until} from '../../helpers.js';

const expect = chai.expect;

suite('LoadingStatusAnnouncer', () => {
  let nextId = 0;
  let tagName: string;
  let ModelViewerElement: any;
  let loadingStatusAnnouncer: LoadingStatusAnnouncer;

  setup(() => {
    tagName = `model-viewer-loading-announcer-${nextId++}`;
    ModelViewerElement = class extends LoadingMixin
    (ModelViewerElementBase) {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);
    loadingStatusAnnouncer = new LoadingStatusAnnouncer();
  });

  suite('when a model is registered', () => {
    let element: any;
    setup(() => {
      element = new ModelViewerElement();
      document.body.insertBefore(element, document.body.firstChild);
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    suite('that has a src', () => {
      test('sets initial status', async () => {
        element.poster = assetPath('../screenshot.png');
        element.src = assetPath('models/Astronaut.glb');

        loadingStatusAnnouncer.registerInstance(element);

        await waitForEvent(loadingStatusAnnouncer, 'initial-status-announced');

        const {statusElement} = loadingStatusAnnouncer;

        expect(statusElement.textContent)
            .to.be.equal(INITIAL_STATUS_ANNOUNCEMENT);
      });

      suite('after the model loads', () => {
        test('sets the finished status', async () => {
          element.src = assetPath('models/Astronaut.glb');

          loadingStatusAnnouncer.registerInstance(element);

          await Promise.all([
            until(() => element.loaded),
            waitForEvent(loadingStatusAnnouncer, 'finished-loading-announced')
          ]);

          const {statusElement} = loadingStatusAnnouncer;

          expect(statusElement.textContent)
              .to.be.equal(FINISHED_LOADING_ANNOUNCEMENT);
        });
      });

      suite('there are other registered models', () => {
        let otherElement: any;

        setup(() => {
          otherElement = new ModelViewerElement();
          document.body.insertBefore(otherElement, document.body.firstChild);
        });

        teardown(() => {
          document.body.removeChild(otherElement);
        });

        test('sets finished status when all models are loaded', async () => {
          element.src = otherElement.src = assetPath('models/Astronaut.glb');

          loadingStatusAnnouncer.registerInstance(element);
          loadingStatusAnnouncer.registerInstance(otherElement);

          await Promise.all([
            until(() => element.loaded && otherElement.loaded),
            waitForEvent(loadingStatusAnnouncer, 'finished-loading-announced')
          ]);

          const {statusElement} = loadingStatusAnnouncer;

          expect(statusElement.textContent)
              .to.be.equal(FINISHED_LOADING_ANNOUNCEMENT);
        });

        suite('one model is already loaded', () => {
          test('eventually sets finished status', async () => {
            element.src = assetPath('models/Astronaut.glb');

            await until(() => element.loaded);

            otherElement.src = assetPath('models/Astronaut.glb');

            loadingStatusAnnouncer.registerInstance(element);
            loadingStatusAnnouncer.registerInstance(otherElement);

            await Promise.all([
              until(() => otherElement.loaded),
              waitForEvent(loadingStatusAnnouncer, 'finished-loading-announced')
            ]);

            const {statusElement} = loadingStatusAnnouncer;

            expect(statusElement.textContent)
                .to.be.equal(FINISHED_LOADING_ANNOUNCEMENT);
          });
        });

        suite('one model fails', () => {
          test('eventually sets finished status', async () => {
            const errorOccurs = waitForEvent(element, 'error');

            element.src = assetPath('models/DOES_NOT_EXIST.glb');
            otherElement.src = assetPath('models/Astronaut.glb');

            loadingStatusAnnouncer.registerInstance(element);
            loadingStatusAnnouncer.registerInstance(otherElement);

            await Promise.all([
              errorOccurs,
              until(() => otherElement.loaded),
              waitForEvent(loadingStatusAnnouncer, 'finished-loading-announced')
            ]);

            const {statusElement} = loadingStatusAnnouncer;

            expect(statusElement.textContent)
                .to.be.equal(FINISHED_LOADING_ANNOUNCEMENT);
          });
        });
      });
    });
  });

  suite('many elements and first one is removed', () => {
    let element: ModelViewerElementBase;
    let otherElement: ModelViewerElementBase;

    customElements.define('model-viewer-element', ModelViewerElementBase);

    setup(() => {
      // NOTE(cdata): We use ModelViewerElementBase here because we are
      // testing behavior that is affected by connected/disconnected
      // side-effects in LoadingMixin.
      element = new ModelViewerElementBase();
      otherElement = new ModelViewerElementBase();

      document.body.insertBefore(element, document.body.firstChild);
      document.body.insertBefore(otherElement, document.body.firstChild);
    });

    teardown(() => {
      if (element.parentNode != null) {
        document.body.removeChild(element);
      }

      if (otherElement.parentNode != null) {
        document.body.removeChild(otherElement);
      }
    });

    test('status element remains in the document tree', async () => {
      const {statusElement} = loadingStatusAnnouncer;

      loadingStatusAnnouncer.registerInstance(element);

      expect(isInDocumentTree(statusElement)).to.be.equal(true);

      loadingStatusAnnouncer.registerInstance(otherElement);

      loadingStatusAnnouncer.unregisterInstance(element);
      document.body.removeChild(element);

      expect(isInDocumentTree(statusElement)).to.be.equal(true);
      document.body.removeChild(otherElement);
    });
  });
});
