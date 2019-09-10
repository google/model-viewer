/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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

import {BoxBufferGeometry, CubeCamera, CubeUVReflectionMapping, DoubleSide, Material, Mesh, NearestFilter, NoBlending, OrthographicCamera, PlaneBufferGeometry, RawShaderMaterial, Scene, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetCube} from 'three';

import {IS_IE11} from '../constants.js';

import {encodings, getDirectionChunk, getFaceChunk, texelIO} from './shader-chunk/common.glsl.js';

/**
 * This class generates a Prefiltered, Mipmapped Radiance Environment Map
 * (PMREM) from a cubeMap environment texture. This allows different levels of
 * blur to be quickly accessed based on material roughness. It is packed into a
 * special CubeUV format that allows us to perform custom interpolation so that
 * we can support nonlinear formats such as RGBE. Unlike a traditional mipmap
 * chain, it only goes down to the lodMin level (below), and then creates extra
 * even more filtered mips at the same lodMin resolution, associated with higher
 * roughness levels. In this way we maintain resolution to smoothly
 * interpolate diffuse lighting while limiting sampling computation.
 */
export const generatePMREM =
    (cubeTarget: WebGLRenderTargetCube, renderer: WebGLRenderer):
        WebGLRenderTarget => {
          const extraLodsRoughness = [0.5, 0.7, 1.0];
          const {cubeUVRenderTarget, cubeLods, meshes} =
              setup(cubeTarget, extraLodsRoughness);
          // This hack is necessary for now because CubeUV is not really a
          // first-class citizen within the Standard material yet, and it does
          // not seem to be easy to add new uniforms to existing materials.
          renderer.properties.get(cubeUVRenderTarget.texture).__maxMipLevel =
              cubeLods.length;

          generateMipmaps(cubeTarget, cubeLods, renderer);
          packMipmaps(cubeUVRenderTarget, meshes, renderer);

          cubeLods.forEach((target) => {
            target.dispose();
          });
          meshes.forEach((mesh) => {
            (mesh.material as Material).dispose();
            mesh.geometry.dispose();
          });

          return cubeUVRenderTarget;
        };

const setup =
    (cubeTarget: WebGLRenderTargetCube, extraLodsRoughness: Array<number>) => {
      const extraLods = extraLodsRoughness.length;
      const params = {
        format: cubeTarget.texture.format,
        magFilter: NearestFilter,
        minFilter: NearestFilter,
        type: cubeTarget.texture.type,
        generateMipmaps: false,
        anisotropy: cubeTarget.texture.anisotropy,
        encoding: cubeTarget.texture.encoding
      };

      // Hard-coded to lodMax = 8 until we can add a uniform.
      const lodMin = 3;
      const lodMax = 8;
      // lodBase is the mip Level that is integrated to form all of the extra
      // levels, but is not output directly into the PMREM texture. DO NOT
      // CHANGE, as the Blur shader below is hard coded for this size.
      const lodBase = 2;

      // Math.log(cubeTarget.width) / Math.log(2) - 2;  // IE11 doesn't support
      // Math.log2

      const cubeLods: Array<WebGLRenderTargetCube> = [];
      const meshes: Array<Mesh> = [];

      for (let i = lodBase; i < lodMax; i++) {
        const sizeLod = Math.pow(2, i);
        const renderTarget =
            new WebGLRenderTargetCube(sizeLod, sizeLod, params);
        renderTarget.texture.name = 'PMREMGenerator.cube' + i;
        cubeLods.push(renderTarget);
      }

      const sizeMin = Math.pow(2, lodMin);
      const sizeMax = Math.pow(2, lodMax);
      for (let lod = lodMin; lod <= lodMax; lod++) {
        const sizeLod = Math.pow(2, lod);
        let offsetY = lod === lodMax ? 0 : 2 * sizeMax;
        const offsetX = 3 * Math.max(0, sizeMax - 2 * sizeLod);
        const nExtra = lod == lodMin ? extraLods : 0;
        for (let i = 0; i <= nExtra; ++i) {
          const target = lod == lodMax ?
              cubeTarget :
              i > 0 ? cubeLods[0] : cubeLods[lod - lodBase];
          const roughness = i > 0 ? extraLodsRoughness[i - 1] : 0;
          appendLodMeshes(meshes, target, sizeLod, offsetX, offsetY, roughness);
          offsetY += 2 * sizeMin;
        }
      }

      const cubeUVRenderTarget =
          new WebGLRenderTarget(3 * sizeMax, 3 * sizeMax, params);
      cubeUVRenderTarget.texture.name = 'PMREMCubeUVPacker.cubeUv';
      cubeUVRenderTarget.texture.mapping = CubeUVReflectionMapping;

      return {cubeUVRenderTarget, cubeLods, meshes};
    };

