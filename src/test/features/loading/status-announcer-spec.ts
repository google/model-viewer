/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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
import {assetPath, isInDocumentTree, until, waitForEvent} from '../../helpers.js';

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
    suite('that has a src', () => {
      test('sets initial status', async () => {
        const element = new ModelViewerElement();
        element.poster = assetPath('Astronaut.png');
        element.src = assetPath('Astronaut.glb');

        loadingStatusAnnouncer.registerInstance(element);

        await waitForEvent(loadingStatusAnnouncer, 'initial-status-announced');

        const {statusElement} = loadingStatusAnnouncer;

        expect(statusElement.textContent)
            .to.be.equal(INITIAL_STATUS_ANNOUNCEMENT);
      });

      suite('after the model loads', () => {
        test('sets the finished status', async () => {
          const element = new ModelViewerElement();
          element.src = assetPath('Astronaut.glb');

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
        test('sets finished status when all models are loaded', async () => {
          const elementOne = new ModelViewerElement();
          const elementTwo = new ModelViewerElement();

          elementOne.src = elementTwo.src = assetPath('Astronaut.glb');

          loadingStatusAnnouncer.registerInstance(elementOne);
          loadingStatusAnnouncer.registerInstance(elementTwo);

          await Promise.all([
            until(() => elementOne.loaded && elementTwo.loaded),
            waitForEvent(loadingStatusAnnouncer, 'finished-loading-announced')
          ]);

          const {statusElement} = loadingStatusAnnouncer;

          expect(statusElement.textContent)
              .to.be.equal(FINISHED_LOADING_ANNOUNCEMENT);
        });

        suite('one model is already loaded', () => {
          test('eventually sets finished status', async () => {
            const elementOne = new ModelViewerElement();
            const elementTwo = new ModelViewerElement();

            elementOne.src = assetPath('Astronaut.glb');

            await until(() => elementOne.loaded);

            elementTwo.src = assetPath('Astronaut.glb');

            loadingStatusAnnouncer.registerInstance(elementOne);
            loadingStatusAnnouncer.registerInstance(elementTwo);

            await Promise.all([
              until(() => elementTwo.loaded),
              waitForEvent(loadingStatusAnnouncer, 'finished-loading-announced')
            ]);

            const {statusElement} = loadingStatusAnnouncer;

            expect(statusElement.textContent)
                .to.be.equal(FINISHED_LOADING_ANNOUNCEMENT);
          });
        });

        suite('one model fails', () => {
          test('eventually sets finished status', async () => {
            const elementOne = new ModelViewerElement();
            const elementTwo = new ModelViewerElement();

            const errorOccurs = waitForEvent(elementOne, 'error');

            elementOne.src = assetPath('DOES_NOT_EXIST.glb');
            elementTwo.src = assetPath('Astronaut.glb');

            loadingStatusAnnouncer.registerInstance(elementOne);
            loadingStatusAnnouncer.registerInstance(elementTwo);

            await Promise.all([
              errorOccurs,
              until(() => elementTwo.loaded),
              waitForEvent(loadingStatusAnnouncer, 'finished-loading-announced')
            ]);

            const {statusElement} = loadingStatusAnnouncer;

            expect(statusElement.textContent)
                .to.be.equal(FINISHED_LOADING_ANNOUNCEMENT);
          });
        });

        suite('first element is removed', () => {
          test('status element remains in the document tree', async () => {
            // NOTE(cdata): We use ModelViewerElementBase here because we are
            // testing behavior that is affected by connected/disconnected
            // side-effects in LoadingMixin.
            const elementOne = new ModelViewerElementBase();
            const elementTwo = new ModelViewerElementBase();

            document.body.appendChild(elementOne);
            document.body.appendChild(elementTwo);

            const {statusElement} = loadingStatusAnnouncer;

            loadingStatusAnnouncer.registerInstance(elementOne);

            expect(isInDocumentTree(statusElement)).to.be.equal(true);

            loadingStatusAnnouncer.registerInstance(elementTwo);

            loadingStatusAnnouncer.unregisterInstance(elementOne);
            document.body.removeChild(elementOne);

            expect(isInDocumentTree(statusElement)).to.be.equal(true);
            document.body.removeChild(elementTwo);
          });
        });
      });
    });
  });
});
