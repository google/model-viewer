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

/*
import {ModelChangeEvent, ThreeDOMGlobalScope} from '../api.js';
import {ModelKernel} from '../api/model-kernel.js';
import {SerializedModelGraph, ThreeDOMMessageType} from '../protocol.js';

export interface PreservedContext {
 postMessage: typeof self.postMessage;
 addEventListener: typeof self.addEventListener;
 importScripts: (...scripts: Array<string>) => any;
}

function initialize(
   this: ThreeDOMGlobalScope,
   ModelKernel: Constructor<ModelKernel>,
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
           case ThreeDOMMessageType.MODEL_CHANGED:
             const previousModel =
                 currentKernel != null ? currentKernel.model : undefined;
             const serialized: SerializedModelGraph|null = data.model;
             const port = event.ports[0];

             // TODO
             // currentKernel.dispose();

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
           case ThreeDOMMessageType.IMPORT_SCRIPT:
             const url = data.url as string;

             if (url) {
               preservedContext.importScripts(url);
             }

             break;
         }
       }
     });
     globalPort.start();

     console.log('Posting handshake response');
     globalPort.postMessage({type: ThreeDOMMessageType.CONTEXT_INITIALIZED});
   }
 });
}

export const generateInitializer = () => initialize.toString();
*/