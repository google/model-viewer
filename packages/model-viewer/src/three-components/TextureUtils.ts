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

import {CubeCamera, CubeTexture, EquirectangularReflectionMapping, EventDispatcher, GammaEncoding, Scene, Texture, TextureLoader, UnsignedByteType, WebGLCubeRenderTarget, WebGLRenderer} from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';

import {deserializeUrl} from '../utilities.js';
import {ProgressTracker} from '../utilities/progress-tracker.js';

import EnvironmentScene from './EnvironmentScene.js';
import EnvironmentSceneAlt from './EnvironmentSceneAlt.js';

export interface EnvironmentMapAndSkybox {
  environmentMap: Texture;
  skybox: Texture|null;
}

export interface EnvironmentGenerationConfig {
  progressTracker?: ProgressTracker;
}

// const GENERATED_SIGMA = 0.04;

const HDR_FILE_RE = /\.hdr(\.js)?$/;
const ldrLoader = new TextureLoader();
const hdrLoader = new RGBELoader();
hdrLoader.setDataType(UnsignedByteType);

// Attach a `userData` object for arbitrary data on textures that
// originate from TextureUtils, similar to Object3D's userData,
// for help debugging, providing metadata for tests, and semantically
// describe the type of texture within the context of this application.
const userData = {
  url: null,
};

export default class TextureUtils extends EventDispatcher {
  private generatedEnvironmentMap: CubeTexture|null = null;
  private generatedEnvironmentMapAlt: CubeTexture|null = null;

  private skyboxCache = new Map<string, Promise<Texture>>();

  constructor(private threeRenderer: WebGLRenderer) {
    super();
  }

  async load(
      url: string, progressCallback: (progress: number) => void = () => {}):
      Promise<Texture> {
    try {
      const isHDR: boolean = HDR_FILE_RE.test(url);
      const loader = isHDR ? hdrLoader : ldrLoader;
      const texture: Texture = await new Promise<Texture>(
          (resolve, reject) => loader.load(
              url, resolve, (event: {loaded: number, total: number}) => {
                progressCallback(event.loaded / event.total * 0.9);
              }, reject));

      progressCallback(1.0);

      this.addMetadata(texture, url);
      texture.mapping = EquirectangularReflectionMapping;

      if (!isHDR) {
        texture.encoding = GammaEncoding;
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
      skyboxUrl: string|null = null, environmentMap: string|null = null,
      options: EnvironmentGenerationConfig = {}):
      Promise<EnvironmentMapAndSkybox> {
    const {progressTracker} = options;
    const updateGenerationProgress =
        progressTracker != null ? progressTracker.beginActivity() : () => {};

    const useAltEnvironment = environmentMap === 'neutral';
    if (useAltEnvironment === true) {
      environmentMap = null;
    }
    const environmentMapUrl = deserializeUrl(environmentMap);

    try {
      let skyboxLoads: Promise<Texture|null> = Promise.resolve(null);
      let environmentMapLoads: Promise<Texture>;

      // If we have a skybox URL, attempt to load it as a cubemap
      if (!!skyboxUrl) {
        skyboxLoads = this.loadEquirectFromUrl(skyboxUrl, progressTracker);
      }

      if (!!environmentMapUrl) {
        // We have an available environment map URL
        environmentMapLoads =
            this.loadEquirectFromUrl(environmentMapUrl, progressTracker);
      } else if (!!skyboxUrl) {
        // Fallback to deriving the environment map from an available skybox
        environmentMapLoads =
            this.loadEquirectFromUrl(skyboxUrl, progressTracker);
      } else {
        // Fallback to generating the environment map
        environmentMapLoads = useAltEnvironment === true ?
            this.loadGeneratedEnvironmentMapAlt() :
            this.loadGeneratedEnvironmentMap();
      }

      let [environmentMap, skybox] =
          await Promise.all([environmentMapLoads, skyboxLoads]);

      if (environmentMap == null) {
        throw new Error('Failed to load environment map.');
      }

      return {environmentMap, skybox};
    } finally {
      updateGenerationProgress(1.0);
    }
  }

  private addMetadata(texture: Texture|null, url: string|null) {
    if (texture == null) {
      return;
    }
    (texture as any).userData = {
      ...userData,
      ...({
        url: url,
      })
    };
  }

  /**
   * Loads an equirect Texture from a given URL, for use as a skybox.
   */
  private loadEquirectFromUrl(url: string, progressTracker?: ProgressTracker):
      Promise<Texture> {
    if (!this.skyboxCache.has(url)) {
      const progressCallback =
          progressTracker ? progressTracker.beginActivity() : () => {};
      const skyboxMapLoads = this.load(url, progressCallback);

      this.skyboxCache.set(url, skyboxMapLoads);
    }

    return this.skyboxCache.get(url)!;
  }

  private GenerateEnvironmentMap(scene: Scene) {
    const cubeTarget = new WebGLCubeRenderTarget(256);
    const cubeCamera = new CubeCamera(0.1, 100, cubeTarget);
    scene.add(cubeCamera);

    cubeCamera.update(this.threeRenderer, scene);
    const generatedEnvironmentMap = cubeCamera.renderTarget.texture;

    cubeTarget.dispose();
    return generatedEnvironmentMap;
  }

  /**
   * Loads a dynamically generated environment map.
   */
  private loadGeneratedEnvironmentMap(): Promise<CubeTexture> {
    if (this.generatedEnvironmentMap == null) {
      this.generatedEnvironmentMap =
          this.GenerateEnvironmentMap(new EnvironmentScene());
    }
    return Promise.resolve(this.generatedEnvironmentMap);
  }

  /**
   * Loads a dynamically generated environment map, designed to be neutral and
   * color-preserving. Shows less contrast around the different sides of the
   * object.
   */
  private loadGeneratedEnvironmentMapAlt(): Promise<CubeTexture> {
    if (this.generatedEnvironmentMapAlt == null) {
      this.generatedEnvironmentMapAlt =
          this.GenerateEnvironmentMap(new EnvironmentSceneAlt());
    }
    return Promise.resolve(this.generatedEnvironmentMapAlt);
  }

  async dispose() {
    for (const [, promise] of this.skyboxCache) {
      const skybox = await promise;
      skybox.dispose();
    }
    if (this.generatedEnvironmentMap != null) {
      this.generatedEnvironmentMap!.dispose();
      this.generatedEnvironmentMap = null;
    }
    if (this.generatedEnvironmentMapAlt != null) {
      this.generatedEnvironmentMapAlt!.dispose();
      this.generatedEnvironmentMapAlt = null;
    }
  }
}
