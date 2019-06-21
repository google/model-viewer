/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {BackSide, BoxBufferGeometry, Cache, CubeCamera, DataTextureLoader, EventDispatcher, GammaEncoding, LinearToneMapping, Mesh, NearestFilter, RGBEEncoding, RGBEFormat, Scene, ShaderMaterial, Texture, TextureLoader, UnsignedByteType, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetCube} from 'three';
import {PMREMCubeUVPacker} from 'three/examples/jsm/pmrem/PMREMCubeUVPacker.js';
import {PMREMGenerator} from 'three/examples/jsm/pmrem/PMREMGenerator.js';

import {EquirectangularToCubeGenerator} from '../third_party/three/EquirectangularToCubeGenerator.js';
import {RGBELoader} from '../third_party/three/RGBELoader.js';
import {ProgressTracker} from '../utilities/progress-tracker.js';

import EnvironmentMapGenerator from './EnvironmentMapGenerator.js';

export interface EnvironmentMapAndSkybox {
  environmentMap: WebGLRenderTarget;
  skybox: WebGLRenderTargetCube|null;
}

export interface EnvironmentGenerationConfig {
  progressTracker?: ProgressTracker;
}

// Enable three's loader cache so we don't create redundant
// Image objects to decode images fetched over the network.
Cache.enabled = true;

const HDR_FILE_RE = /\.hdr$/;
const ldrLoader = new TextureLoader();
const hdrLoader = new RGBELoader();

const $environmentMapCache = Symbol('environmentMapCache');
const $skyboxCache = Symbol('skyboxCache');
const $cubeGenerator = Symbol('cubeGenerator');
const $generatedEnvironmentMap = Symbol('generatedEnvironmentMap');

const $loadSkyboxFromUrl = Symbol('loadSkyboxFromUrl');
const $loadEnvironmentMapFromUrl = Symbol('loadEnvironmentMapFromUrl');
const $loadEnvironmentMapFromSkyboxUrl =
    Symbol('loadEnvironmentMapFromSkyboxUrl');
const $loadGeneratedEnvironmentMap = Symbol('loadGeneratedEnvironmentMap');

export interface TextureUtilsConfig {
  cubemapSize?: number;
  pmremSamples?: number;
}

const defaultConfig: TextureUtilsConfig = {
  cubemapSize: 1024,
};

// Attach a `userData` object for arbitrary data on textures that
// originate from TextureUtils, similar to Object3D's userData,
// for help debugging, providing metadata for tests, and semantically
// describe the type of texture within the context of this application.
const userData = {
  url: null,
  // 'Equirectangular', 'Cube', 'PMREM'
  mapping: null,
};

export default class TextureUtils extends EventDispatcher {
  private config: TextureUtilsConfig;
  private renderer: WebGLRenderer;

  private[$cubeGenerator]: EquirectangularToCubeGenerator|null = null;
  private[$generatedEnvironmentMap]: WebGLRenderTarget|null = null;

  private[$environmentMapCache] = new Map<string, Promise<WebGLRenderTarget>>();
  private[$skyboxCache] = new Map<string, Promise<WebGLRenderTargetCube>>();

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {?number} config.cubemapSize
   */
  constructor(renderer: WebGLRenderer, config: TextureUtilsConfig = {}) {
    super();
    this.config = {...defaultConfig, ...config};
    this.renderer = renderer;
  }

  equirectangularToCubemap(texture: Texture): WebGLRenderTargetCube {
    const generator = new EquirectangularToCubeGenerator(texture, {
      resolution: this.config.cubemapSize,
    });

    generator.update(this.renderer);

    (generator.renderTarget.texture as any).userData = {
      ...userData,
      ...({
        url: (texture as any).userData ? (texture as any).userData.url : null,
        mapping: 'Cube',
      })
    };

    // It's up to the previously served texture to dispose itself,
    // and therefore the generator's render target.
    this[$cubeGenerator] = generator;

    return generator.renderTarget;
  }

  async load(
      url: string, progressCallback: (progress: number) => void = () => {}):
      Promise<Texture> {
    try {
      const isHDR: boolean = HDR_FILE_RE.test(url);
      const loader: DataTextureLoader = isHDR ? hdrLoader : ldrLoader;
      const texture: Texture = await new Promise<Texture>(
          (resolve, reject) => loader.load(
              url, resolve, (event: {loaded: number, total: number}) => {
                progressCallback(event.loaded / event.total * 0.9);
              }, reject));

      progressCallback(1.0);

      (texture as any).userData = {
        ...userData,
        ...({
          url: url,
          mapping: 'Equirectangular',
        })
      };

      if (isHDR) {
        texture.encoding = RGBEEncoding;
        texture.minFilter = NearestFilter;
        texture.magFilter = NearestFilter;
        texture.flipY = true;
      } else {
        texture.encoding = GammaEncoding;
      }

      return texture;

    } finally {
      if (progressCallback) {
        progressCallback(1);
      }
    }
  }

