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

import { Box3, Vector3 } from 'three';

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
 * Takes a relative URL, like 'assets/file.glb'
 * or '../../file.usdz' and converts it to an absolute
 * link, since our <source> `src` attributes do not
 * handle this for us automatically.
 *
 * @param {String} url
 * @return {String}
 */
export const relativeToAbsoluteLink = url => {
  const anchor = document.createElement('a');
  anchor.href = url;
  return anchor.href;
};

/**
 * Return a URL for the closest match for a three.js-loadable
 * 3D model using an element's <source> children.
 *
 * @param {HTMLElement} element
 * @return {Object}
 */
export const getModelSource = element => {
  // If the <xr-model> has a `src` attribute, use that,
  // and infer the type later
  const rootSrc = element.getAttribute('src');
  if (rootSrc) {
    return { src: rootSrc };
  }

  const sources = element.querySelectorAll('source');

  let modelSrc, modelType;
  for (let source of sources) {
    const src = source.getAttribute('src');
    const type = source.getAttribute('type');

    switch (type) {
      case 'model/gltf-binary':
      case 'model/gltf+json':
        if (!modelSrc) {
          modelType = type;
          modelSrc = src;
        }
        break;
    }

    if (modelSrc) {
      break;
    }
  }

  return {
    src: relativeToAbsoluteLink(modelSrc),
    type: modelType,
  };
};

/**
 * Return a URL for the closest match for a loadable
 * USDZ 3D model using an element's <source> children
 * for displaying in AR Quick Look on iOS Safari.
 *
 * @param {HTMLElement} element
 * @return {?string}
 */
export const getUSDZSource = element => {
  const sources = element.querySelectorAll('source');

  for (let source of sources) {
    const src = source.getAttribute('src');
    const type = source.getAttribute('type');

    if (src && type === 'model/vnd.usd+zip') {
      return relativeToAbsoluteLink(src);
    }
  }
};

/**
 * Takes a size limit and an object and sets the scale
 * such that it is as large as it can be within a bounding
 * box of (limit)x(limit)x(limit) dimensions.
 *
 * @param {number} limit
 * @param {Object3D} object
 */
export const setScaleFromLimit = (function() {
  const box = new Box3();
  const size = new Vector3();
  return (limit, object) => {
    box.setFromObject(object);
    box.getSize(size);

    const max = Math.max(size.x, size.y, size.z);
    const scale = limit / max;
    if (!Number.isNaN(scale) && Number.isFinite(scale)) {
      object.scale.multiplyScalar(scale, scale, scale);
    }
  };
})();

