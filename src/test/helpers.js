/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

export const elementFromLocalPoint = (document, x, y) => {
  const host =
      (document === window.document) ? window.document.body : document.host;
  const actualDocument = window.ShadyCSS ? window.document : document;
  const boundingRect = host.getBoundingClientRect();

  return actualDocument.elementFromPoint(
      boundingRect.left + x, boundingRect.top + y);
};

export const pickShadowDescendant = (element, x = 0, y = 0) => {
  return elementFromLocalPoint(element.shadowRoot, x, y);
};

export const timePasses = (ms = 0) =>
    new Promise(resolve => setTimeout(resolve, ms));

export const until =
    async (predicate) => {
  while (!predicate()) {
    await timePasses();
  }
}

/**
 * @param {EventTarget} target
 * @param {string} eventName
 * @param {?Function} predicate
 */
export const waitForEvent = (target, eventName, predicate) =>
    new Promise(resolve => {
      function handler(e) {
        if (!predicate || predicate(e)) {
          resolve(e);
          target.removeEventListener(eventName, handler);
        }
      }
      target.addEventListener(eventName, handler);
    });
