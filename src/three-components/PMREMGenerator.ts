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

import {BufferAttribute, BufferGeometry, CubeUVReflectionMapping, LinearEncoding, LinearToneMapping, Mesh, NearestFilter, NoBlending, OrthographicCamera, PerspectiveCamera, RawShaderMaterial, RGBEEncoding, RGBEFormat, Scene, Texture, UnsignedByteType, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget} from 'three';

import EnvironmentScene from './EnvironmentScene.js';
import {encodings, getDirectionChunk, texelIO} from './shader-chunk/common.glsl.js';
import {bilinearCubeUVChunk} from './shader-chunk/cube_uv_reflection_fragment.glsl.js';

const LOD_MIN = 4;
const LOD_MAX = 8;
// The roughness values associated with the extra mips. These must match
// varianceDefines from common.glsl.js.
const EXTRA_LOD_ROUGHNESS = [0.305, 0.4, 0.533, 0.666, 0.8, 1.0];
// The standard deviations (radians) associated with the extra mips. These are
// chosen to approximate a Trowbridge-Reitz distribution function times the
// geometric shadowing function.
const EXTRA_LOD_SIGMA = [0.125, 0.215, 0.35, 0.446, 0.526, 0.582];
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
// Golden Ratio
const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;

const $roughness = Symbol('roughness');
const $sigma = Symbol('sigma');
const $sizeLod = Symbol('sizeLod');
const $lodPlanes = Symbol('lodPlanes');
const $axisDirections = Symbol('axisDirections');
const $blurMaterial = Symbol('blurMaterial');
const $flatCamera = Symbol('flatCamera');
const $pingPongRenderTarget = Symbol('pingPongRenderTarget');

