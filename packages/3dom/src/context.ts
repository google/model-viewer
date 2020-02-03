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

import {ThreeDOMCapability} from './api.js';
import {ALLOWLISTED_GLOBALS} from './context/allowlist.js';
import {generateCapabilityFilter} from './context/capability-filter.js';
import {generateContextPatch} from './context/context-patch.js';
import {generateAPI} from './context/generate-api.js';
import {generateInitializer} from './context/initialize.js';
import {ThreeDOMMessageType} from './protocol.js';
import {ModelGraft as ThreeJSModelGraft} from './three/model-graft.js';

const ALL_CAPABILITIES: Array<ThreeDOMCapability> =
    ['messaging', 'material-properties'];

// TODO: Export an abstract interface for ModelGraft someday when we
// want to support multiple rendering backends
export type AnyModelGraft = ThreeJSModelGraft;

export const generateContextScriptSource =
    (capabilities: Array<ThreeDOMCapability> = ALL_CAPABILITIES) => {
      return `;(function() {
var ThreeDOMMessageType = ${JSON.stringify(ThreeDOMMessageType)};

var preservedContext = {
  postMessage: self.postMessage.bind(self),
  addEventListener: self.addEventListener.bind(self),
  importScripts: self.importScripts.bind(self)
};

${generateContextPatch(ALLOWLISTED_GLOBALS)}
${generateAPI()}
${generateCapabilityFilter(capabilities)}
${generateInitializer()}

initialize.call(self, ModelKernel, preservedContext);

})();`;
    };


const $worker = Symbol('worker');
const $workerInitializes = Symbol('workerInitializes');
const $modelGraftManipulator = Symbol('modelGraftManipulator');

export class ThreeDOMExecutionContext {
  protected[$worker]: Worker;
  protected[$workerInitializes]: Promise<MessagePort>;
  protected[$modelGraftManipulator]: ModelGraftManipulator|null = null;

  constructor(capabilities: Array<ThreeDOMCapability>) {
    const contextScriptSource = generateContextScriptSource(capabilities);
    const url = URL.createObjectURL(
        new Blob([contextScriptSource], {type: 'text/javascript'}));

    this[$worker] = new Worker(url);
    this[$workerInitializes] = new Promise<MessagePort>((resolve) => {
      const {port1, port2} = new MessageChannel();
      const onMessageEvent = (event: MessageEvent) => {
        if (event.data &&
            event.data.type === ThreeDOMMessageType.CONTEXT_INITIALIZED) {
          port1.removeEventListener('message', onMessageEvent);
          resolve(port1);
        }
      };

      this[$worker].postMessage({type: ThreeDOMMessageType.HANDSHAKE}, [port2]);

      port1.addEventListener('message', onMessageEvent);
      port1.start();
    });
  }

  async changeModel(modelGraft: AnyModelGraft|null): Promise<void> {
    const port = await this[$workerInitializes];
    const {port1, port2} = new MessageChannel();

    port.postMessage(
        {
          type: ThreeDOMMessageType.MODEL_CHANGED,
          model: modelGraft != null ? modelGraft.toJSON() : null
        },
        [port2]);

    if (this[$modelGraftManipulator] != null) {
      this[$modelGraftManipulator]!.dispose();
    }

    if (modelGraft != null) {
      this[$modelGraftManipulator] =
          new ModelGraftManipulator(modelGraft, port1);
    }
  }

  async eval(scriptSource: string): Promise<void> {
    console.log('Eval:', scriptSource);
    const port = await this[$workerInitializes];
    const url =
        URL.createObjectURL(new Blob([scriptSource], {type: 'text/javascript'}))
    console.log('Posting eval url', url);
    port.postMessage({type: ThreeDOMMessageType.IMPORT_SCRIPT, url});
  }

  async terminate() {
    this[$worker].terminate();

    if (this[$modelGraftManipulator] != null) {
      this[$modelGraftManipulator]!.dispose();
      this[$modelGraftManipulator] = null;
    }

    const port = await this[$workerInitializes];
    port.close();
  }
}

const $modelGraft = Symbol('modelGraft');
const $port = Symbol('port');
const $mutate = Symbol('mutate');

const $messageEventHandler = Symbol('messageEventHandler');
const $onMessageEvent = Symbol('onMessageEvent');

class ModelGraftManipulator {
  protected[$port]: MessagePort;
  protected[$modelGraft]: AnyModelGraft;

  protected[$messageEventHandler] = (event: MessageEvent) =>
      this[$onMessageEvent](event);

  constructor(modelGraft: AnyModelGraft, port: MessagePort) {
    this[$modelGraft] = modelGraft;
    this[$port] = port;
    this[$port].addEventListener('message', this[$messageEventHandler]);
    this[$port].start();
  }

  dispose() {
    this[$port].removeEventListener('message', this[$messageEventHandler]);
    this[$port].close();
  }

  [$onMessageEvent](event: MessageEvent) {
    const {data} = event;
    if (data && data.type) {
      if (data.type === ThreeDOMMessageType.MUTATE) {
        this[$mutate](data.id, data.property, data.value);
      }
    }
  }

  [$mutate](id: number, property: string, value: any) {
    const node = this[$modelGraft].getNodeByInternalId(id);
    if (node != null && property in node) {
      (node as any)[property] = value;
    }
  }
}