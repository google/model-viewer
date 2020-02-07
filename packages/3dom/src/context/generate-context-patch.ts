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

import {ALLOWLISTED_GLOBALS} from './allowlist.js';

/**
 * Adapted from WorkerDOM
 * TODO: The context could also be DedicatedWorkerGlobalScope, but the
 * TypeScript WebWorker lib seems to conflict with the dom lib
 *
 * @see https://github.com/ampproject/worker-dom/blob/master/src/worker-thread/index.amp.ts
 */
function patchContext(context: {}, allowList: typeof ALLOWLISTED_GLOBALS) {
  // Crawl up the prototype chain until we get to EventTarget so that we
  // don't go overboard deleting fundamental properties of things:
  while (context && context.constructor !== EventTarget) {
    Object.getOwnPropertyNames(context).forEach((property) => {
      // eslint-disable-next-line no-prototype-builtins
      if (allowList.hasOwnProperty(property) && allowList[property] === true) {
        // Skip allowed property
        return;
      }

      try {
        delete (context as {[index: string]: unknown})[property];
      } catch (e) {
        console.warn(e);
      }
    });

    context = Object.getPrototypeOf(context);
  }
}

/**
 * Given an "allow" list that maps context property names to booleans (true for
 * allowed, false for disallowed), this factory produces a script chunk that
 * can patch the global context so that only allowed properties/APIs are
 * available.
 *
 * Disallowed properties are deleted on the global context and its prototype
 * chain. Omiting a property from the allow list is tantamount to disallowing
 * it.
 */
export const generateContextPatch = (allowList: {[index: string]: boolean}) =>
    `(${patchContext.toString()})(self, ${JSON.stringify(allowList)});`;