const $allocateTargets = Symbol('allocateTargets');
const $sceneToCubeUV = Symbol('sceneToCubeUV');
const $equirectangularToCubeUV = Symbol('equirectangularToCubeUV');
const $createRenderTarget = Symbol('createRenderTarget');
const $setViewport = Symbol('setViewport');
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
  private[$axisDirections]: Array<Vector3> = [];

  private[$blurMaterial] = new BlurMaterial(MAX_SAMPLES);
  private[$flatCamera] = new OrthographicCamera(0, 1, 0, 1, 0, 1);
  private[$pingPongRenderTarget]: WebGLRenderTarget;

  constructor(private threeRenderer: WebGLRenderer) {
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
      planes.setAttribute(
          'position', new BufferAttribute(position, positionSize));
      planes.setAttribute('uv', new BufferAttribute(uv, uvSize));
      planes.setAttribute(
          'faceIndex', new BufferAttribute(faceIndex, faceIndexSize));
      this[$lodPlanes].push(planes);

      if (lod > LOD_MIN) {
        lod--;
      }
    }
    // Vertices of a dodecahedron (except the opposites, which represent the
    // same axis), used as axis directions evenly spread on a sphere.
    this[$axisDirections].push(
        new Vector3(1, 1, 1),
        new Vector3(-1, 1, 1),
        new Vector3(1, 1, -1),
        new Vector3(-1, 1, -1),
        new Vector3(0, PHI, -INV_PHI),
        new Vector3(INV_PHI, 0, PHI),
        new Vector3(-INV_PHI, 0, PHI),
        new Vector3(PHI, INV_PHI, 0),
        new Vector3(-PHI, INV_PHI, 0));
  }

  /**
   * Generates a PMREM from our default EnvironmentScene, which is a blurry
   * greyscale room with several boxes on the floor and several lit windows.
   */
  fromDefault(): WebGLRenderTarget {
    const defaultScene = new EnvironmentScene;

    const cubeUVRenderTarget = this[$allocateTargets]();
    this[$sceneToCubeUV](
        defaultScene, DEFAULT_NEAR, DEFAULT_FAR, cubeUVRenderTarget);
    this[$blur](cubeUVRenderTarget, 0, 0, GENERATED_SIGMA);
    this[$applyPMREM](cubeUVRenderTarget);

    this[$pingPongRenderTarget].dispose();
    defaultScene.dispose();
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
    const cubeUVRenderTarget = this[$allocateTargets]();
    this[$sceneToCubeUV](scene, near, far, cubeUVRenderTarget);
    this[$applyPMREM](cubeUVRenderTarget);

    this[$pingPongRenderTarget].dispose();
    return cubeUVRenderTarget;
  }

  /**
   * Generates a PMREM from an equirectangular texture, which can be either LDR
   * (RGBFormat) or HDR (RGBEFormat).
   */
  fromEquirectangular(equirectangular: Texture): WebGLRenderTarget {
    equirectangular.magFilter = NearestFilter;
    equirectangular.minFilter = NearestFilter;
    equirectangular.generateMipmaps = false;

    const cubeUVRenderTarget = this[$allocateTargets](equirectangular);
    this[$equirectangularToCubeUV](equirectangular, cubeUVRenderTarget);
    this[$applyPMREM](cubeUVRenderTarget);

    this[$pingPongRenderTarget].dispose();
    return cubeUVRenderTarget;
  }

  private[$allocateTargets](equirectangular?: Texture): WebGLRenderTarget {
    const params = {
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      generateMipmaps: false,
      type: equirectangular ? equirectangular.type : UnsignedByteType,
      format: equirectangular ? equirectangular.format : RGBEFormat,
      encoding: equirectangular ? equirectangular.encoding : RGBEEncoding,
      depthBuffer: false,
      stencilBuffer: false
    };
    const cubeUVRenderTarget = this[$createRenderTarget](
        {...params, depthBuffer: (equirectangular ? false : true)});
    this[$pingPongRenderTarget] = this[$createRenderTarget](params);
    return cubeUVRenderTarget;
  }

  private[$sceneToCubeUV](
      scene: Scene, near: number, far: number,
      cubeUVRenderTarget: WebGLRenderTarget) {
    const fov = 90;
    const aspect = 1;
    const cubeCamera = new PerspectiveCamera(fov, aspect, near, far);
    const upSign = [1, 1, 1, 1, -1, 1];
    const forwardSign = [1, 1, -1, -1, -1, 1];

    const gammaOutput = this.threeRenderer.gammaOutput;
    const toneMapping = this.threeRenderer.toneMapping;
    const toneMappingExposure = this.threeRenderer.toneMappingExposure;

    this.threeRenderer.toneMapping = LinearToneMapping;
    this.threeRenderer.toneMappingExposure = 1.0;
    this.threeRenderer.gammaOutput = false;
    scene.scale.z *= -1;

    this.threeRenderer.setRenderTarget(cubeUVRenderTarget);
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
      this[$setViewport](
          col * SIZE_MAX, i > 2 ? SIZE_MAX : 0, SIZE_MAX, SIZE_MAX);
      this.threeRenderer.render(scene, cubeCamera);
    }

    this.threeRenderer.toneMapping = toneMapping;
    this.threeRenderer.toneMappingExposure = toneMappingExposure;
    this.threeRenderer.gammaOutput = gammaOutput;
    scene.scale.z *= -1;
  }

  private[$equirectangularToCubeUV](
      equirectangular: Texture, cubeUVRenderTarget: WebGLRenderTarget) {
    const scene = new Scene();
    scene.add(new Mesh(this[$lodPlanes][0], this[$blurMaterial]));
    const uniforms = this[$blurMaterial].uniforms;

    uniforms['envMap'].value = equirectangular;
    uniforms['copyEquirectangular'].value = true;
    uniforms['texelSize'].value.set(
        1.0 / equirectangular.image.width, 1.0 / equirectangular.image.height);
    uniforms['inputEncoding'].value = encodings[equirectangular.encoding];
    uniforms['outputEncoding'].value = encodings[equirectangular.encoding];

    this.threeRenderer.setRenderTarget(cubeUVRenderTarget);
    this[$setViewport](0, 0, 3 * SIZE_MAX, 2 * SIZE_MAX);
    this.threeRenderer.render(scene, this[$flatCamera]);
  }

  private[$createRenderTarget](params: Object): WebGLRenderTarget {
    const cubeUVRenderTarget =
        new WebGLRenderTarget(3 * SIZE_MAX, 3 * SIZE_MAX, params);
    cubeUVRenderTarget.texture.mapping = CubeUVReflectionMapping;
    cubeUVRenderTarget.texture.name = 'PMREM.cubeUv';
    return cubeUVRenderTarget;
  }

  private[$setViewport](x: number, y: number, width: number, height: number) {
    const dpr = this.threeRenderer.getPixelRatio();
    this.threeRenderer.setViewport(x / dpr, y / dpr, width / dpr, height / dpr);
  }

  private[$applyPMREM](cubeUVRenderTarget: WebGLRenderTarget) {
    for (let i = 1; i < TOTAL_LODS; i++) {
      const sigma = Math.sqrt(
          this[$sigma][i] * this[$sigma][i] -
          this[$sigma][i - 1] * this[$sigma][i - 1]);
      const poleAxis =
          this[$axisDirections][(i - 1) % this[$axisDirections].length];
      this[$blur](cubeUVRenderTarget, i - 1, i, sigma, poleAxis);
    }
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
      sigma: number, poleAxis?: Vector3) {
    this[$halfBlur](
        cubeUVRenderTarget,
        this[$pingPongRenderTarget],
        lodIn,
        lodOut,
        sigma,
        'latitudinal',
        poleAxis);

    this[$halfBlur](
        this[$pingPongRenderTarget],
        cubeUVRenderTarget,
        lodOut,
        lodOut,
        sigma,
        'longitudinal',
        poleAxis);
  }

  private[$halfBlur](
      targetIn: WebGLRenderTarget, targetOut: WebGLRenderTarget, lodIn: number,
      lodOut: number, sigmaRadians: number, direction: string,
      poleAxis?: Vector3) {
    if (direction !== 'latitudinal' && direction !== 'longitudinal') {
      console.error(
          'blur direction must be either latitudinal or longitudinal!');
    }

    const blurScene = new Scene();
    blurScene.add(new Mesh(this[$lodPlanes][lodOut], this[$blurMaterial]));
    const blurUniforms = this[$blurMaterial].uniforms;

    const pixels = this[$sizeLod][lodIn] - 1;
    const radiansPerPixel = isFinite(sigmaRadians) ?
        Math.PI / (2 * pixels) :
        2 * Math.PI / (2 * MAX_SAMPLES - 1);
    const sigmaPixels = sigmaRadians / radiansPerPixel;
    const samples = isFinite(sigmaRadians) ?
        1 + Math.floor(STANDARD_DEVIATIONS * sigmaPixels) :
        MAX_SAMPLES;

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
    if (poleAxis) {
      blurUniforms['poleAxis'].value = poleAxis;
    }
    blurUniforms['dTheta'].value = radiansPerPixel;
    blurUniforms['mipInt'].value = LOD_MAX - lodIn;
    blurUniforms['inputEncoding'].value = encodings[targetIn.texture.encoding];
    blurUniforms['outputEncoding'].value = encodings[targetIn.texture.encoding];

    const outputSize = this[$sizeLod][lodOut];
    const x = 3 * Math.max(0, SIZE_MAX - 2 * outputSize);
    const y = (lodOut === 0 ? 0 : 2 * SIZE_MAX) +
        2 * outputSize *
            (lodOut > LOD_MAX - LOD_MIN ? lodOut - LOD_MAX + LOD_MIN : 0);
    this.threeRenderer.autoClear = false;

    this.threeRenderer.setRenderTarget(targetOut);
    this[$setViewport](x, y, 3 * outputSize, 2 * outputSize);
    this.threeRenderer.render(blurScene, this[$flatCamera]);
  }
};


class BlurMaterial extends RawShaderMaterial {
  constructor(maxSamples: number) {
    const weights = new Float32Array(maxSamples);
    const texelSize = new Vector2(1, 1);
    const poleAxis = new Vector3(0, 1, 0);

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
        'poleAxis': {value: poleAxis},
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
uniform vec3 poleAxis;
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
    for (int i = 0; i < n; i++) {
      if (i >= samples)
        break;
      for (int dir = -1; dir < 2; dir += 2) {
        if (i == 0 && dir == 1)
          continue;
        vec3 axis = latitudinal ? poleAxis : cross(poleAxis, vOutputDirection);
        if (all(equal(axis, vec3(0.0))))
          axis = cross(vec3(0.0, 1.0, 0.0), vOutputDirection);
        axis = normalize(axis);
        float theta = dTheta * float(dir * i);
        float cosTheta = cos(theta);
        // Rodrigues' axis-angle rotation
        vec3 sampleDirection = vOutputDirection * cosTheta 
            + cross(axis, vOutputDirection) * sin(theta) 
            + axis * dot(axis, vOutputDirection) * (1.0 - cosTheta);
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
