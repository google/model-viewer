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

import {MutateMessage, ThreeDOMMessageType} from '../protocol.js';

import {ModelGraft} from './api.js';

const $modelGraft = Symbol('modelGraft');
const $port = Symbol('port');

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

  constructor(modelGraft: ModelGraft, port: MessagePort) {
    this[$modelGraft] = modelGraft;
    this[$port] = port;
    this[$port].addEventListener('message', this[$onMessageEvent]);
    this[$port].start();
  }

  /**
   * Clean up internal state so that the ModelGraftManipulator can be properly
   * garbage collected.
   */
  dispose(): void {
    this[$port].removeEventListener('message', this[$onMessageEvent]);
    this[$port].close();
  }

  [$onMessageEvent] = async(event: MessageEvent): Promise<void> => {
    const {data} = event;
    if (data && data.type) {
      if (data.type === ThreeDOMMessageType.MUTATE) {
        let applied = false;
        const {mutationId} = data as MutateMessage;
        try {
          await this[$modelGraft].mutate(data.id, data.property, data.value);
          applied = true;
        } finally {
          this[$port].postMessage(
              {type: ThreeDOMMessageType.MUTATION_RESULT, applied, mutationId});
        }
      }
    }
  };
}
