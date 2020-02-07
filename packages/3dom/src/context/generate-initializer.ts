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

import {ModelChangeEvent, ThreeDOMGlobalScope} from '../api.js';
import {ModelKernel, ModelKernelConstructor} from '../api/model-kernel.js';
import {SerializedModel, ThreeDOMMessageType} from '../protocol.js';

/**
 * The "preserved" context includes the original native implementations
 * of key APIs required to support cross-context communication and allowed
 * forms of otherwise unsafe script execution.
 *
 * These APIs are presumed to be patched by the surrounding execution context
 * script, and so unpatched versions are required by the initializer.
 */
export interface PreservedContext {
  postMessage: typeof self.postMessage;
  addEventListener: typeof self.addEventListener;
  importScripts: (...scripts: Array<string>) => unknown;
}


/**
 * A function that will be stringified and appended the a runtime-generated
 * execution context script to initialize the scene graph execution context.
 *
 * The sole reason for using this pattern is to enable sound type
 * checking while also providing for the ability to stringify the factory so
 * that it can be part of a runtime-generated Worker script.
 */
function initialize(
    this: ThreeDOMGlobalScope,
    ModelKernel: ModelKernelConstructor,
    preservedContext: PreservedContext) {
  let currentKernel: ModelKernel|null = null;

  preservedContext.addEventListener('message', (event: MessageEvent) => {
    const {data} = event;

    if (data && data.type && data.type === ThreeDOMMessageType.HANDSHAKE) {
      const globalPort = event.ports[0];

      globalPort.addEventListener('message', (event: MessageEvent) => {
        const {data} = event;
        if (data && data.type) {
          switch (data.type) {
            // Instantiate a new ModelKernel, and notify the execution context
            // of the new Model with a 'model-change' event:
            case ThreeDOMMessageType.MODEL_CHANGED: {
              const previousModel =
                  currentKernel != null ? currentKernel.model : undefined;
              const serialized: SerializedModel|null = data.model;
              const port = event.ports[0];

              if (currentKernel != null) {
                currentKernel.deactivate();
              } else if (serialized == null) {
                // Do not proceed if transitioning from null to null
                break;
              }

              if (serialized != null) {
                currentKernel = new ModelKernel(port, serialized);
                this.model = currentKernel.model;
              } else {
                currentKernel = null;
                this.model = undefined;
              }

              const modelChangeEvent: Partial<ModelChangeEvent> =
                  new Event('model-change');

              modelChangeEvent.previousModel = previousModel;
              modelChangeEvent.model = this.model;

              this.dispatchEvent(modelChangeEvent as ModelChangeEvent);

              break;
            }
            // Import an external script into the execution context:
            case ThreeDOMMessageType.IMPORT_SCRIPT: {
              const url = data.url as string;

              if (url) {
                preservedContext.importScripts(url);
              }

              break;
            }
          }
        }
      });

      globalPort.start();

      // Notify the host execution context that the scene graph execution
      // is ready:
      globalPort.postMessage({type: ThreeDOMMessageType.CONTEXT_INITIALIZED});
    }
  });
}

/**
 * A factory that produces a stringified initializer function.
 */
export const generateInitializer = () => initialize.toString();