  async loadEquirectAsCubeMap(
      url: string, progressCallback: (progress: number) => void = () => {}):
      Promise<WebGLRenderTargetCube> {
    let equirect = null;

    try {
      equirect = await this.load(url, progressCallback);
      return await this.equirectangularToCubemap(equirect);
    } finally {
      if (equirect != null) {
        (equirect as any).dispose();
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
      options: EnvironmentGenerationConfig = {}):
      Promise<EnvironmentMapAndSkybox> {
    const {progressTracker} = options;
    const updateGenerationProgress =
        progressTracker != null ? progressTracker.beginActivity() : () => {};

    try {
      let skyboxLoads: Promise<WebGLRenderTargetCube|null> =
          Promise.resolve(null);
      let environmentMapLoads: Promise<WebGLRenderTarget>;

      // If we have a skybox URL, attempt to load it as a cubemap
      if (!!skyboxUrl) {
        skyboxLoads = this[$loadSkyboxFromUrl](skyboxUrl, progressTracker);
      }

      if (!!environmentMapUrl) {
        // We have an available environment map URL
        environmentMapLoads = this[$loadEnvironmentMapFromUrl](
            environmentMapUrl, progressTracker);
      } else if (!!skyboxUrl) {
        // Fallback to deriving the environment map from an available skybox
        environmentMapLoads =
            this[$loadEnvironmentMapFromSkyboxUrl](skyboxUrl, progressTracker);
      } else {
        // Fallback to generating the environment map
        environmentMapLoads = this[$loadGeneratedEnvironmentMap]();
      }

      const [environmentMap, skybox] =
          await Promise.all([environmentMapLoads, skyboxLoads]);

      return {environmentMap, skybox};
    } finally {
      updateGenerationProgress(1.0);
    }
  }

  gaussianBlur(cubeMap: Texture) {  //, standardDeviationRadians: number
    const blurScene = new Scene();

    const geometry = new BoxBufferGeometry();
    geometry.removeAttribute('uv');

    const blurMaterial = new ShaderMaterial({
      uniforms: {
        tCube: {value: null},
        latitudinal: {value: false},
        w: {value: [0.1633, 0.1531, 0.12245, 0.0918, 0.051]},
        dTheta: {value: 0}
      },
      vertexShader: `
        varying vec3 vWorldDirection;
        #include <common>
        void main() {
          vWorldDirection = transformDirection( position, modelMatrix );
          #include <begin_vertex>
          #include <project_vertex>
          gl_Position.z = gl_Position.w;
        }
      `,
      fragmentShader: `
        uniform samplerCube tCube;
        uniform bool latitudinal;
        uniform float dTheta;
        uniform float w[5];
        varying vec3 vWorldDirection;
        void main() {
          vec4 texColor = vec4(0.0);
          for (float i = -4.0; i < 5.0; i++) {
            vec3 sampleDirection = vWorldDirection;
            float diTheta = dTheta * i;
            mat2 R = mat2(cos(diTheta), sin(diTheta), -sin(diTheta), cos(diTheta));
            if (latitudinal) {
              sampleDirection.xz = R * sampleDirection.xz;
              texColor +=
                  w[int(abs(i))] * RGBEToLinear(textureCube(tCube, sampleDirection));
            } else {
              float xz = length(sampleDirection.xz);
              vec2 xzY = R * vec2(xz, sampleDirection.y);
              sampleDirection.xz *= xzY.x / xz;
              sampleDirection.y = xzY.y;
              texColor +=
                  w[int(abs(i))] * RGBEToLinear(textureCube(tCube, sampleDirection));
            }
          }
          gl_FragColor = linearToOutputTexel(texColor);
        }
      `,
      side: BackSide,
      depthTest: false,
      depthWrite: false
    });

    blurScene.add(new Mesh(geometry, blurMaterial));

    const blurCamera = new CubeCamera(0.1, 100, 256);
    blurCamera.renderTarget.texture.type = UnsignedByteType;
    blurCamera.renderTarget.texture.format = RGBEFormat;
    blurCamera.renderTarget.texture.encoding = RGBEEncoding;
    blurCamera.renderTarget.texture.magFilter = NearestFilter;
    blurCamera.renderTarget.texture.minFilter = NearestFilter;
    blurCamera.renderTarget.texture.generateMipmaps = false;

    var gammaOutput = this.renderer.gammaOutput;
    var toneMapping = this.renderer.toneMapping;
    var toneMappingExposure = this.renderer.toneMappingExposure;

    this.renderer.toneMapping = LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.gammaOutput = false;

    blurMaterial.uniforms.dTheta.value = 0.01;
    blurMaterial.uniforms.latitudinal.value = false;
    blurMaterial.uniforms.tCube.value = cubeMap;
    // (blurCamera as any).clear(this.renderer);
    blurCamera.update(this.renderer, blurScene);

    blurMaterial.uniforms.dTheta.value = 0.01;
    blurMaterial.uniforms.latitudinal.value = true;
    blurMaterial.uniforms.tCube.value = blurCamera.renderTarget.texture;
    blurCamera.renderTarget.texture = cubeMap;
    // (blurCamera as any).clear(this.renderer);
    blurCamera.update(this.renderer, blurScene);

    this.renderer.toneMapping = toneMapping;
    this.renderer.toneMappingExposure = toneMappingExposure;
    this.renderer.gammaOutput = gammaOutput;
  }

  /**
   * Loads a WebGLRenderTargetCube from a given URL. The render target in this
   * case will be assumed to be used as a skybox.
   */
  private[$loadSkyboxFromUrl](url: string, progressTracker?: ProgressTracker):
      Promise<WebGLRenderTargetCube> {
    if (!this[$skyboxCache].has(url)) {
      const progressCallback =
          progressTracker ? progressTracker.beginActivity() : () => {};
      this[$skyboxCache].set(
          url, this.loadEquirectAsCubeMap(url, progressCallback));
    }

    return this[$skyboxCache].get(url)!;
  }

  /**
   * Loads a WebGLRenderTarget from a given URL. The render target in this
   * case will be assumed to be used as an environment map.
   */
  private[$loadEnvironmentMapFromUrl](
      url: string,
      progressTracker?: ProgressTracker): Promise<WebGLRenderTarget> {
    if (!this[$environmentMapCache].has(url)) {
      const progressCallback =
          progressTracker ? progressTracker.beginActivity() : () => {};
      const environmentMapLoads =
          this.loadEquirectAsCubeMap(url, progressCallback)
              .then(interstitialEnvironmentMap => {
                const environmentMap =
                    this.pmremPass(interstitialEnvironmentMap.texture);
                // In this case, we don't care about the interstitial
                // environment map because it will never be used for anything,
                // so dispose of it right away:
                interstitialEnvironmentMap.dispose();
                return environmentMap;
              });

      this[$environmentMapCache].set(url, environmentMapLoads);
    }

    return this[$environmentMapCache].get(url)!;
  }

  /**
   * Loads a skybox from a given URL, then PMREM is applied to the
   * skybox texture and the resulting WebGLRenderTarget is returned,
   * with the assumption that it will be used as an environment map.
   */
  private[$loadEnvironmentMapFromSkyboxUrl](
      url: string,
      progressTracker?: ProgressTracker): Promise<WebGLRenderTarget> {
    if (!this[$environmentMapCache].has(url)) {
      const skyboxLoads = this[$loadSkyboxFromUrl](url, progressTracker);
      const environmentMapLoads =
          skyboxLoads.then(skybox => this.pmremPass(skybox.texture));

      this[$environmentMapCache].set(url, environmentMapLoads);
    }

    return this[$environmentMapCache].get(url)!;
  }

  /**
   * Loads a dynamically generated environment map.
   */
  private[$loadGeneratedEnvironmentMap](): Promise<WebGLRenderTarget> {
    if (this[$generatedEnvironmentMap] == null) {
      const environmentMapGenerator =
          new EnvironmentMapGenerator(this.renderer);
      const interstitialEnvironmentMap = environmentMapGenerator.generate();

      this.gaussianBlur(interstitialEnvironmentMap.texture);

      this[$generatedEnvironmentMap] =
          this.pmremPass(interstitialEnvironmentMap.texture);

      // We should only ever generate this map once, and we will not be using
      // the environment map as a skybox, so go ahead and dispose of all
      // interstitial artifacts:
      interstitialEnvironmentMap.dispose();
      environmentMapGenerator.dispose();
    }

    return Promise.resolve(this[$generatedEnvironmentMap]!);
  }


  /**
   * Takes a cube-ish (@see equirectangularToCubemap) texture and
   * returns a texture of the prefiltered mipmapped radiance environment map
   * to be used as environment maps in models.
   */
  pmremPass(texture: Texture, samples?: number, size?: number):
      WebGLRenderTarget {
    const generator = new PMREMGenerator(texture, samples, size);
    generator.update(this.renderer);

    const packer = new PMREMCubeUVPacker(generator.cubeLods);
    packer.update(this.renderer);

    const renderTarget = packer.CubeUVRenderTarget;

    generator.dispose();
    packer.dispose();

    (renderTarget.texture as any).userData = {
      ...userData,
      ...({
        url: (texture as any).userData ? (texture as any).userData.url : null,
        mapping: 'PMREM',
      })
    };

    return renderTarget;
  }

  async dispose() {
    // NOTE(cdata): In the case that the generators are invoked with
    // an incorrect texture, the generators will throw when we attempt to
    // dispose of them because the framebuffer has not been created yet but
    // the implementation does not guard for this correctly:
    try {
      if (this[$cubeGenerator] != null) {
        this[$cubeGenerator]!.dispose();
        this[$cubeGenerator] = null;
      }
    } catch (_error) {
    }

    for (const environmentMapLoads of this[$environmentMapCache].values()) {
      const environmentMap = await environmentMapLoads;
      if (environmentMap != null) {
        environmentMap.dispose();
      }
    }

    this[$environmentMapCache].clear();

    for (const skyboxLoads of this[$skyboxCache].values()) {
      const skybox = await skyboxLoads;
      if (skybox != null) {
        skybox.dispose();
      }
    }

    this[$skyboxCache].clear();

    if (this[$generatedEnvironmentMap] != null) {
      this[$generatedEnvironmentMap]!.dispose();
      this[$generatedEnvironmentMap] = null;
    }
  }
}
