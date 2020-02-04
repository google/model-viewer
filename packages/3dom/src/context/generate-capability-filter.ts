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

import {ThreeDOMCapability, ThreeDOMGlobalScope} from '../api.js';

/**
 * Given a 3DOM execution context, patch any methods that give write access
 * to otherwise configurable material properties so that they are automatically
 * rejected when invoked.
 */
function filterMaterialProperties(this: ThreeDOMGlobalScope) {
  const errorMessage = 'Capability "material-properties" not allowed';

  Object.defineProperty(this.PBRMetallicRoughness, 'setBaseColorFactor', {
    value: () => Promise.reject(new Error(errorMessage)),
    configurable: false,
    writable: false
  });
}

/**
 * Given a 3DOM execution context, patch any methods, classes or other APIs
 * related to Web Messaging so that they throw or are otherwise rendered
 * impotent.
 */
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

/**
 * Given a 3DOM execution context, patch the global Fetch API so that any
 * attempts to perform network operations are immediately rejected.
 */
function filterFetch(this: ThreeDOMGlobalScope) {
  Object.defineProperties(this, {
    fetch: {
      value: () => {
        return Promise.reject(new Error('Capability "fetch" not allowed'));
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
  'material-properties': filterMaterialProperties,
  'fetch': filterFetch
};

/**
 * Given a list of 3DOM capability strings, this factory produces a script
 * fragment that patches the global execution context so that any omitted
 * capabilities are explicitly disallowed.
 */
export const generateCapabilityFilter =
    (capabilities: Readonly<Array<ThreeDOMCapability>>): string => {
      const filtersToApply =
          Object.keys(capabilityFilterMap) as Array<ThreeDOMCapability>;

      const capabilityFilters: Array<string> = [];

      for (const capability of filtersToApply) {
        // Skip filters that are allowed by the list of capabilities
        if (capabilities.indexOf(capability) > -1) {
          continue;
        }

        const filter = capabilityFilterMap[capability];
        capabilityFilters.push(`(${filter.toString()}).call(self);`);
      }

      return capabilityFilters.join('\n');
    };