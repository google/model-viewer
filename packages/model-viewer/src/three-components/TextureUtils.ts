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

import {GainMapDecoderMaterial, HDRJPGLoader, QuadRenderer} from '@monogrid/gainmap-js';
import {CubeCamera, CubeTexture, DataTexture, EquirectangularReflectionMapping, HalfFloatType, LinearSRGBColorSpace, Loader, NoToneMapping, RGBAFormat, Scene, SRGBColorSpace, Texture, TextureLoader, WebGLCubeRenderTarget, WebGLRenderer} from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
//@ts-ignore
import {CubeRenderTarget, WebGPURenderer} from 'three/webgpu';

import {deserializeUrl, timePasses} from '../utilities.js';

import EnvironmentScene from './EnvironmentScene.js';

export interface EnvironmentMapAndSkybox {
  environmentMap: Texture;
  skybox: Texture|null;
}

const GENERATED_SIGMA = 0.04;

const HDR_FILE_RE = /\.hdr(\.js)?$/;

export default class TextureUtils {
  public lottieLoaderUrl = '';

  private _ldrLoader: TextureLoader|null = null;
  private _imageLoader: HDRJPGLoader|null = null;
  private _hdrLoader: RGBELoader|null = null;
  private _lottieLoader: Loader|null = null;

  private generatedEnvironmentMap: Promise<CubeTexture>|null = null;
  private generatedEnvironmentMapAlt: Promise<CubeTexture>|null = null;

  private skyboxCache = new Map<string, Promise<Texture>>();

  constructor(private threeRenderer: WebGPURenderer) {
  }

  private ldrLoader(withCredentials: boolean): TextureLoader {
    if (this._ldrLoader == null) {
      this._ldrLoader = new TextureLoader();
    }
    this._ldrLoader.setWithCredentials(withCredentials);
    return this._ldrLoader;
  }

  private imageLoader(withCredentials: boolean): HDRJPGLoader {
    if (this._imageLoader == null) {
      this._imageLoader =
          new HDRJPGLoader(this.threeRenderer as unknown as WebGLRenderer);
    }
    this._imageLoader.setWithCredentials(withCredentials);
    return this._imageLoader;
  }

  private hdrLoader(withCredentials: boolean): RGBELoader {
    if (this._hdrLoader == null) {
      this._hdrLoader = new RGBELoader();
      this._hdrLoader.setDataType(HalfFloatType);
    }
    this._hdrLoader.setWithCredentials(withCredentials);
    return this._hdrLoader;
  }

  async getLottieLoader(withCredentials: boolean): Promise<any> {
    if (this._lottieLoader == null) {
      const {LottieLoader} =
          await import(/* webpackIgnore: true */ this.lottieLoaderUrl);
      this._lottieLoader = new LottieLoader() as Loader;
    }
    this._lottieLoader.setWithCredentials(withCredentials);
    return this._lottieLoader;
  }

  async loadImage(url: string, withCredentials: boolean): Promise<Texture> {
    const texture: Texture = await new Promise<Texture>(
        (resolve, reject) => this.ldrLoader(withCredentials)
                                 .load(url, resolve, () => {}, reject));
    texture.name = url;
    texture.flipY = false;

    return texture;
  }

  async loadLottie(url: string, quality: number, withCredentials: boolean):
      Promise<Texture> {
    const loader = await this.getLottieLoader(withCredentials);
    loader.setQuality(quality);
    const texture: Texture = await new Promise<Texture>(
        (resolve, reject) => loader.load(url, resolve, () => {}, reject));
    texture.name = url;

    return texture;
  }

  async loadEquirect(
      url: string, withCredentials = false,
      progressCallback: (progress: number) => void = () => {}):
      Promise<Texture> {
    try {
      const isHDR: boolean = HDR_FILE_RE.test(url);
      const loader = isHDR ? this.hdrLoader(withCredentials) :
                             this.imageLoader(withCredentials);
      const texture: Texture = await new Promise<Texture>(
          (resolve, reject) => loader.load(
              url,
              (result) => {
                const {renderTarget} =
                    result as QuadRenderer<1016, GainMapDecoderMaterial>;
                if (renderTarget != null) {
                  const {texture} = renderTarget;
                  result.dispose(false);
                  resolve(texture);
                } else {
                  resolve(result as DataTexture);
                }
              },
              (event: {loaded: number, total: number}) => {
                progressCallback(event.loaded / event.total * 0.9);
              },
              reject));

      progressCallback(1.0);

      texture.name = url;
      texture.mapping = EquirectangularReflectionMapping;

      if (!isHDR) {
        texture.colorSpace = SRGBColorSpace;
      }

      return texture;

    } finally {
      if (progressCallback) {
        progressCallback(1);
      }
    }
  }

