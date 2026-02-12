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

// NOTE(cdata): The HAS_WEBXR_* constants can be enabled in Chrome by turning on
// the appropriate flags. However, just because we have the API does not
// guarantee that AR will work.

import { UAParser } from 'ua-parser-js';

const { browser, os } = UAParser();

export const IS_ANDROID = os.is('android');
export const IS_IOS = os.is('ios');
export const IS_CHROMEOS = os.is('chrome os') || os.is('chromium os');
export const IS_FIREFOX = browser.is('firefox');
export const IS_SAFARI = browser.is('safari');
export const IS_OCULUS = browser.is('oculus browser');
export const IS_IOS_CHROME = IS_IOS && browser.is('chrome');
export const IS_IOS_SAFARI = IS_IOS && IS_SAFARI;

export const IS_MOBILE = IS_ANDROID || IS_IOS;

export const IS_SCENEVIEWER_CANDIDATE = IS_ANDROID && !IS_FIREFOX && !IS_OCULUS;

export const HAS_WEBXR_DEVICE_API = navigator.xr != null &&
  (self as any).XRSession != null && navigator.xr.isSessionSupported != null;

export const HAS_WEBXR_HIT_TEST_API = HAS_WEBXR_DEVICE_API &&
  (self as any).XRSession.prototype.requestHitTestSource != null;

export const HAS_RESIZE_OBSERVER = typeof ResizeObserver !== 'undefined';

export const HAS_INTERSECTION_OBSERVER =
  typeof IntersectionObserver !== 'undefined';

export const IS_WEBXR_AR_CANDIDATE = HAS_WEBXR_HIT_TEST_API;

declare global {
  interface Window {
    webkit?: any;
  }
}

export const IS_WKWEBVIEW = !!(window.webkit && window.webkit.messageHandlers);

export const IS_AR_QUICKLOOK_CANDIDATE = (() => {
  if (IS_IOS && !IS_WKWEBVIEW) {
    const tempAnchor = document.createElement('a');
    return Boolean(
      tempAnchor.relList && tempAnchor.relList.supports &&
      tempAnchor.relList.supports('ar'));
  }
  return false;
})();