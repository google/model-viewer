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

import {BackSide, BoxBufferGeometry, Cache, CubeCamera, DataTextureLoader, EventDispatcher, GammaEncoding, LinearFilter, LinearMipMapLinearFilter, Mesh, NearestFilter, RawShaderMaterial, RGBEEncoding, Scene, Texture, TextureEncoding, TextureLoader, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetCube} from 'three';
import {LinearEncoding} from 'three';
import {UnsignedByteType} from 'three';
import {RGBFormat} from 'three';

import {CubemapGenerator} from '../third_party/three/EquirectangularToCubeGenerator.js';
import {RGBELoader} from '../third_party/three/RGBELoader.js';
import {ProgressTracker} from '../utilities/progress-tracker.js';

// import EnvironmentMapGenerator from './EnvironmentMapGenerator.js';
import {PMREMGenerator} from './NewPMREMGenerator.js';
import {generatePMREM} from './PMREMGenerator.js';
import {encodings, texelIO} from './shader-chunk/common.glsl.js';

export interface EnvironmentMapAndSkybox {
  environmentMap: WebGLRenderTarget;
  skybox: WebGLRenderTarget|null;
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
const CUBEMAP_SIZE = 256;
// const GENERATED_BLUR = 0.04;

const $environmentMapCache = Symbol('environmentMapCache');
const $generatedEnvironmentMap = Symbol('generatedEnvironmentMap');
const $PMREMGenerator = Symbol('PMREMGenerator');

const $loadEnvironmentMapFromUrl = Symbol('loadEnvironmentMapFromUrl');
const $loadGeneratedEnvironmentMap = Symbol('loadGeneratedEnvironmentMap');

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
  private renderer: WebGLRenderer;

  private[$generatedEnvironmentMap]: WebGLRenderTarget|null = null;
  private[$PMREMGenerator]: PMREMGenerator;

  private[$environmentMapCache] = new Map<string, Promise<WebGLRenderTarget>>();

  constructor(renderer: WebGLRenderer) {
    super();
    this.renderer = renderer;
    this[$PMREMGenerator] = new PMREMGenerator(this.renderer);
  }

  equirectangularToCubemap(texture: Texture): WebGLRenderTargetCube {
    const generator = new CubemapGenerator(this.renderer);

    let target = generator.fromEquirectangular(texture, {
      resolution: CUBEMAP_SIZE,
    });

    (target.texture as any).userData = {
      ...userData,
      ...({
        url: (texture as any).userData ? (texture as any).userData.url : null,
        mapping: 'Cube',
      })
    };

    return target;
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

  async loadEquirectAsCubeUV(
      url: string, progressCallback: (progress: number) => void = () => {}):
      Promise<WebGLRenderTarget> {
    let equirect = null;

    try {
      equirect = await this.load(url, progressCallback);
      return this[$PMREMGenerator].fromEquirectangular(equirect);
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
      let skyboxLoads: Promise<WebGLRenderTarget|null> = Promise.resolve(null);
      let environmentMapLoads: Promise<WebGLRenderTarget>;

      // If we have a skybox URL, attempt to load it as a cubemap
      if (!!skyboxUrl) {
        skyboxLoads =
            this[$loadEnvironmentMapFromUrl](skyboxUrl, progressTracker);
      }

      if (!!environmentMapUrl) {
        // We have an available environment map URL
        environmentMapLoads = this[$loadEnvironmentMapFromUrl](
            environmentMapUrl, progressTracker);
      } else if (!!skyboxUrl) {
        // Fallback to deriving the environment map from an available skybox
        environmentMapLoads = skyboxLoads as Promise<WebGLRenderTarget>;
      } else {
        // Fallback to generating the environment map
        environmentMapLoads = this[$loadGeneratedEnvironmentMap]();
      }

      let [environmentMap, skybox] =
          await Promise.all([environmentMapLoads, skyboxLoads]);

      return {environmentMap, skybox};
    } finally {
      updateGenerationProgress(1.0);
    }
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
          this.loadEquirectAsCubeUV(url, progressCallback);

      this[$environmentMapCache].set(url, environmentMapLoads);
    }

    return this[$environmentMapCache].get(url)!;
  }

