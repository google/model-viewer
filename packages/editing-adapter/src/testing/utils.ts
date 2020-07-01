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
 * @fileoverview Helper functions for editing_adapter tests.
 */

/**
 * Reads data from a UTF16 string as an ArrayBuffer.
 */
export function createBufferFromString(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length * 2);  // 2 bytes for each char
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Creates a dummy PNG blob, useful as a test texture
 */
export async function generatePngBlob(strokeStyle: string = '#f0f'):
    Promise<Blob> {
  const canvas = document.createElement('CANVAS') as HTMLCanvasElement;
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  context.strokeStyle = strokeStyle;
  context.beginPath();
  context.arc(32, 32, 30, 0, 2 * Math.PI);
  context.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(`Failed to get the PNG blob`);
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}

/**
 * Returns true if two ArrayBuffers are equal, byte for byte.
 */
export function areBuffersEqual(buffer0: ArrayBuffer, buffer1: ArrayBuffer) {
  if (buffer0.byteLength !== buffer1.byteLength) return false;
  const view0 = new Uint8Array(buffer0);
  const view1 = new Uint8Array(buffer1);
  for (let i = 0; i < view0.length; i++) {
    if (view0[i] !== view1[i]) return false;
  }
  return true;
}

/**
 * Suitable for use as a jasmine custom equality tester.
 */
export function arrayBufferEqualityTester(
    first: unknown, second: unknown): boolean|undefined {
  if (first instanceof ArrayBuffer && second instanceof ArrayBuffer) {
    return areBuffersEqual(first, second);
  }
  return undefined;
}


/**
 * Convenience function for when you just want the bytes.
 */
export async function fetchBufferForUri(uri: string): Promise<ArrayBuffer> {
  return (await (await fetch(uri)).blob()).arrayBuffer();
}
