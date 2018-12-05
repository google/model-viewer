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

import {Vector3} from 'three';

import {HAS_FULLSCREEN_API, HAS_WEBXR_DEVICE_API, HAS_WEBXR_HIT_TEST_API, IS_AR_CANDIDATE} from './constants.js';

export const deserializeUrl = (url) =>
    (url != null && url !== 'null') ? toFullUrl(url) : null;

export const assertIsArCandidate = () => {
  if (IS_AR_CANDIDATE) {
    return;
  }

  const missingApis = [];

  if (!HAS_FULLSCREEN_API) {
    missingApis.push('Fullscreen API');
  }

  if (!HAS_WEBXR_DEVICE_API) {
    missingApis.push('WebXR Device API');
  }

  if (!HAS_WEBXR_HIT_TEST_API) {
    missingApis.push('WebXR Hit Test API');
  }

  throw new Error(
      `The following APIs are required for AR, but are missing in this browser: ${
          missingApis.join(', ')}`);
};

/**
 * Converts a partial URL string to a fully qualified URL string.
 *
 * @param {String} url
 * @return {String}
 */
export const toFullUrl = (partialUrl) => {
  const url = new URL(partialUrl, window.location.toString());
  return url.toString();
};


export const debounce = (fn, ms) => {
  let timer = null;

  return (...args) => {
    if (timer != null) {
      self.clearTimeout(timer);
    }

    timer = self.setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
};


/**
 * Takes a URL to a USDZ file and sets the appropriate
 * fields so that Safari iOS can intent to their
 * AR Quick Look.
 *
 * @param {String} url
 */
export const openIOSARQuickLook = url => {
  const anchor = document.createElement('a');
  anchor.setAttribute('rel', 'ar');
  anchor.setAttribute('href', url);
  anchor.appendChild(document.createElement('img'));
  anchor.click();
};


/**
 * This helper analyzes the layout of the current page to decide if we should
 * use the natural device pixel ratio, or a capped value.
 *
 * We cap DPR if there is no meta viewport (suggesting that user is not
 * consciously specifying how to scale the viewport relative to the device
 * screen size).
 *
 * The rationale is that this condition typically leads to a pathological
 * outcome on mobile devices. When the window dimensions are scaled up on a
 * device with a high DPR, we create a canvas that is much larger than
 * appropriate to accomodate for the pixel density if we naively use the
 * reported DPR.
 *
 * This value needs to be measured in real time, as device pixel ratio can
 * change over time (e.g., when a user zooms the page). Also, in some cases
 * (such as Firefox on Android), the window's innerWidth is initially reported
 * as the same as the screen's availWidth but changes later.
 *
 * A user who specifies a meta viewport, thereby consciously creating scaling
 * conditions where <model-viewer> is slow, will be encouraged to live their
 * best life.
 */
export const resolveDpr = (() => {
  // The ratio we use for a "capped" scenario:
  const CAPPED_DEVICE_PIXEL_RATIO = 1;

  // If true, implies that the user is conscious of the viewport scaling
  // relative to the device screen size.
  const HAS_META_VIEWPORT_TAG = (() => {
    const metas = document.head != null ?
        Array.from(document.head.querySelectorAll('meta')) :
        [];

    for (const meta of metas) {
      if (meta.name === 'viewport') {
        return true;
      }
    }

    return false;
  })();

  if (!HAS_META_VIEWPORT_TAG) {
    console.warn(
        'No <meta name="viewport"> detected; <model-viewer> will cap pixel density at 1.');
  }

  return () => HAS_META_VIEWPORT_TAG ? window.devicePixelRatio :
                                       CAPPED_DEVICE_PIXEL_RATIO;
})();
