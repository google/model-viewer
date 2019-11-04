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

import {BufferAttribute, BufferGeometry, CubeUVReflectionMapping, LinearEncoding, LinearToneMapping, Mesh, NearestFilter, NoBlending, OrthographicCamera, PerspectiveCamera, RawShaderMaterial, RGBEEncoding, RGBEFormat, Scene, Texture, UnsignedByteType, Vector2, WebGLRenderer, WebGLRenderTarget} from 'three';

import EnvironmentScene from './EnvironmentScene.js';
import {encodings, getDirectionChunk, texelIO} from './shader-chunk/common.glsl.js';
import {bilinearCubeUVChunk} from './shader-chunk/cube_uv_reflection_fragment.glsl.js';

const LOD_MIN = 4;
const LOD_MAX = 8;
// The roughness values associated with the extra mips. These must match
// cube_uv_reflection_fragment.glsl.js.
const EXTRA_LOD_ROUGHNESS = [0.22, 0.32, 0.5, 0.7, 1.0];
// The standard deviations (radians) associated with the extra mips. These are
// chosen to approximate a Trowbridge-Reitz distribution function times the
// geometric shadowing function.
const EXTRA_LOD_SIGMA = [0.12, 0.25, 0.35, 0.43, 0.5];
const SIZE_MAX = Math.pow(2, LOD_MAX);
const TOTAL_LODS = LOD_MAX - LOD_MIN + 1 + EXTRA_LOD_ROUGHNESS.length;

// Number of standard deviations at which to cut off the discrete approximation.
const STANDARD_DEVIATIONS = 3;
// The maximum length of the blur for loop, chosen to equal the number needed
// for GENERATED_SIGMA. Smaller sigmas will use fewer samples and exit early,
// but not recompile the shader.
const MAX_SAMPLES = 20;
const GENERATED_SIGMA = 0.04;
const DEFAULT_NEAR = 0.1;
const DEFAULT_FAR = 100;

const $roughness = Symbol('roughness');
const $sigma = Symbol('sigma');
const $sizeLod = Symbol('sizeLod');
const $lodPlanes = Symbol('lodPlanes');
const $blurMaterial = Symbol('blurMaterial');
const $flatCamera = Symbol('flatCamera');
const $pingPongRenderTarget = Symbol('pingP$pingPongRenderTarget');

const $sceneToCubeUV = Symbol('sceneToCubeUV');
const $equirectangularToCubeUV = Symbol('equirectangularToCubeUV');
const $createRenderTarget = Symbol('createRenderTarget');
const $applyPMREM = Symbol('applyPMREM');
const $blur = Symbol('blur');
const $halfBlur = Symbol('halfBlur');

/**
 * This class generates a Prefiltered, Mipmapped Radiance Environment Map
 * (PMREM) from a cubeMap environment texture. This allows different levels of
 * blur to be quickly accessed based on material roughness. It is packed into a
 * special CubeUV format that allows us to perform custom interpolation so that
 * we can support nonlinear formats such as RGBE. Unlike a traditional mipmap
 * chain, it only goes down to the LOD_MIN level (above), and then creates extra
 * even more filtered 'mips' at the same LOD_MIN resolution, associated with
 * higher roughness levels. In this way we maintain resolution to smoothly
 * interpolate diffuse lighting while limiting sampling computation.
 */

export class PMREMGenerator {
  // These arrays will each be TOTAL_LODS in length, each referring to a 'mip'.
  private[$roughness]: Array<number> = [];
  private[$sigma]: Array<number> = [];
  private[$sizeLod]: Array<number> = [];
  private[$lodPlanes]: Array<BufferGeometry> = [];

  private[$blurMaterial] = new BlurMaterial(MAX_SAMPLES);
  private[$flatCamera] = new OrthographicCamera(0, 1, 0, 1, 0, 1);
  private[$pingPongRenderTarget]: WebGLRenderTarget;

