/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {ThreeDOMExecutionContext} from './context.js';
import {ModelGraft} from './facade/three-js/model-graft.js';
import {createFakeGLTF, waitForEvent} from './test-helpers.js';

suite('context', () => {
  suite('ThreeDOMExecutionContext', () => {
    test('can evaluate script', async () => {
      const context = new ThreeDOMExecutionContext(['messaging']);

      try {
        const scriptEvaluates = new Promise((resolve) => {
          context.worker.addEventListener('message', (event) => {
            expect(event.data).to.be.equal('hello');
            resolve();
          }, {once: true});
        });

        context.eval('self.postMessage("hello")');

        await scriptEvaluates;
      } finally {
        if (context != null) {
          context.terminate();
        }
      }
    });

    suite('when the model changes', () => {
      test('dispatches an event in the worker', async () => {
        const modelGraft = new ModelGraft('', createFakeGLTF());
        const context = new ThreeDOMExecutionContext(['messaging']);
        const workerConfirmsEvent = waitForEvent(context.worker, 'message');

        context.eval(`
self.addEventListener('model-change', function() {
  self.postMessage('model-change-confirmed');
});`);
        context.changeModel(modelGraft);

        await workerConfirmsEvent;
      });
    });

    suite('capabilities', () => {
      test('disallows "messaging" by default', async () => {
        const context = new ThreeDOMExecutionContext([]);
        const errorDispatches =
            waitForEvent<ErrorEvent>(context.worker, 'error');

        context.eval('self.postMessage("hi")');
        const error = await errorDispatches;
        error.preventDefault();

        expect(error.message).to.match(/messaging/);
      });

      test('disallows "fetch" by default', async () => {
        const context = new ThreeDOMExecutionContext([]);
        const errorDispatches =
            waitForEvent<ErrorEvent>(context.worker, 'error');

        context.eval('self.fetch("/")');

        const error = await errorDispatches;
        error.preventDefault();

        expect(error.message).to.match(/fetch/);
      });

      test('disallows "material-properties" by default', async () => {
        const context = new ThreeDOMExecutionContext([]);
        const errorDispatches =
            waitForEvent<ErrorEvent>(context.worker, 'error');

        context.eval(
            'self.PBRMetallicRoughness.prototype.setBaseColorFactor()');

        const error = await errorDispatches;
        error.preventDefault();

        expect(error.message).to.match(/material-properties/);
      });
    });
  });
});
