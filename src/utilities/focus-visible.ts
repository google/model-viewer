/* @license
 * Copyright 2018 Google LLC. All Rights Reserved.
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
import {Constructor} from '../utilities.js';

export interface OptionalLifecycleCallbacks {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
}

export type MixableBaseClass = HTMLElement&OptionalLifecycleCallbacks;

type EndPolyfillCoordinationCallback = () => void;

/**
 * This mixin function is designed to be applied to a class that inherits
 * from HTMLElement. It makes it easy for a custom element to coordinate with
 * the :focus-visible polyfill.
 *
 * NOTE(cdata): The code here was adapted from an example proposed with the
 * introduction of ShadowDOM support in the :focus-visible polyfill.
 *
 * @see https://github.com/WICG/focus-visible/pull/196
 * @param {Function} SuperClass The base class implementation to decorate with
 * implementation that coordinates with the :focus-visible polyfill
 */
export const FocusVisiblePolyfillMixin =
    <T extends Constructor<MixableBaseClass>>(SuperClass: T): T => {
      const coordinateWithPolyfill =
          (instance: MixableBaseClass): EndPolyfillCoordinationCallback => {
            // If there is no shadow root, there is no need to coordinate with
            // the polyfill. If we already coordinated with the polyfill, we can
            // skip subsequent invokcations:
            if (instance.shadowRoot == null ||
                instance.hasAttribute('data-js-focus-visible')) {
              return () => {};
            }

            // The polyfill might already be loaded. If so, we can apply it to
            // the shadow root immediately:
            if ((self as any).applyFocusVisiblePolyfill) {
              (self as any).applyFocusVisiblePolyfill(instance.shadowRoot);
            } else {
              const coordinationHandler = () => {
                (self as any).applyFocusVisiblePolyfill(instance.shadowRoot);
              };
              // Otherwise, wait for the polyfill to be loaded lazily. It might
              // never be loaded, but if it is then we can apply it to the
              // shadow root at the appropriate time by waiting for the ready
              // event:
              self.addEventListener(
                  'focus-visible-polyfill-ready',
                  coordinationHandler,
                  {once: true});

              return () => {
                self.removeEventListener(
                    'focus-visible-polyfill-ready', coordinationHandler);
              };
            }

            return () => {};
          };

      const $endPolyfillCoordination = Symbol('endPolyfillCoordination');

      // IE11 doesn't natively support custom elements or JavaScript class
      // syntax The mixin implementation assumes that the user will take the
      // appropriate steps to support both:
      class FocusVisibleCoordinator extends SuperClass {
        private[$endPolyfillCoordination]: EndPolyfillCoordinationCallback|
            null = null;
        // Attempt to coordinate with the polyfill when connected to the
        // document:
        connectedCallback() {
          super.connectedCallback && super.connectedCallback();
          if (this[$endPolyfillCoordination] == null) {
            this[$endPolyfillCoordination] = coordinateWithPolyfill(this);
          }
        }

        disconnectedCallback() {
          super.disconnectedCallback && super.disconnectedCallback();
          // It's important to remove the polyfill event listener when we
          // disconnect, otherwise we will leak the whole element via window:
          if (this[$endPolyfillCoordination] != null) {
            this[$endPolyfillCoordination]!();
            this[$endPolyfillCoordination] = null;
          }
        }
      };

      return FocusVisibleCoordinator;
    };