  /**
   * Returns a { skybox, environmentMap } object with the targets/textures
   * accordingly. `skybox` is a WebGLRenderCubeTarget, and `environmentMap`
   * is a Texture from a WebGLRenderCubeTarget.
   */
  async generateEnvironmentMapAndSkybox(
      skyboxUrl: string|null = null, environmentMapUrl: string|null = null,
      progressCallback: (progress: number) => void = () => {},
      withCredentials = false): Promise<EnvironmentMapAndSkybox> {
    const useAltEnvironment = environmentMapUrl !== 'legacy';
    if (environmentMapUrl === 'legacy' || environmentMapUrl === 'neutral') {
      environmentMapUrl = null;
    }
    environmentMapUrl = deserializeUrl(environmentMapUrl);

    let skyboxLoads: Promise<Texture|null> = Promise.resolve(null);
    let environmentMapLoads: Promise<Texture>;

    // If we have a skybox URL, attempt to load it as a cubemap
    if (!!skyboxUrl) {
      skyboxLoads = this.loadEquirectFromUrl(
          skyboxUrl, withCredentials, progressCallback);
    }

    if (!!environmentMapUrl) {
      // We have an available environment map URL
      environmentMapLoads = this.loadEquirectFromUrl(
          environmentMapUrl, withCredentials, progressCallback);
    } else if (!!skyboxUrl) {
      // Fallback to deriving the environment map from an available skybox
      environmentMapLoads = this.loadEquirectFromUrl(
          skyboxUrl, withCredentials, progressCallback);
    } else {
      // Fallback to generating the environment map
      environmentMapLoads = useAltEnvironment ?
          this.loadGeneratedEnvironmentMapAlt() :
          this.loadGeneratedEnvironmentMap();
    }

    const [environmentMap, skybox] =
        await Promise.all([environmentMapLoads, skyboxLoads]);

    if (environmentMap == null) {
      throw new Error('Failed to load environment map.');
    }

    return {environmentMap, skybox};
  }

  /**
   * Loads an equirect Texture from a given URL, for use as a skybox.
   */
  private async loadEquirectFromUrl(
      url: string, withCredentials: boolean,
      progressCallback: (progress: number) => void): Promise<Texture> {
    if (!this.skyboxCache.has(url)) {
      const skyboxMapLoads =
          this.loadEquirect(url, withCredentials, progressCallback);

      this.skyboxCache.set(url, skyboxMapLoads);
    }

    return this.skyboxCache.get(url)!;
  }

  private async GenerateEnvironmentMap(scene: Scene, name: string) {
    await timePasses();

    const renderer = this.threeRenderer;
    const tmpTarget = new WebGLCubeRenderTarget(256, {
      generateMipmaps: false,
      type: HalfFloatType,
      format: RGBAFormat,
      colorSpace: LinearSRGBColorSpace,
      depthBuffer: true
    });
    const cubeCamera = new CubeCamera(0.1, 100, tmpTarget);

    const outputColorSpace = renderer.outputColorSpace;
    const toneMapping = renderer.toneMapping;
    renderer.toneMapping = NoToneMapping;
    renderer.outputColorSpace = LinearSRGBColorSpace;

    cubeCamera.update(renderer as unknown as WebGLRenderer, scene);

    const cubeTarget = new CubeRenderTarget(256);
    (cubeTarget as any)
        .fromCubeTexture(
            this.threeRenderer, tmpTarget.texture, GENERATED_SIGMA);

    const generatedEnvironmentMap = cubeTarget.texture;
    generatedEnvironmentMap.name = name;

    renderer.toneMapping = toneMapping;
    renderer.outputColorSpace = outputColorSpace;

    tmpTarget.dispose();

    return generatedEnvironmentMap;
  }

  /**
   * Loads a dynamically generated environment map.
   */
  private async loadGeneratedEnvironmentMap(): Promise<CubeTexture> {
    if (this.generatedEnvironmentMap == null) {
      this.generatedEnvironmentMap =
          this.GenerateEnvironmentMap(new EnvironmentScene('legacy'), 'legacy');
    }
    return this.generatedEnvironmentMap;
  }

  /**
   * Loads a dynamically generated environment map, designed to be neutral and
   * color-preserving. Shows less contrast around the different sides of the
   * object.
   */
  private async loadGeneratedEnvironmentMapAlt(): Promise<CubeTexture> {
    if (this.generatedEnvironmentMapAlt == null) {
      this.generatedEnvironmentMapAlt = this.GenerateEnvironmentMap(
          new EnvironmentScene('neutral'), 'neutral');
    }
    return this.generatedEnvironmentMapAlt;
  }

  async dispose() {
    for (const [, promise] of this.skyboxCache) {
      const skybox = await promise;
      skybox.dispose();
    }
    if (this.generatedEnvironmentMap != null) {
      (await this.generatedEnvironmentMap).dispose();
      this.generatedEnvironmentMap = null;
    }
    if (this.generatedEnvironmentMapAlt != null) {
      (await this.generatedEnvironmentMapAlt).dispose();
      this.generatedEnvironmentMapAlt = null;
    }
  }
}
