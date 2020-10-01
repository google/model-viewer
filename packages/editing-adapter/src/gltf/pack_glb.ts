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
 * @fileoverview Utilities for manipulating the gltf file.
 */

import {cloneJson} from '../util/clone_json.js';
import {isObjectUrl} from '../util/create_object_url.js';

import * as gltfSpec from './gltf_spec.js';

const HEADER_LENGTH = 12;
const HEADER_MAGIC = 'glTF';
const JSON_CHUNKTYPE = 'JSON';
const CHUNK_HEADER_LENGTH = 8;

/** Pads the given length to the nearest greater multiple of 4 */
export function dwordAlign(byteLength: number) {
  return Math.ceil(byteLength / 4) * 4;
}

class GltfBufferWriter {
  constructor(
      readonly root: gltfSpec.GlTf, readonly bufferIndex: number,
      readonly buffer: Uint8Array, private writeOffset: number) {
  }

  // Returns the index of the corresponding bufferView.
  writeChunk(chunkBuffer: ArrayBuffer): number {
    if (this.writeOffset + chunkBuffer.byteLength > this.buffer.length) {
      throw new Error(
          `Not enough space in the given buffer to write the chunkBuffer`);
    }

    this.buffer.set(new Uint8Array(chunkBuffer), this.writeOffset);

    if (!this.root.bufferViews) {
      this.root.bufferViews = [];
    }

    // Create the bufferView
    this.root.bufferViews.push({
      buffer: this.bufferIndex,
      byteOffset: this.writeOffset,
      byteLength: chunkBuffer.byteLength,
    });

    this.writeOffset += chunkBuffer.byteLength;

    return this.root.bufferViews.length - 1;
  }
}

/**
 * Creates a GLB as an ArrayBuffer.
 *
 * NOTE: We don't do any de-duping here, so if two image objects have the same
 * URI, some binary space will be wasted. We'll leave that as a responsibility
 * for GltfModel itself.
 */
export async function packGlb(
    root: gltfSpec.GlTf, buffer: ArrayBuffer|null): Promise<ArrayBuffer> {
  // Create a copy, because we may be modifying it.
  const json = cloneJson(root);

  let packedBufferId = json.buffers?.findIndex(buf => buf.uri === undefined);
  if (packedBufferId === -1)
    packedBufferId = undefined;
  if (buffer && packedBufferId === undefined) {
    throw new Error(
        `Given GLTF had a packed buffer but no buffer object with undefined uri!`);
  }

  // We want our GLB to be stand-alone, so we need to fetch the content of any
  // object URLs, which are only valid for a document's life time.
  const blobsByImage = new Map<gltfSpec.Image, Blob>();
  let extraImageBytes = 0;
  for (const image of (json.images ?? [])) {
    if (image.uri && isObjectUrl(image.uri)) {
      const blob = await (await fetch(image.uri)).blob();
      blobsByImage.set(image, blob);
      extraImageBytes += blob.size;
    }
  }

  const origBuffer = new Uint8Array(buffer ?? new ArrayBuffer(0));
  const packedBuffer = new Uint8Array(origBuffer.length + extraImageBytes);

  packedBuffer.set(origBuffer);

  if (blobsByImage.size > 0) {
    // Update or create the packed buffer.
    json.buffers = json.buffers ?? [];
    if (packedBufferId === undefined) {
      packedBufferId = json.buffers.length;
      json.buffers.push({byteLength: packedBuffer.length});
    } else {
      json.buffers[packedBufferId].byteLength = packedBuffer.length;
    }

    const writer = new GltfBufferWriter(
        json, packedBufferId, packedBuffer, origBuffer.length);

    for (const [image, blob] of blobsByImage) {
      // Write the image contents and update the image object
      const viewIndex = writer.writeChunk(await blob.arrayBuffer());
      delete image.uri;
      image.bufferView = viewIndex;
      image.mimeType = blob.type;
    }
  }

  const jsonString = JSON.stringify(json);
  const fileLength = dwordAlign(jsonString.length) +
      dwordAlign(packedBuffer.byteLength) + HEADER_LENGTH +
      (CHUNK_HEADER_LENGTH * 2);
  const glbBuffer = new ArrayBuffer(fileLength);
  createHeader(glbBuffer, Number(root.asset.version));
  // createJSON returns the offset which it writes the JSON up to, i.e. the
  // offset where the binary data should start.
  const packedBufferOffset = createJSON(glbBuffer, jsonString);
  if (packedBuffer.length > 0) {
    createBinaryBuffer(glbBuffer, packedBuffer.buffer, packedBufferOffset);
  }
  return glbBuffer;
}