  constructor(private renderer: WebGLRenderer) {
    let lod = LOD_MAX;
    for (let i = 0; i < TOTAL_LODS; i++) {
      const sizeLod = Math.pow(2, lod);
      this[$sizeLod].push(sizeLod);
      let sigma = 1.0 / sizeLod;
      let roughness =
          (1 + Math.sqrt(1 + 4 * Math.PI * sizeLod)) / (2 * Math.PI * sizeLod);
      if (i > LOD_MAX - LOD_MIN) {
        roughness = EXTRA_LOD_ROUGHNESS[i - LOD_MAX + LOD_MIN - 1];
        sigma = EXTRA_LOD_SIGMA[i - LOD_MAX + LOD_MIN - 1];
      } else if (i == 0) {
        sigma = 0;
      }
      this[$sigma].push(sigma);
      this[$roughness].push(roughness);

      const texelSize = 1.0 / (sizeLod - 1);
      const min = -texelSize / 2;
      const max = 1 + texelSize / 2;
      const uv1 = [min, min, max, min, max, max, min, min, max, max, min, max];

      const cubeFaces = 6;
      const vertices = 6;
      const positionSize = 3;
      const uvSize = 2;
      const faceIndexSize = 1;

      const position = new Float32Array(positionSize * vertices * cubeFaces);
      const uv = new Float32Array(uvSize * vertices * cubeFaces);
      const faceIndex = new Float32Array(faceIndexSize * vertices * cubeFaces);

      for (let face = 0; face < cubeFaces; face++) {
        const x = (face % 3) * 2 / 3 - 1;
        const y = face > 2 ? 0 : -1;
        const coordinates = [
          [x, y, 0],
          [x + 2 / 3, y, 0],
          [x + 2 / 3, y + 1, 0],
          [x, y, 0],
          [x + 2 / 3, y + 1, 0],
          [x, y + 1, 0]
        ];
        position.set(
            ([] as number[]).concat(...coordinates),
            positionSize * vertices * face);
        uv.set(uv1, uvSize * vertices * face);
        const fill = [face, face, face, face, face, face];
        faceIndex.set(fill, faceIndexSize * vertices * face);
      }
      const planes = new BufferGeometry();
      planes.addAttribute(
          'position', new BufferAttribute(position, positionSize));
      planes.addAttribute('uv', new BufferAttribute(uv, uvSize));
      planes.addAttribute(
          'faceIndex', new BufferAttribute(faceIndex, faceIndexSize));
      this[$lodPlanes].push(planes);

      if (lod > LOD_MIN) {
        lod--;
      }
    }
  }

  /**
   * Generates a PMREM from our default EnvironmentScene, which is a blurry
   * greyscale room with several boxes on the floor and several lit windows.
   */
  fromDefault(): WebGLRenderTarget {
    const dpr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    const defaultScene = new EnvironmentScene;

    const cubeUVRenderTarget =
        this[$sceneToCubeUV](defaultScene, DEFAULT_NEAR, DEFAULT_FAR);
    this[$blur](cubeUVRenderTarget, 0, 0, GENERATED_SIGMA);
    this[$applyPMREM](cubeUVRenderTarget);

    defaultScene.dispose();
    this.renderer.setPixelRatio(dpr);
    return cubeUVRenderTarget;
  }

  /**
   * Generates a PMREM from a supplied Scene, which can be faster than using an
   * image if networking bandwidth is low. Optional near and far planes ensure
   * the scene is rendered in its entirety (the cubeCamera is placed at the
   * origin).
   */
  fromScene(
      scene: Scene, near: number = DEFAULT_NEAR,
      far: number = DEFAULT_FAR): WebGLRenderTarget {
    const dpr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);

    const cubeUVRenderTarget = this[$sceneToCubeUV](scene, near, far);
    this[$applyPMREM](cubeUVRenderTarget);

