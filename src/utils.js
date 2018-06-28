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

import { extname } from 'path';
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
export const relativeToAbsoluteURL = (function () {
  const anchor = document.createElement('a');
  return (url) => {
    anchor.href = url;
    return anchor.href;
  }
})();

/**
 * Takes a string of a filename, like "model.usdz",
 * and returns the MIME-type based off of the file extension.
 * Used as a backup if MIME-type isn't explicitly defined.
 *
 * @param {String} name
 * @return {?String}
 */
export const getTypeFromName = (name = '') => {
  const ext = extname(name).toLowerCase();

  switch (ext) {
    case '.glb':
      return 'model/gltf-binary';
    case '.gltf':
      return 'model/gltf+json';
    case '.usdz':
      return 'model/vnd.usd+zip';
    default:
      return undefined;
  }
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
  // and infer the type.
  const rootSrc = element.getAttribute('src');
  if (rootSrc) {
    const src = relativeToAbsoluteURL(rootSrc);
    const type = getTypeFromName(rootSrc);
    return { src, type };
  }

  const sources = element.querySelectorAll('source');

  let modelSrc;
  let modelType;
  for (let source of sources) {
    const src = source.getAttribute('src');
    const type = source.getAttribute('type') || getTypeFromName(src);

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
    src: relativeToAbsoluteURL(modelSrc),
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
      return relativeToAbsoluteURL(src);
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

export const isMobile = function() {
  let check = false;
  // eslint-disable-next-line
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