/**
 * Create GLTF header.
 */
export function createHeader(
    glbBuffer: ArrayBuffer,
    version: number,
    headerMagic: string = HEADER_MAGIC): number {
  const headerDataView = new DataView(glbBuffer, 0, HEADER_LENGTH);
  writeStringToDataView(headerDataView, 0, headerMagic);
  headerDataView.setUint32(4, version, true);
  headerDataView.setUint32(8, glbBuffer.byteLength, true);
  return HEADER_LENGTH;
}

/**
 * Create GLTF JSON.
 */
export function createJSON(
    glbBuffer: ArrayBuffer, json: string, chunkType: string = JSON_CHUNKTYPE):
    number {
  const jsonDataView = new DataView(glbBuffer, HEADER_LENGTH);
  const alignedLength = dwordAlign(json.length);
  jsonDataView.setUint32(0, alignedLength, true);
  writeStringToDataView(jsonDataView, 4, chunkType);
  writeStringToDataView(jsonDataView, 8, json);

  // Pad with space characters per-spec
  const spaceCode = ' '.charCodeAt(0);
  for (let i = json.length; i < alignedLength; i++) {
    jsonDataView.setUint8(8 + i, spaceCode);
  }

  return HEADER_LENGTH + CHUNK_HEADER_LENGTH + alignedLength;
}

/**
 * Create GLTF Binary Buffer.
 */
export function createBinaryBuffer(
    glbBuffer: ArrayBuffer, gltfBinaryBuffer: ArrayBuffer, offset: number) {
  const bufferDataView = new DataView(glbBuffer, offset);
  const gltfBinaryBufferDataView = new DataView(gltfBinaryBuffer);
  const alignedLength = dwordAlign(gltfBinaryBuffer.byteLength);
  bufferDataView.setUint32(0, alignedLength, true);
  bufferDataView.setUint32(
      4,
      5130562,
      true);  // chunkType, 5130562 = gltfBinaryBuffer + placeholder char at the
              // end
  for (let i = 0; i < gltfBinaryBuffer.byteLength; i++) {
    bufferDataView.setUint8(i + 8, gltfBinaryBufferDataView.getUint8(i));
  }
  // Zero pad according to spec
  for (let i = gltfBinaryBuffer.byteLength; i < alignedLength; i++) {
    bufferDataView.setUint8(i + 8, 0);
  }
  return offset + CHUNK_HEADER_LENGTH + alignedLength;
}

const MAX_ASCII_CHAR_CODE = 127;

/**
 * Writes a string to a given DataView blob at the given offset.
 * @param dataview A data view to write the string to
 * @param offset The offset at which the string will be saved.
 * @param dataString The string being saved to the DataView object.
 */
export function writeStringToDataView(
    dataview: DataView, offset: number, dataString: string) {
  for (let i = 0; i < dataString.length; i++) {
    if (dataString.charCodeAt(i) > MAX_ASCII_CHAR_CODE) {
      // TODO:
      throw new Error(`Sorry, non-ASCII characters are not yet supported.`);
    }
    dataview.setUint8(offset + i, dataString.charCodeAt(i));
  }
}
