/**
 * @license
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
 *
 */

/**
 * @fileoverview This provides a messaging interface manipulating the previewed
 * model.
 */

import {Model, RGBA} from './three_dom.js';

interface MessageEventData {
  action: string;
  payload: unknown;
}

interface MessageEvent extends Event {
  data: MessageEventData;
}

interface SetBaseColorFactorPayload {
  materialIndex: number;
  factor: RGBA;
}

interface ModelChangeEvent extends Event {
  model: Model;
}

// These events will be used to communicate with model-viewer. See the full
// example: https://modelviewer.dev/examples/scene-graph.html
interface WorkletContext {
  addEventListener(
      type: 'model-change', listener: (event: ModelChangeEvent) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void):
      void;
}

const worklet = self as WorkletContext;

worklet.addEventListener('model-change', (event: ModelChangeEvent) => {
  const model = event.model;

  worklet.addEventListener('message', (event) => {
    try {
      switch (event.data.action) {
        case 'set-base-color-factor':
          const payload = event.data.payload as SetBaseColorFactorPayload;
          model.materials[payload.materialIndex]
              .pbrMetallicRoughness.setBaseColorFactor(payload.factor);
          break;
        default:
          throw new Error(`Unknown message action: ${event.data.action}`);
      }
    } catch (e) {
      throw new Error(`Failed to handle event with data: ${
          JSON.stringify(event.data)}. Error: ${e.message}`);
    }
  });
});