  /**
   * Loads a dynamically generated environment map.
   */
  private[$loadGeneratedEnvironmentMap](): Promise<WebGLRenderTarget> {
    if (this[$generatedEnvironmentMap] == null) {
      // const environmentMapGenerator =
      //     new EnvironmentMapGenerator(this.renderer);
      // const interstitialEnvironmentMap = environmentMapGenerator.generate();

      // const blurredEnvironmentMap =
      //     this.gaussianBlur(interstitialEnvironmentMap, GENERATED_BLUR);

      // this[$generatedEnvironmentMap] = this.pmremPass(blurredEnvironmentMap);

      // // We should only ever generate this map once, and we will not be using
      // // the environment map as a skybox, so go ahead and dispose of all
      // // interstitial artifacts:
      // interstitialEnvironmentMap.dispose();
      // blurredEnvironmentMap.dispose();
      // environmentMapGenerator.dispose();

      this[$generatedEnvironmentMap] = this[$PMREMGenerator].fromDefault();
    }

    return Promise.resolve(this[$generatedEnvironmentMap]!);
  }

  gaussianBlur(
      cubeTarget: WebGLRenderTargetCube, standardDeviationRadians: number,
      outputEncoding?: TextureEncoding): WebGLRenderTargetCube {
    const blurScene = new Scene();

    const geometry = new BoxBufferGeometry();
    geometry.removeAttribute('uv');

    const cubeResolution = cubeTarget.width;
    const standardDeviations = 3;
    const n = Math.ceil(
        standardDeviations * standardDeviationRadians * cubeResolution * 4 /
        Math.PI);
    const inverseIntegral =
        standardDeviations / ((n - 1) * Math.sqrt(2 * Math.PI));
    let weights = [];
    for (let i = 0; i < n; ++i) {
      const x = standardDeviations * i / (n - 1);
      weights.push(inverseIntegral * Math.exp(-x * x / 2));
    }

    const blurMaterial = new RawShaderMaterial({
      defines: {n: n},
      uniforms: {
        tCube: {value: null},
        latitudinal: {value: false},
        weights: {value: weights},
        dTheta:
            {value: standardDeviationRadians * standardDeviations / (n - 1)},
        inputEncoding: {value: encodings[LinearEncoding]},
        outputEncoding: {value: encodings[LinearEncoding]}
      },
      vertexShader: `
precision mediump float;
precision mediump int;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
varying vec3 vPosition;
void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
      `,
      fragmentShader: `
precision mediump float;
precision mediump int;
varying vec3 vPosition;
uniform float weights[n];
uniform samplerCube tCube;
uniform bool latitudinal;
uniform float dTheta;
${texelIO}
void main() {
  vec4 texColor = vec4(0.0);
  for (int i = 0; i < n; i++) {
    for (int dir = -1; dir < 2; dir += 2) {
      if (i == 0 && dir == 1)
        continue;
      vec3 sampleDirection = vPosition;
      float xz = length(sampleDirection.xz);
      float weight = weights[i];
      if (latitudinal) {
        float diTheta = dTheta * float(dir * i) / xz;
        mat2 R = mat2(cos(diTheta), sin(diTheta), -sin(diTheta), cos(diTheta));
        sampleDirection.xz = R * sampleDirection.xz;
        texColor += weight * inputTexelToLinear(textureCube(tCube, sampleDirection));
      } else {
        float diTheta = dTheta * float(dir * i);
        mat2 R = mat2(cos(diTheta), sin(diTheta), -sin(diTheta), cos(diTheta));
        vec2 xzY = R * vec2(xz, sampleDirection.y);
        sampleDirection.xz *= xzY.x / xz;
        sampleDirection.y = xzY.y;
        texColor += weight * inputTexelToLinear(textureCube(tCube, sampleDirection));
      }
    }
  }
  gl_FragColor = texColor;
  gl_FragColor = linearToOutputTexel(gl_FragColor);
}
      `,
      side: BackSide,
      depthTest: false,
      depthWrite: false
    });

    blurScene.add(new Mesh(geometry, blurMaterial));
    const blurUniforms = blurMaterial.uniforms;

    const cubeTexture = cubeTarget.texture;
    let blurTargetOptions = {
      type: cubeTexture.type,
      format: cubeTexture.format,
      encoding: cubeTexture.encoding,
      generateMipmaps: cubeTexture.generateMipmaps,
      minFilter: cubeTexture.minFilter,
      magFilter: cubeTexture.magFilter
    };

    // Three.js bug: CubeCamera.d.ts constructor is not up to date with
    // CubeCamera.js
    let blurCamera =
        new (CubeCamera as any)(0.1, 100, cubeResolution, blurTargetOptions);
    const tempTexture = blurCamera.renderTarget.texture;

    blurUniforms.latitudinal.value = false;
    blurUniforms.tCube.value = cubeTexture;
    blurUniforms.inputEncoding.value = encodings[cubeTexture.encoding];
    blurUniforms.outputEncoding.value = encodings[tempTexture.encoding];
    blurCamera.update(this.renderer, blurScene);

    if (outputEncoding === GammaEncoding &&
        cubeTexture.encoding !== GammaEncoding) {
      blurTargetOptions = {
        type: UnsignedByteType,
        format: RGBFormat,
        encoding: outputEncoding,
        generateMipmaps: true,
        minFilter: LinearMipMapLinearFilter,
        magFilter: LinearFilter
      };
    }
    const outputCamera =
        new (CubeCamera as any)(0.1, 100, cubeResolution, blurTargetOptions);
    const outputTarget = outputCamera.renderTarget;
    (outputTarget.texture as any).userData = {
      ...userData,
      ...({
        url: (cubeTexture as any).userData ? (cubeTexture as any).userData.url :
                                             null,
        mapping: 'Cube',
      })
    };

    blurUniforms.latitudinal.value = true;
    blurUniforms.tCube.value = tempTexture;
    blurUniforms.inputEncoding.value = encodings[tempTexture.encoding];
    blurUniforms.outputEncoding.value =
        encodings[outputTarget.texture.encoding];
    outputCamera.update(this.renderer, blurScene);

    tempTexture.dispose();
    return outputTarget;
  }

