/**
 * @license
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
 *
 */

/**
 * Use this type when you need to store safe object URLs. And then when you need
 * the actual url, just access the .url member.
 */
export class SafeObjectUrl {
  constructor(readonly url: string) {
  }
  get unsafeUrl(): string {
    return this.url;
  }
}

/**
 * Returns a SafeUrl, for google3-specific lit-html checks which require them.
 */
export function createSafeObjectURL(blob: Blob): SafeObjectUrl {
  return new SafeObjectUrl(URL.createObjectURL(blob));
}

/** Returns true if the given raw URL is an object URL. */
export function isObjectUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'blob:';
  } catch (_) {
    return false;
  }
}

/**
 * Sanitizes an unsafe URI into a safe one, assuming it points to a supported
 * type (such as an image).
 */
export async function createSafeObjectUrlFromUnsafe(unsafeUri: string):
    Promise<SafeObjectUrl> {
  return new SafeObjectUrl(unsafeUri);
}

/**
 * This should only be used when you don't care what the blob type is. For
 * example, when loading GLBs directly via modelviewer.src.
 */
export function createSafeObjectUrlFromArrayBuffer(contents: ArrayBuffer) {
  return createSafeObjectURL(new Blob([new Uint8Array(contents)]));
}

/**
 * Return a closure which will initiate download of the given blob
 */
// Underscore var name needed for NPM build
// tslint:disable-next-line:enforce-name-casing
export function safeDownloadCallback(blob: Blob, filename: string) {
  return () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 250);
  };
}