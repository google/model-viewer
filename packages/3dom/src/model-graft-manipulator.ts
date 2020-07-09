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

import {ModelGraft} from './facade/api.js';
import {MutateMessage, ThreeDOMMessageType} from './protocol.js';

const $modelGraft = Symbol('modelGraft');
const $port = Symbol('port');

const $messageEventHandler = Symbol('messageEventHandler');
const $onMessageEvent = Symbol('onMessageEvent');

/**
 * A ModelGraftManipulator is an internal construct intended to consolidate
 * any mutations that operate on the backing scene graph. It can be thought
 * of as a host execution context counterpart to the ModelKernel in the scene
 * graph execution context.
 */
export class ModelGraftManipulator {
  protected[$port]: MessagePort;
  protected[$modelGraft]: ModelGraft;

  protected[$messageEventHandler] = (event: MessageEvent) =>
      this[$onMessageEvent](event);

  constructor(modelGraft: ModelGraft, port: MessagePort) {
    this[$modelGraft] = modelGraft;
    this[$port] = port;
    this[$port].addEventListener('message', this[$messageEventHandler]);
    this[$port].start();
  }

  /**
   * Clean up internal state so that the ModelGraftManipulator can be properly
   * garbage collected.
   */
  dispose() {
    this[$port].removeEventListener('message', this[$messageEventHandler]);
    this[$port].close();
  }

  [$onMessageEvent](event: MessageEvent) {
    const {data} = event;
    if (data && data.type) {
      if (data.type === ThreeDOMMessageType.MUTATE) {
        let applied = false;
        const {mutationId} = data as MutateMessage;
        try {
          this[$modelGraft].mutate(data.id, data.property, data.value);
          applied = true;
        } finally {
          this[$port].postMessage(
              {type: ThreeDOMMessageType.MUTATION_RESULT, applied, mutationId});
        }
      }
    }
  }
}
