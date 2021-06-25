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

import {ImageLoader, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene, Texture as ThreeTexture, WebGLRenderTarget} from 'three';

import {blobCanvas} from '../../model-viewer-base.js';
import {Image as GLTFImage} from '../../three-components/gltf-instance/gltf-2.0.js';
import {Renderer} from '../../three-components/Renderer.js';

import {Image as ImageInterface} from './api.js';
import {$correlatedObjects, $onUpdate, $sourceObject, ThreeDOMElement} from './three-dom-element.js';

const loader = new ImageLoader();
const quadMaterial = new MeshBasicMaterial();
const quad = new PlaneGeometry(2, 2);

const $threeTextures = Symbol('threeTextures');
const $bufferViewImages = Symbol('bufferViewImages');

/**
 * Image facade implementation for Three.js textures
 */
export class Image extends ThreeDOMElement implements ImageInterface {
  private get[$threeTextures]() {
    return this[$correlatedObjects] as Set<ThreeTexture>;
  }

  private[$bufferViewImages]: WeakMap<ThreeTexture, unknown> = new WeakMap();

  constructor(
      onUpdate: () => void, image: GLTFImage,
      correlatedTextures: Set<ThreeTexture>) {
    super(onUpdate, image, correlatedTextures);

    if ((image as GLTFImage).bufferView != null) {
      for (const texture of correlatedTextures) {
        this[$bufferViewImages].set(texture, texture.image);
      }
    }
  }

  get name(): string {
    return (this[$sourceObject] as GLTFImage).name || '';
  }

  get uri(): string|undefined {
    return (this[$sourceObject] as GLTFImage).uri;
  }

  get bufferView(): number|undefined {
    return (this[$sourceObject] as GLTFImage).bufferView;
  }

  get type(): 'embedded'|'external' {
    return this.uri != null ? 'external' : 'embedded';
  }

  async setURI(uri: string): Promise<void> {
    (this[$sourceObject] as GLTFImage).uri = uri;

    const image = await new Promise((resolve, reject) => {
      loader.load(uri, resolve, undefined, reject);
    });

    for (const texture of this[$threeTextures]) {
      // If the URI is set to null but the Image had an associated buffer view
      // (this would happen if it started out as embedded), then fall back to
      // the cached object URL created by GLTFLoader:
      if (image == null &&
          (this[$sourceObject] as GLTFImage).bufferView != null) {
        texture.image = this[$bufferViewImages].get(texture);
      } else {
        texture.image = image;
      }

      texture.needsUpdate = true;
    }
    this[$onUpdate]();
  }

  async createThumbnail(width: number, height: number): Promise<string> {
    const scene = new Scene();
    quadMaterial.map = [...this[$threeTextures]][0];
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

    return new Promise<string>(
        async (resolve, reject) => {blobCanvas.toBlob(blob => {
          if (!blob) {
            return reject('Failed to capture thumbnail.');
          }
          resolve(URL.createObjectURL(blob));
        }, 'image/png')});
  }
}
