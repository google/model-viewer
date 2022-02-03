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
let adhocNum = 0;

export const $threeTexture = Symbol('threeTexture');
export const $applyTexture = Symbol('applyTexture');

/**
 * Image facade implementation for Three.js textures
 */
export class Image extends ThreeDOMElement implements ImageInterface {
  get[$threeTexture]() {
    console.assert(
        this[$correlatedObjects] != null && this[$correlatedObjects]!.size > 0,
        'Image correlated object is undefined');
    return this[$correlatedObjects]?.values().next().value as ThreeTexture;
  }

  constructor(
      onUpdate: () => void, texture: ThreeTexture|null,
      gltfImage: GLTFImage|null) {
    gltfImage = gltfImage ?? {
      name: (texture && texture.image && texture.image.src) ?
          texture.image.src.split('/').pop() :
          'adhoc_image',
      uri: (texture && texture.image && texture.image.src) ?
          texture.image.src :
          'adhoc_image' + adhocNum++
    };
    super(onUpdate, gltfImage, new Set<ThreeTexture>(texture ? [texture] : []));
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

  set name(name: string) {
    (this[$sourceObject] as GLTFImage).name = name;
  }

  async setURI(uri: string): Promise<void> {
    (this[$sourceObject] as GLTFImage).uri = uri;
    (this[$sourceObject] as GLTFImage).name = uri.split('/').pop();

    const image = await new Promise((resolve, reject) => {
      loader.load(uri, resolve, undefined, reject);
    });

    const texture = this[$threeTexture]!;
    texture.image = image;
    texture.needsUpdate = true;
    this[$onUpdate]();
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