    this.renderer.setPixelRatio(dpr);
    return cubeUVRenderTarget;
  }

  /**
   * Generates a PMREM from an equirectangular texture, which can be either LDR
   * (RGBFormat) or HDR (RGBEFormat).
   */
  fromEquirectangular(equirectangular: Texture): WebGLRenderTarget {
    const dpr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);

    equirectangular.magFilter = NearestFilter;
    equirectangular.minFilter = NearestFilter;
    equirectangular.generateMipmaps = false;

    const cubeUVRenderTarget = this[$equirectangularToCubeUV](equirectangular);
    this[$applyPMREM](cubeUVRenderTarget);

    this.renderer.setPixelRatio(dpr);
    return cubeUVRenderTarget;
  }

  private[$sceneToCubeUV](scene: Scene, near: number, far: number):
      WebGLRenderTarget {
    const params = {
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      generateMipmaps: false,
      type: UnsignedByteType,
      format: RGBEFormat,
      encoding: RGBEEncoding
    };
    const cubeUVRenderTarget = this[$createRenderTarget](params);
    this[$pingPongRenderTarget] = this[$createRenderTarget](params);

    const fov = 90;
    const aspect = 1;
    const cubeCamera = new PerspectiveCamera(fov, aspect, near, far);
    const upSign = [1, 1, 1, 1, -1, 1];
    const forwardSign = [1, 1, -1, -1, -1, 1];

    const gammaOutput = this.renderer.gammaOutput;
    const toneMapping = this.renderer.toneMapping;
    const toneMappingExposure = this.renderer.toneMappingExposure;

    this.renderer.toneMapping = LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.gammaOutput = false;
    scene.scale.z *= -1;

    this.renderer.setRenderTarget(cubeUVRenderTarget);
    for (let i = 0; i < 6; i++) {
      const col = i % 3;
      if (col == 0) {
        cubeCamera.up.set(0, upSign[i], 0);
        cubeCamera.lookAt(forwardSign[i], 0, 0);
      } else if (col == 1) {
        cubeCamera.up.set(0, 0, upSign[i]);
        cubeCamera.lookAt(0, forwardSign[i], 0);
      } else {
        cubeCamera.up.set(0, upSign[i], 0);
        cubeCamera.lookAt(0, 0, forwardSign[i]);
      }
      this.renderer.setViewport(
          col * SIZE_MAX, i > 2 ? SIZE_MAX : 0, SIZE_MAX, SIZE_MAX);
      this.renderer.render(scene, cubeCamera);
    }

    this.renderer.toneMapping = toneMapping;
    this.renderer.toneMappingExposure = toneMappingExposure;
    this.renderer.gammaOutput = gammaOutput;
    scene.scale.z *= -1;

    return cubeUVRenderTarget;
  }

  private[$equirectangularToCubeUV](equirectangular: Texture):
      WebGLRenderTarget {
    const params = {
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      generateMipmaps: false,
      type: equirectangular.type,
      format: equirectangular.format,
      encoding: equirectangular.encoding
    };
    const cubeUVRenderTarget = this[$createRenderTarget](params);
    this[$pingPongRenderTarget] = this[$createRenderTarget](params);

    const scene = new Scene();
    scene.add(new Mesh(this[$lodPlanes][0], this[$blurMaterial]));
    const uniforms = this[$blurMaterial].uniforms;

    uniforms['envMap'].value = equirectangular;
    uniforms['copyEquirectangular'].value = true;
    uniforms['texelSize'].value = new Vector2(
        1.0 / equirectangular.image.width, 1.0 / equirectangular.image.height);
    uniforms['inputEncoding'].value = encodings[equirectangular.encoding];
    uniforms['outputEncoding'].value = encodings[equirectangular.encoding];

    this.renderer.setRenderTarget(cubeUVRenderTarget);
    this.renderer.setViewport(0, 0, 3 * SIZE_MAX, 2 * SIZE_MAX);
    this.renderer.render(scene, this[$flatCamera]);

    return cubeUVRenderTarget;
  }

  private[$createRenderTarget](params: Object): WebGLRenderTarget {
    const cubeUVRenderTarget =
        new WebGLRenderTarget(3 * SIZE_MAX, 3 * SIZE_MAX, params);
    cubeUVRenderTarget.texture.mapping = CubeUVReflectionMapping;
    cubeUVRenderTarget.texture.name = 'PMREM.cubeUv';
    return cubeUVRenderTarget;
  }

  private[$applyPMREM](cubeUVRenderTarget: WebGLRenderTarget) {
    for (let i = 1; i < TOTAL_LODS; i++) {
      const sigma = Math.sqrt(
          this[$sigma][i] * this[$sigma][i] -
          this[$sigma][i - 1] * this[$sigma][i - 1]);
      this[$blur](cubeUVRenderTarget, i - 1, i, sigma);
    }

    this[$pingPongRenderTarget].dispose();
  }

  /**
   * This is a two-pass Gaussian blur for a cubemap. Normally this is done
   * vertically and horizontally, but this breaks down on a cube. Here we apply
   * the blur latitudinally (around the poles), and then longitudinally (towards
   * the poles) to approximate the orthogonally-separable blur. It is least
   * accurate at the poles, but still does a decent job.
   */
  private[$blur](
      cubeUVRenderTarget: WebGLRenderTarget, lodIn: number, lodOut: number,
      sigma: number) {
    this[$halfBlur](
        cubeUVRenderTarget,
        this[$pingPongRenderTarget],
        lodIn,
        lodOut,
        sigma,
        'latitudinal');

    this[$halfBlur](
        this[$pingPongRenderTarget],
        cubeUVRenderTarget,
        lodOut,
        lodOut,
        sigma,
        'longitudinal');
  }

  private[$halfBlur](
      targetIn: WebGLRenderTarget, targetOut: WebGLRenderTarget, lodIn: number,
      lodOut: number, sigmaRadians: number, direction: string) {
    if (direction !== 'latitudinal' && direction !== 'longitudinal') {
      console.error(
          'blur direction must be either latitudinal or longitudinal!');
    }

    const blurScene = new Scene();
    blurScene.add(new Mesh(this[$lodPlanes][lodOut], this[$blurMaterial]));
    const blurUniforms = this[$blurMaterial].uniforms;

    const pixels = this[$sizeLod][lodIn] - 1;
    const radiansPerPixel = Math.PI / (2 * pixels);
    const sigmaPixels = sigmaRadians / radiansPerPixel;
    const samples = 1 + Math.floor(STANDARD_DEVIATIONS * sigmaPixels);

    if (samples > MAX_SAMPLES) {
      console.warn(`sigmaRadians, ${
          sigmaRadians}, is too large and will clip, as it requested ${
          samples} samples when the maximum is set to ${MAX_SAMPLES}`);
    }

    let weights = [];
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; ++i) {
      const x = i / sigmaPixels;
      const weight = Math.exp(-x * x / 2);
      weights.push(weight);
      if (i == 0) {
        sum += weight;
      } else if (i < samples) {
        sum += 2 * weight;
      }
    }
    weights = weights.map(w => w / sum);

    blurUniforms['envMap'].value = targetIn.texture;
    blurUniforms['copyEquirectangular'].value = false;
    blurUniforms['samples'].value = samples;
    blurUniforms['weights'].value = weights;
    blurUniforms['latitudinal'].value = direction === 'latitudinal';
    blurUniforms['dTheta'].value = radiansPerPixel;
    blurUniforms['mipInt'].value = LOD_MAX - lodIn;
    blurUniforms['inputEncoding'].value = encodings[targetIn.texture.encoding];
    blurUniforms['outputEncoding'].value = encodings[targetIn.texture.encoding];

    const outputSize = this[$sizeLod][lodOut];
    const x = 3 * Math.max(0, SIZE_MAX - 2 * outputSize);
    const y = (lodOut === 0 ? 0 : 2 * SIZE_MAX) +
        2 * outputSize *
            (lodOut > LOD_MAX - LOD_MIN ? lodOut - LOD_MAX + LOD_MIN : 0);
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(targetOut);
    this.renderer.setViewport(x, y, 3 * outputSize, 2 * outputSize);
    this.renderer.render(blurScene, this[$flatCamera]);
  }
};


