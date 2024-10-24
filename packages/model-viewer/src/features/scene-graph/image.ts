/* @license
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
 */

import {Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene, Texture as ThreeTexture, WebGLRenderTarget} from 'three';

import {blobCanvas} from '../../model-viewer-base.js';
import {Renderer} from '../../three-components/Renderer.js';

import {Image as ImageInterface} from './api.js';
import {$correlatedObjects, $onUpdate, ThreeDOMElement} from './three-dom-element.js';


const quadMaterial = new MeshBasicMaterial();
const quad = new PlaneGeometry(2, 2);
let adhocNum = 0;

export const $threeTexture = Symbol('threeTexture');
export const $threeTextures = Symbol('threeTextures');
export const $applyTexture = Symbol('applyTexture');

/**
 * Image facade implementation for Three.js textures
 */
export class Image extends ThreeDOMElement implements ImageInterface {
  get[$threeTexture]() {
    return this[$correlatedObjects]?.values().next().value as ThreeTexture;
  }

  get[$threeTextures](): Set<ThreeTexture> {
    return this[$correlatedObjects] as Set<ThreeTexture>;
  }

  constructor(onUpdate: () => void, texture: ThreeTexture) {
    super(onUpdate, new Set<ThreeTexture>(texture ? [texture] : []));

    if (!this[$threeTexture].image.src) {
      this[$threeTexture].image.src =
          texture.name ? texture.name : 'adhoc_image' + adhocNum++;
    }
    if (!this[$threeTexture].image.name) {
      this[$threeTexture].image.name =
          (texture && texture.image && texture.image.src) ?
          texture.image.src.split('/').pop() :
          'adhoc_image';
    }
  }

  get name(): string {
    return this[$threeTexture].image.name || '';
  }

  get uri(): string|undefined {
    return this[$threeTexture].image.src;
  }

  get bufferView(): number|undefined {
    return this[$threeTexture].image.bufferView;
  }

  get element(): HTMLVideoElement|HTMLCanvasElement|undefined {
    const texture = this[$threeTexture] as any;
    if (texture && (texture.isCanvasTexture || texture.isVideoTexture)) {
      return texture.image;
    }
    return;
  }

  get animation(): any|undefined {
    const texture = this[$threeTexture] as any;
    if (texture && texture.isCanvasTexture && texture.animation) {
      return texture.animation;
    }
    return;
  }

  get type(): 'embedded'|'external' {
    return this.uri != null ? 'external' : 'embedded';
  }

  set name(name: string) {
    for (const texture of this[$threeTextures]) {
      texture.image.name = name;
    }
  }

  update() {
    const texture = this[$threeTexture] as any;
    // Applies to non-Lottie canvas textures only
    if (texture && texture.isCanvasTexture && !texture.animation) {
      this[$threeTexture].needsUpdate = true;
      this[$onUpdate]();
    }
  }

  async createThumbnail(width: number, height: number): Promise<string> {
    const scene = new Scene();
    quadMaterial.map = this[$threeTexture];
    const mesh = new Mesh(quad, quadMaterial);
    scene.add(mesh);
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const {threeRenderer} = Renderer.singleton;
    const renderTarget = new WebGLRenderTarget(width, height);
    threeRenderer.setRenderTarget(renderTarget);
    threeRenderer.render(scene, camera);
    threeRenderer.setRenderTarget(null);

    const buffer = new Uint8Array(width * height * 4);
    threeRenderer.readRenderTargetPixels(
        renderTarget, 0, 0, width, height, buffer);

    blobCanvas.width = width;
    blobCanvas.height = height;
    const blobContext = blobCanvas.getContext('2d')!;
    const imageData = blobContext.createImageData(width, height);
    imageData.data.set(buffer);
    blobContext.putImageData(imageData, 0, 0);

    return new Promise<string>(async (resolve, reject) => {
      blobCanvas.toBlob(blob => {
        if (!blob) {
          return reject('Failed to capture thumbnail.');
        }
        resolve(URL.createObjectURL(blob));
      }, 'image/png');
    });
  }
}
