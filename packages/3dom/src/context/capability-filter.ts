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

import {ThreeDOMCapability, ThreeDOMGlobalScope} from '../api.js';

function filterMaterialProperties(this: ThreeDOMGlobalScope) {
  const errorMessage = 'Capability "material-properties" not allowed';

  Object.defineProperty(this.PBRMetallicRoughness, 'setBaseColorFactor', {
    value: () => Promise.reject(new Error(errorMessage)),
    configurable: false,
    writable: false
  });
}

function filterMessaging(this: ThreeDOMGlobalScope) {
  const errorMessage = 'Capability "messaging" not allowed';
  const rejectInvocation = () => {
    throw new Error(errorMessage);
  };
  const originalAddEventListener = this.addEventListener;

  Object.defineProperties(this, {
    postMessage: {value: rejectInvocation, configurable: false},
    MessageChannel: {value: rejectInvocation, configurable: false},
    onmessage: {
      set() {
        rejectInvocation();
      },
      configurable: false,
    },
    addEventListener: {
      value: function(
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean|AddEventListenerOptions) {
        if (type === 'message') {
          rejectInvocation();
        }
        originalAddEventListener.call(this, type, listener, options);
      },
      configurable: false
    }
  });
}

type CapabilityFilterMap = {
  [K in ThreeDOMCapability]: Function
};

const capabilityFilterMap: CapabilityFilterMap = {
  'messaging': filterMessaging,
  'material-properties': filterMaterialProperties
};

export const generateCapabilityFilter =
    (capabilities: Array<ThreeDOMCapability>): string => {
      const capabilityFilters: Array<string> = [];
      for (const capability of capabilities) {
        const filter = capabilityFilterMap[capability];
        capabilityFilters.push(`(${filter.toString()}).call(self);`);
      }

      return capabilityFilters.join('\n');
    };