const appendLodMeshes =
    (meshes: Array<Mesh>,
     target: WebGLRenderTargetCube,
     sizeLod: number,
     offsetX: number,
     offsetY: number,
     roughness: number) => {
      const texelSize = 1.0 / (sizeLod - 1);
      const plane = new PlaneBufferGeometry(1, 1);
      const uv = (plane.attributes.uv.array as Array<number>);
      for (let i = 0; i < uv.length; i++) {
        if (uv[i] === 0) {
          uv[i] = -texelSize / 2;
        } else {  // == 1
          uv[i] = 1 + texelSize / 2;
        }
      }
      for (let i = 0; i < 6; i++) {
        // 6 Cube Faces
        const material =
            roughness !== 0 ? new BlurShader() : new PackingShader();
        if (roughness !== 0) {
          const sigma = Math.PI * roughness * roughness / (1 + roughness);
          material.uniforms.sigma.value = sigma;
        }

        material.uniforms.texelSize.value = texelSize;
        material.uniforms.envMap.value = target.texture;
        material.uniforms.inputEncoding.value =
            encodings[target.texture.encoding];
        material.uniforms.outputEncoding.value =
            encodings[target.texture.encoding];
        material.uniforms.faceIndex.value = i;

        const planeMesh = new Mesh(plane, material);

        planeMesh.position.x = (0.5 + (i % 3)) * sizeLod + offsetX;
        planeMesh.position.y = (0.5 + (i > 2 ? 1 : 0)) * sizeLod + offsetY;
        (planeMesh.material as Material).side = DoubleSide;
        planeMesh.scale.setScalar(sizeLod);
        meshes.push(planeMesh);
      }
    };

const generateMipmaps =
    (cubeTarget: WebGLRenderTargetCube,
     cubeLods: Array<WebGLRenderTargetCube>,
     renderer: WebGLRenderer) => {
      const cubeCamera = new CubeCamera(0.1, 100, 1);
      cubeCamera.renderTarget.dispose();
      let mipmapShader = new MipmapShader();
      const mipmapScene = new Scene();
      const boxMesh = new Mesh(new BoxBufferGeometry(), mipmapShader);
      (boxMesh.material as Material).side = DoubleSide;
      mipmapScene.add(boxMesh);

      mipmapShader.uniforms.texelSize.value = 1.0 / cubeTarget.width;
      mipmapShader.uniforms.envMap.value = cubeTarget.texture;
      mipmapShader.uniforms.inputEncoding.value =
          encodings[cubeTarget.texture.encoding];
      for (let i = cubeLods.length - 1; i >= 0; i--) {
        const {uniforms} = mipmapShader;
        cubeCamera.renderTarget = cubeLods[i];
        uniforms.outputEncoding.value = encodings[cubeLods[i].texture.encoding];
        cubeCamera.update(renderer, mipmapScene);
        uniforms.texelSize.value = 1.0 / cubeLods[i].width;
        uniforms.envMap.value = cubeLods[i].texture;
        uniforms.inputEncoding.value = encodings[cubeLods[i].texture.encoding];
      }
    };

const packMipmaps =
    (cubeUVRenderTarget: WebGLRenderTarget,
     meshes: Array<Mesh>,
     renderer: WebGLRenderer) => {
      const packingScene = new Scene();
      meshes.forEach((mesh) => {
        packingScene.add(mesh);
      });
      const flatCamera = new OrthographicCamera(
          0, cubeUVRenderTarget.width, 0, cubeUVRenderTarget.height, 0, 1);

      renderer.setRenderTarget(cubeUVRenderTarget);
      renderer.render(packingScene, flatCamera);
    };

const commonVertexShader = `
precision mediump float;
precision mediump int;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
varying vec3 vPosition;
void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

class MipmapShader extends RawShaderMaterial {
  constructor() {
    super({

      uniforms: {
        texelSize: {value: 0.5},
        envMap: {value: null},
        inputEncoding: {value: 2},
        outputEncoding: {value: 2},
      },

      vertexShader: commonVertexShader,

      fragmentShader: `