  /**
   * Takes a cube-ish (@see equirectangularToCubemap) texture and
   * returns a texture of the prefiltered mipmapped radiance environment map
   * to be used as environment maps in models.
   */
  pmremPass(target: WebGLRenderTargetCube): WebGLRenderTarget {
    const cubeUVTarget = generatePMREM(target, this.renderer);

    (cubeUVTarget.texture as any).userData = {
      ...userData,
      ...({
        url: (target.texture as any).userData ?
            (target.texture as any).userData.url :
            null,
        mapping: 'PMREM',
      })
    };

    return cubeUVTarget;
  }

  async dispose() {
    const allTargetsLoad: Array<Promise<WebGLRenderTarget>> = [];

    // NOTE(cdata): We would use for-of iteration on the maps here, but
    // IE11 doesn't have the necessary iterator-returning methods. So,
    // disposal of these render targets is kind of convoluted as a result.

    this[$environmentMapCache].forEach((targetLoads) => {
      allTargetsLoad.push(targetLoads);
    });

    this[$environmentMapCache].clear();

    for (const targetLoads of allTargetsLoad) {
      try {
        const target = await targetLoads;
        target.dispose();
      } catch (e) {
        // Suppress errors, so that all render targets will be disposed
      }
    }

    if (this[$generatedEnvironmentMap] != null) {
      this[$generatedEnvironmentMap]!.dispose();
      this[$generatedEnvironmentMap] = null;
    }
  }
}
