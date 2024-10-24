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

import {WebGLRenderTarget} from 'three';

import {Renderer} from '../three-components/Renderer.js';

/**
 * Debug method to save an offscreen render target to an image; filename should
 * have a .png extension to ensure lossless transmission.
 */
export const saveTarget = (target: WebGLRenderTarget, filename: string) => {
  const {width, height} = target;
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;

  const ctx = output.getContext('2d')!;
  const img = ctx.getImageData(0, 0, width, height);
  Renderer.singleton.threeRenderer.readRenderTargetPixels(
      target, 0, 0, width, height, img.data);
  ctx.putImageData(img, 0, 0);

  output.toBlob(function(blob) {
    if (blob == null) {
      return;
    }
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  });
}
