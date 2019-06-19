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

import {BackSide, BoxBufferGeometry, Cache, CubeCamera, DataTextureLoader, EventDispatcher, GammaEncoding, LinearToneMapping, Mesh, NearestFilter, RGBEEncoding, RGBEFormat, Scene, ShaderMaterial, Texture, TextureLoader, UnsignedByteType, WebGLRenderer, WebGLRenderTarget} from 'three';
import {PMREMCubeUVPacker} from 'three/examples/jsm/pmrem/PMREMCubeUVPacker.js';
import {PMREMGenerator} from 'three/examples/jsm/pmrem/PMREMGenerator.js';

import {EquirectangularToCubeGenerator} from '../third_party/three/EquirectangularToCubeGenerator.js';
import {RGBELoader} from '../third_party/three/RGBELoader.js';
import {Activity, ProgressTracker} from '../utilities/progress-tracker.js';

import EnvironmentMapGenerator from './EnvironmentMapGenerator.js';



export interface EnvironmentGenerationConfig {
  pmrem?: boolean;
  progressTracker?: ProgressTracker;
}

// Enable three's loader cache so we don't create redundant
// Image objects to decode images fetched over the network.
Cache.enabled = true;

const HDR_FILE_RE = /\.hdr$/;
const ldrLoader = new TextureLoader();
const hdrLoader = new RGBELoader();

