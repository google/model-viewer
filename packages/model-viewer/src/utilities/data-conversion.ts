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

/**
 * Converts a base64 string which represents a data url
 * into a Blob of the same contents.
 */
export const dataUrlToBlob = async(base64DataUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const sliceSize = 512;
    const typeMatch = base64DataUrl.match(/data:(.*);/);

    if (!typeMatch) {
      return reject(new Error(`${base64DataUrl} is not a valid data Url`));
    }

    const type = typeMatch[1];
    const base64 = base64DataUrl.replace(/data:image\/\w+;base64,/, '');

    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    resolve(new Blob(byteArrays, {type}));
  });
};
