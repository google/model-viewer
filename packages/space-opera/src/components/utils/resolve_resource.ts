/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

/** Resolves a glTF resource URI against the files in an uploaded directory. */
export function resolveUploadedFile(
    uri: string, rootPath: string, fileMap: Map<string, File>): File|undefined {
  if (fileMap.size === 0 || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(uri)) {
    return undefined;
  }
  try {
    const rootURL = new URL(
        rootPath.split('/').map(encodeURIComponent).join('/'),
        window.location.origin);
    const path = decodeURIComponent(new URL(uri, rootURL).pathname);
    return fileMap.get(rootPath.startsWith('/') ? path : path.slice(1));
  } catch {
    return undefined;
  }
}

/** Loads a resource from an uploaded directory or its original URL. */
export async function resolveExternalResource(
    uri: string, rootPath: string, fileMap: Map<string, File>):
    Promise<Uint8Array> {
  const file = resolveUploadedFile(uri, rootPath, fileMap);
  if (file) {
    return new Uint8Array(await file.arrayBuffer());
  }
  const response =
      await fetch(new URL(uri, new URL(rootPath, window.location.href)));
  return new Uint8Array(await response.arrayBuffer());
}
