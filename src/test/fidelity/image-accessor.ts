/*
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const canvas: HTMLCanvasElement = document.createElement('canvas');
const context: CanvasRenderingContext2D = canvas.getContext('2d')!;


export class ImageAccessor {
  static fromArrayBuffer(buffer: ArrayBuffer, width: number, height: number):
      ImageAccessor {
    return new ImageAccessor(
        new ImageData(new Uint8ClampedArray(buffer), width, height));
  }

  static fromImageElement(image: HTMLImageElement): ImageAccessor {
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    return new ImageAccessor(
        context.getImageData(0, 0, canvas.width, canvas.height));
  }

  toArrayBuffer(): ArrayBuffer {
    const {buffer} = this.source.data;
    return buffer.slice(0, buffer.byteLength) as ArrayBuffer;
  }

  cssColorAt(x: number, y: number): string {
    if (x < 0 || y < 0 || x > (this.width - 1) || y > (this.height - 1)) {
      return 'black';
    }

    const position = (y * this.width + x) * 4;
    const array = this.source.data;

    const color = `rgb(${array[position]}, ${array[position + 1]}, ${
        array[position + 2]})`;
    return color;
  }

  constructor(protected source: ImageData) {
  }

  get width(): number {
    return this.source.width;
  }

  get height(): number {
    return this.source.height;
  }
}