class BlurMaterial extends RawShaderMaterial {
  constructor(maxSamples: number) {
    const weights = new Float32Array(maxSamples);
    const texelSize = new Vector2(1, 1);

    super({

      defines: {'n': maxSamples},

      uniforms: {
        'envMap': {value: null},
        'copyEquirectangular': {value: false},
        'texelSize': {value: texelSize},
        'samples': {value: 1},
        'weights': {value: weights},
        'latitudinal': {value: false},
        'dTheta': {value: 0},
        'mipInt': {value: 0},
        'inputEncoding': {value: encodings[LinearEncoding]},
        'outputEncoding': {value: encodings[LinearEncoding]}
      },

      vertexShader: `
precision mediump float;
precision mediump int;
attribute vec3 position;
attribute vec2 uv;
attribute float faceIndex;
varying vec3 vOutputDirection;
${getDirectionChunk}
void main() {
    vOutputDirection = getDirection(uv, faceIndex);
    gl_Position = vec4( position, 1.0 );
}
      `,

      fragmentShader: `
precision mediump float;
precision mediump int;
varying vec3 vOutputDirection;
uniform sampler2D envMap;
uniform bool copyEquirectangular;
uniform vec2 texelSize;
uniform int samples;
uniform float weights[n];
uniform bool latitudinal;
uniform float dTheta;
uniform float mipInt;
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494
${texelIO} 
vec4 envMapTexelToLinear(vec4 color) {
  return inputTexelToLinear(color);
}
${bilinearCubeUVChunk}
void main() {
  gl_FragColor = vec4(0.0);
  if (copyEquirectangular) {
    vec3 direction = normalize(vOutputDirection);
    vec2 uv;
    uv.y = asin(clamp(direction.y, -1.0, 1.0)) * RECIPROCAL_PI + 0.5;
    uv.x = atan(direction.z, direction.x) * RECIPROCAL_PI2 + 0.5;
    vec2 f = fract(uv / texelSize - 0.5);
    uv -= f * texelSize;
    vec3 tl = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
    uv.x += texelSize.x;
    vec3 tr = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
    uv.y += texelSize.y;
    vec3 br = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
    uv.x -= texelSize.x;
    vec3 bl = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
    vec3 tm = mix(tl, tr, f.x);
    vec3 bm = mix(bl, br, f.x);
    gl_FragColor.rgb = mix(tm, bm, f.y);
  } else {
    float xz = length(vOutputDirection.xz);
    for (int i = 0; i < n; i++) {
      if (i >= samples)
        break;
      for (int dir = -1; dir < 2; dir += 2) {
        if (i == 0 && dir == 1)
          continue;
        vec3 sampleDirection = vOutputDirection;
        if (latitudinal) {
          float diTheta = dTheta * float(dir * i) / xz;
          mat2 R =
              mat2(cos(diTheta), sin(diTheta), -sin(diTheta), cos(diTheta));
          sampleDirection.xz = R * sampleDirection.xz;
        } else {
          float diTheta = dTheta * float(dir * i);
          mat2 R =
              mat2(cos(diTheta), sin(diTheta), -sin(diTheta), cos(diTheta));
          vec2 xzY = R * vec2(xz, sampleDirection.y);
          if (xzY.x < 0.0) {
            sampleDirection = vec3(0.0, sign(sampleDirection.y), 0.0);
          } else {
            sampleDirection.xz *= xzY.x / xz;
            sampleDirection.y = xzY.y;
          }
        }
        gl_FragColor.rgb +=
            weights[i] * bilinearCubeUV(envMap, sampleDirection, mipInt);
      }
    }
  }
  gl_FragColor = linearToOutputTexel(gl_FragColor);
}
      `,

      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    });

    this.type = 'GaussianBlur';
  }
}
