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
 * istributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * @fileoverview File to read and parse JSON arrayBuffer from glb/gltf files.
 */

import * as gltfSpec from './gltf_spec.js';

/**
 * GLTF File broken down into component parts.
 */

/* Binary extension */
const HEADER_MAGIC = 'glTF';
const HEADER_LENGTH = 12;
const CHUNK_TYPES = {
  JSON: 0x4E4F534A,  // Hex equiv of 'JSON' string
  BIN: 0x004E4942    // Hex equiv of 'BIN' string w/ 1 byte end padding
};
const CHUNK_SIZE = 4;

/**
 * Parses the bytes of a GLB file and returns it as a GltfModel.
 *
 * Note: we assume that the GLB is formatted exactly to the spec, i.e. no
 * padding between chunks that is not included in the chunkLength.
 */
export function unpackGlb(arrayBuffer: ArrayBuffer) {
  const headerDataView = new DataView(arrayBuffer, 0, HEADER_LENGTH);
  const textDecoder = new TextDecoder('utf8');

  const header = {
    headerMagic:
        textDecoder.decode(new Uint8Array(arrayBuffer.slice(0, CHUNK_SIZE))),
    currentVersion: headerDataView.getUint32(CHUNK_SIZE, true),
    fileLength: headerDataView.getUint32(CHUNK_SIZE * 2, true)
  };

  if (header.headerMagic !== HEADER_MAGIC) {
    throw new Error('GLTFBinary: Unsupported glTF-Binary header.');

  } else if (header.currentVersion < 2.0) {
    throw new Error('GLTFBinary: Legacy binary file detected.');
  }

  const chunkDataView = new DataView(arrayBuffer, HEADER_LENGTH);
  let chunkIndex = 0;

  let gltfJson: gltfSpec.GlTf;
  let gltfBuffer: ArrayBuffer|null;

  // Chunk 0 (JSON)
  const chunkLengthJSON = chunkDataView.getUint32(chunkIndex, true);
  chunkIndex += CHUNK_SIZE;
  const chunkTypeJSON = chunkDataView.getUint32(chunkIndex, true);
  chunkIndex += CHUNK_SIZE;
  if (chunkTypeJSON === CHUNK_TYPES.JSON) {
    const contentArray = new Uint8Array(
        arrayBuffer, HEADER_LENGTH + chunkIndex, chunkLengthJSON);

    const json = textDecoder.decode(contentArray);
    try {
      gltfJson = JSON.parse(json) as gltfSpec.GlTf;
    } catch (error) {
      throw new Error('GLTFBinary: invalid JSON content.');
    }
  } else {
    throw new Error('GLTFBinary: JSON content not found.');
  }
  chunkIndex += chunkLengthJSON;

  // Chunk 1 (Binary Buffer)
  const chunkLengthBin = chunkDataView.getUint32(chunkIndex, true);
  chunkIndex += CHUNK_SIZE;
  const chunkTypeBin = chunkDataView.getUint32(chunkIndex, true);
  chunkIndex += CHUNK_SIZE;
  if (chunkTypeBin === CHUNK_TYPES.BIN) {
    const offset = HEADER_LENGTH + chunkIndex;
    gltfBuffer = arrayBuffer.slice(offset, offset + chunkLengthBin);
  } else {
    gltfBuffer = null;
  }

  return {gltfJson, gltfBuffer};
}
