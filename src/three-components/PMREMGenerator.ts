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

import {encodings, getDirectionChunk, getFaceChunk, texelIO} from './shader-chunk/common.glsl.js';

/**
 * This class generates a Prefiltered, Mipmapped Radiance Environment Map
 * (PMREM) from a cubeMap environment texture. This allows different levels of
 * blur to be quickly accessed based on material roughness. It is packed into a
 * special CubeUV format that allows us to perform custom interpolation so that
 * we can support nonlinear formats such as RGBE.
 */
export const generatePMREM =
    (cubeTarget: WebGLRenderTargetCube, renderer: WebGLRenderer):
        WebGLRenderTarget => {
          const roughnessExtra = [0.5, 0.7, 1.0];
          const {cubeUVRenderTarget, cubeLods, meshes} =
              setup(cubeTarget, roughnessExtra);
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
            // (mesh.material as Material).dispose();
            mesh.geometry.dispose();
          });

          return cubeUVRenderTarget;
        };

const setup =
    (cubeTarget: WebGLRenderTargetCube, roughnessExtra: Array<number>) => {
      const extraLods = roughnessExtra.length;
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

      let offsetY = 0;
      const sizeMin = Math.pow(2, lodMin) + 2;
      const sizeMax = Math.pow(2, lodMax) + 2;
      for (let lod = lodMin; lod <= lodMax; lod++) {
        const sizeLod = Math.pow(2, lod);
        let offsetX = 0;
        const nExtra = lod == lodMin ? extraLods : 0;
        for (let i = 0; i <= nExtra; ++i) {
          const target = lod == lodMax ?
              cubeTarget :
              i > 0 ? cubeLods[0] : cubeLods[lod - lodBase];
          const roughness = i > 0 ? roughnessExtra[i - 1] : 0;
          appendLodMeshes(meshes, target, sizeLod, offsetX, offsetY, roughness);
          offsetX += 3 * sizeMin;
        }
        offsetY += 2 * (sizeLod + 2);
      }

      const cubeUVRenderTarget =
          new WebGLRenderTarget(3 * sizeMax, offsetY, params);
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
      const sizePad = sizeLod + 2;
      const texelSize = 1.0 / sizeLod;
      const plane = new PlaneBufferGeometry(1, 1);
      const uv = (plane.attributes.uv.array as Array<number>);
      for (let i = 0; i < uv.length; i++) {
        if (uv[i] === 0) {
          uv[i] = -texelSize;
        } else {  // == 1
          uv[i] = 1 + texelSize;
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

        planeMesh.position.x = (0.5 + (i % 3)) * sizePad + offsetX;
        planeMesh.position.y = (0.5 + (i > 2 ? 1 : 0)) * sizePad + offsetY;
        (planeMesh.material as Material).side = DoubleSide;
        planeMesh.scale.setScalar(sizePad);
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
  int face = getFace(vPosition);
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
uniform int faceIndex;
const float sourceTexelSize = 0.5;
${getDirectionChunk}
${texelIO}
vec4 accumulate(vec4 soFar, vec3 outputDir, vec3 sampleDir){
  float weight = 1.0 - smoothstep(0.0, sigma, acos(dot(sampleDir, outputDir)));
  if(weight > 0.0){
    soFar += weight * inputTexelToLinear(textureCube(envMap, sampleDir));
  }
  return soFar;
}
vec4 accumulateFaces(vec4 soFar, vec3 outputDir, vec3 sampleDir){
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
  if ((vUv.x < 0.0 || vUv.x > 1.0) && (vUv.y < 0.0 || vUv.y > 1.0)) {
    // The corner pixels do not represent any one face, so to get consistent 
    // interpolation, they must average the three neighboring face corner pixels, 
    // here approximated by sampling exactly at the corner.
    uv -= 0.5 * texelSize * sign(vUv);
  }
  vec3 outputDir = normalize(getDirection(uv, faceIndex));
  vec4 color = vec4(0.0);
  for(float x = 0.5 * sourceTexelSize; x < 1.0; x += sourceTexelSize){
    for(float y = 0.5 * sourceTexelSize; y < 1.0; y += sourceTexelSize){
      vec3 sampleDir = normalize(vec3(x, y, 1.0));
      color = accumulateFaces(color, outputDir, sampleDir);
      sampleDir.x *= -1.0;
      color = accumulateFaces(color, outputDir, sampleDir);
      sampleDir.y *= -1.0;
      color = accumulateFaces(color, outputDir, sampleDir);
      sampleDir.x *= -1.0;
      color = accumulateFaces(color, outputDir, sampleDir);
    }
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
uniform int faceIndex;
${getDirectionChunk}
${texelIO}
void main() {
    if ((vUv.x >= 0.0 && vUv.x <= 1.0) || (vUv.y >= 0.0 && vUv.y <= 1.0)) {
      // By using UV coordinates that go past [0, 1], textureCube automatically 
      // grabs our neighboring face values for our padded edge.
      vec3 direction = getDirection(vUv, faceIndex);
      gl_FragColor = textureCube(envMap, direction);
    } else {
      // The corner pixels do not represent any one face, so to get consistent 
      // interpolation, they must average the three neighboring face corners.
      vec2 uv = vUv;
      uv.x += vUv.x < 0.0 ? texelSize : -texelSize;
      vec3 direction = getDirection(uv, faceIndex);
      vec3 color = inputTexelToLinear(textureCube(envMap, direction)).rgb;
      uv.y += vUv.y < 0.0 ? texelSize : -texelSize;
      direction = getDirection(uv, faceIndex);
      color += inputTexelToLinear(textureCube(envMap, direction)).rgb;
      uv.x = vUv.x;
      direction = getDirection(uv, faceIndex);
      color += inputTexelToLinear(textureCube(envMap, direction)).rgb;
      gl_FragColor = linearToOutputTexel(vec4(color / 3.0, 1.0));
    }
}
`,

      blending: NoBlending

    });

    this.type = 'PMREMCubeUVPacker';
  }
}