precision mediump float;
precision mediump int;
varying vec2 vUv;
varying vec3 vPosition;
uniform float texelSize;
uniform samplerCube envMap;
${getFaceChunk}
${getDirectionChunk}
${texelIO}
void main() {
  float face = getFace(vPosition);
  vec2 uv = vUv - 0.5 * texelSize;
  vec3 texelDir = getDirection(uv, face);
  vec3 color = inputTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.x += texelSize;
  texelDir = getDirection(uv, face);
  color += inputTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.y += texelSize;
  texelDir = getDirection(uv, face);
  color += inputTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.x -= texelSize;
  texelDir = getDirection(uv, face);
  color += inputTexelToLinear(textureCube(envMap, texelDir)).rgb;
  gl_FragColor = linearToOutputTexel(vec4(color * 0.25, 1.0));
}
`,

      blending: NoBlending

    });

    this.type = 'PMREMGenerator';
  }
}

// This is a hack because IE claims that a shader which unrolls a loop to access
// 96 texture lookups has "complexity which exceeds allowed limits", however 48
// seems to be fine, so we subsample. This could be improved if someone cares a
// lot about IE.
const IE11 = IS_IE11 ? '#define IE11' : '';

class BlurShader extends RawShaderMaterial {
  constructor() {
    super({

      uniforms: {
        sigma: {value: 0.5},
        texelSize: {value: 0.5},
        envMap: {value: null},
        faceIndex: {value: 0},
        inputEncoding: {value: 2},
        outputEncoding: {value: 2},
      },

      vertexShader: commonVertexShader,

      fragmentShader: `
precision mediump float;
precision mediump int;
varying vec2 vUv;
varying vec3 vPosition;
uniform float sigma;
uniform float texelSize;
uniform samplerCube envMap;
uniform float faceIndex;
#define sourceTexelSize 0.5
${IE11}
${getDirectionChunk}
${texelIO}
vec4 accumulate(vec4 soFar, vec3 outputDir, vec3 sampleDir) {
  float weight = 1.0 - smoothstep(0.0, sigma, acos(dot(sampleDir, outputDir)));
  if (weight > 0.0) {
    soFar += weight * inputTexelToLinear(textureCube(envMap, sampleDir));
  }
  return soFar;
}
vec4 accumulateFaces(vec4 soFar, vec3 outputDir, vec3 sampleDir) {
  soFar = accumulate(soFar, outputDir, sampleDir);
  soFar = accumulate(soFar, outputDir, -sampleDir);
  soFar = accumulate(soFar, outputDir, sampleDir.xzy);
  soFar = accumulate(soFar, outputDir, -sampleDir.xzy);
  soFar = accumulate(soFar, outputDir, sampleDir.zxy);
  soFar = accumulate(soFar, outputDir, -sampleDir.zxy);
  return soFar;
}
void main() {
  vec2 uv = vUv;
  vec3 outputDir = normalize(getDirection(uv, faceIndex));
  vec4 color = vec4(0.0);
  for (float x = 0.5 * sourceTexelSize; x < 1.0; x += sourceTexelSize) {
#ifndef IE11
    for (float y = 0.5 * sourceTexelSize; y < 1.0; y += sourceTexelSize) {
      vec3 sampleDir = normalize(vec3(x, y, 1.0));
#else
      vec3 sampleDir = normalize(vec3(x, x, 1.0));
#endif
      color = accumulateFaces(color, outputDir, sampleDir);
      sampleDir.x *= -1.0;
      color = accumulateFaces(color, outputDir, sampleDir);
      sampleDir.y *= -1.0;
      color = accumulateFaces(color, outputDir, sampleDir);
      sampleDir.x *= -1.0;
      color = accumulateFaces(color, outputDir, sampleDir);
#ifndef IE11
    }
#endif
  }
  gl_FragColor = linearToOutputTexel(color / color.a);
}
`,

      blending: NoBlending

    });

    this.type = 'PMREMGeneratorBlur';
  }
}

class PackingShader extends RawShaderMaterial {
  constructor() {
    super({

      uniforms: {
        texelSize: {value: 0.5},
        envMap: {value: null},
        faceIndex: {value: 0},
        inputEncoding: {value: 2},
        outputEncoding: {value: 2},
      },

      vertexShader: commonVertexShader,

      fragmentShader: `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform float texelSize;
uniform samplerCube envMap;
uniform float faceIndex;
${getDirectionChunk}
${texelIO}
void main() {
      vec3 direction = getDirection(vUv, faceIndex);
      gl_FragColor = textureCube(envMap, direction);
}
`,

      blending: NoBlending

    });

    this.type = 'PMREMCubeUVPacker';
  }
}