const $cubeGenerator = Symbol('cubeGenerator');

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
  private environmentMapGenerator: EnvironmentMapGenerator;
  private[$cubeGenerator]: EquirectangularToCubeGenerator|null = null;

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {?number} config.cubemapSize
   */
  constructor(renderer: WebGLRenderer, config: TextureUtilsConfig = {}) {
    super();
    this.config = {...defaultConfig, ...config};
    this.renderer = renderer;
    this.environmentMapGenerator = new EnvironmentMapGenerator(this.renderer);
  }

  /**
   * @param {THREE.Texture} texture
   * @return {THREE.WebGLRenderCubeTarget}
   */
  equirectangularToCubemap(texture: Texture) {
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

  /**
   * @param {string} url
   * @param {Function} progressCallback
   * @return {Promise<THREE.Texture>}
   */
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

  /**
   * @param {string} url
   * @param {Function} progressCallback
   * @return {Promise<THREE.WebGLRenderCubeTarget>}
   */
  async loadEquirectAsCubeMap(
      url: string, progressCallback: (progress: number) => void = () => {}) {
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
   *
   * @see equirectangularToCubemap with regard to the THREE types.
   * @param {string} url
   * @param {boolean} config.pmrem
   * @param {ProgressTracker} config.progressTracker
   * @return {Promise<Object|null>}
   */
  async generateEnvironmentMapAndSkybox(
      skyboxUrl: string|null = null, environmentMapUrl: string|null = null,
      options: EnvironmentGenerationConfig = {}) {
    const {progressTracker} = options;
    let updateGenerationProgress: Activity|((...args: any[]) => void) =
        () => {};

    let skyboxLoads: Promise<WebGLRenderTarget|null> = Promise.resolve(null);
    let environmentMapLoads: Promise<WebGLRenderTarget|null> =
        Promise.resolve(null);

    let skybox = null;
    let environmentMap = null;

    try {
      let environmentMapWasGenerated = false;

      // If we have a specific environment URL, attempt to load it as a cubemap
      // The case for this is that the user intends for the IBL to be different
      // from the scene background (which may be a skybox or solid color).
      if (!!environmentMapUrl) {
        environmentMapLoads = this.loadEquirectAsCubeMap(
            environmentMapUrl,
            progressTracker ? progressTracker.beginActivity() : () => {});
      }

      // If we have a skybox URL, attempt to load it as a cubemap
      if (!!skyboxUrl) {
        skyboxLoads = this.loadEquirectAsCubeMap(
            skyboxUrl,
            progressTracker ? progressTracker.beginActivity() : () => {});
      }

      updateGenerationProgress =
          progressTracker ? progressTracker.beginActivity() : () => {};

      // In practice, this should be nearly as parallel as Promise.all (which
      // we don't use since we can't easily destructure here):
      environmentMap = await environmentMapLoads;
      skybox = await skyboxLoads;

      // If environment is still null, then no specific environment URL was
      // specified
      if (environmentMap != null) {
        environmentMap = environmentMap.texture
      } else {
        if (skybox != null) {
          // Infer the environment from the skybox if we have one:
          environmentMap = skybox.texture;
        } else {
          // Otherwise, no skybox URL was specified, so fall back to generating
          // the environment:
          // TODO(#336): can cache this per renderer and color
          environmentMap = this.environmentMapGenerator.generate();
          this.gaussianBlur(environmentMap);
          environmentMapWasGenerated = true;
        }
      }

      if (options.pmrem) {
        // Apply the PMREM pass to the environment, which produces a distinct
        // texture from the source:
        const nonPmremEnvironmentMap = environmentMap;

        environmentMap = this.pmremPass(nonPmremEnvironmentMap);

        // If the source was generated, then we should dispose of it right away
        if (environmentMapWasGenerated) {
          nonPmremEnvironmentMap.dispose();
        }
      } else if (environmentMapWasGenerated) {
        (environmentMap as any).userData = {
          ...userData,
          ...({
            mapping: 'Cube',
          })
        };
      }

      return {environmentMap, skybox};
    } catch (error) {
      if (skybox != null) {
        (skybox as any).dispose();
      }

      if (environmentMap != null) {
        (environmentMap as any).dispose();
      }

      throw error;
    } finally {
      updateGenerationProgress(1.0);
    }
  }

  gaussianBlur(cubeMap: Texture) {  //, standardDeviationRadians: number
    const blurScene = new Scene();

    const geometry = new BoxBufferGeometry();
    geometry.removeAttribute('uv');

    const blurMaterial = new ShaderMaterial({
      uniforms: {tCube: {value: null}, longitudinal: {value: 0}},
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
        uniform bool longitudinal;
        float dTheta = 0.1;
        varying vec3 vWorldDirection;
        void main() {
          vWorldDirection.x *= -1.0;
          vec4 texColor;
          for( int i = -3; i < 4; i++ ) {
            float diTheta = dTheta * i;
            if( longitudinal ) {
              mat2 R = mat2( cos(diTheta), sin(diTheta), - sin(diTheta), cos(diTheta) );
              vec3 sampleDirection = vec3( R * vWorldDirection.xy, vWorldDirection.z );
              texColor += mapTexelToLinear( textureCube( tCube, sampleDirection ) );
            } else {

            }
          }
          gl_FragColor = mapLinearToTexel( texColor / 7.0 );
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

    blurMaterial.uniforms.longitudinal.value = 0;
    blurMaterial.uniforms.tCube.value = cubeMap;
    blurCamera.update(this.renderer, blurScene);

    blurMaterial.uniforms.longitudinal.value = 1;
    blurMaterial.uniforms.tCube.value = blurCamera.renderTarget.texture;
    blurCamera.renderTarget.texture = cubeMap;
    blurCamera.update(this.renderer, blurScene);

    this.renderer.toneMapping = toneMapping;
    this.renderer.toneMappingExposure = toneMappingExposure;
    this.renderer.gammaOutput = gammaOutput;
  }

  /**
   * Takes a cube-ish (@see equirectangularToCubemap) texture and
   * returns a texture of the prefiltered mipmapped radiance environment map
   * to be used as environment maps in models.
   *
   * @param {THREE.Texture} texture
   * @param {number} samples
   * @param {number} resolution
   * @return {THREE.Texture}
   */
  pmremPass(texture: Texture, samples?: number, size?: number) {
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

    return renderTarget.texture;
  }

  dispose() {
    // NOTE(cdata): In the case that the generators are invoked with
    // an incorrect texture, the generators will throw when we attempt to
    // dispose of them because the framebuffer has not been created yet but the
    // implementation does not guard for this correctly:
    try {
      this.environmentMapGenerator.dispose();
      (this as any).environmentMapGenerator = null;
      if (this[$cubeGenerator] != null) {
        this[$cubeGenerator]!.dispose();
        this[$cubeGenerator] = null;
      }
    } catch (_error) {
    }
  }
}
