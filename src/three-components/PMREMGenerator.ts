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

import {BoxBufferGeometry, CubeCamera, CubeUVReflectionMapping, DoubleSide, LinearToneMapping, Material, Mesh, NearestFilter, NoBlending, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetCube} from 'three';
import {getDirectionChunk, getFaceChunk} from './shader-chunk/common.glsl.js';

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
          const {cubeUVRenderTarget, cubeLods, meshes} = setup(cubeTarget);
          // This hack in necessary for now because CubeUV is not really a
          // first-class citizen within the Standard material yet, and it does
          // not seem to be easy to add new uniforms to existing materials.
          renderer.properties.get(cubeUVRenderTarget.texture).__maxMipLevel =
              cubeLods.length;

          const {gammaInput, gammaOutput, toneMapping, toneMappingExposure} =
              renderer;
          const currentRenderTarget = renderer.getRenderTarget();

          renderer.toneMapping = LinearToneMapping;
          renderer.toneMappingExposure = 1.0;
          renderer.gammaInput = false;
          renderer.gammaOutput = false;

          generateMipmaps(cubeTarget, cubeLods, renderer);
          packMipmaps(cubeUVRenderTarget, meshes, renderer);

          renderer.setRenderTarget(currentRenderTarget);
          renderer.toneMapping = toneMapping;
          renderer.toneMappingExposure = toneMappingExposure;
          renderer.gammaInput = gammaInput;
          renderer.gammaOutput = gammaOutput;

          cubeLods.forEach((target) => {
            target.dispose();
          });

          return cubeUVRenderTarget;
        };

const setup = (cubeTarget: WebGLRenderTargetCube) => {
  const params = {
    format: cubeTarget.texture.format,
    magFilter: NearestFilter,
    minFilter: NearestFilter,
    type: cubeTarget.texture.type,
    generateMipmaps: false,
    anisotropy: cubeTarget.texture.anisotropy,
    encoding: cubeTarget.texture.encoding
  };

  // Hard-coded to max faceSize = 256 until we can add a uniform.
  const maxLods = 8;
  // Math.log(cubeTarget.width) / Math.log(2) - 2;  // IE11 doesn't support
  // Math.log2

  const cubeLods: Array<WebGLRenderTargetCube> = [];
  const meshes: Array<Mesh> = [];

  let offset = 0;
  for (let i = 0; i <= maxLods; i++) {
    const sizeLod = Math.pow(2, i);
    let target = cubeTarget;
    if (i < maxLods) {
      const renderTarget = new WebGLRenderTargetCube(sizeLod, sizeLod, params);
      renderTarget.texture.name = 'PMREMGenerator.cube' + i;
      cubeLods.push(renderTarget);
      target = renderTarget;
    }
    appendLodMeshes(meshes, target, sizeLod, offset);
    offset += 2 * (sizeLod + 2);
  }

  const cubeUVRenderTarget = new WebGLRenderTarget(
      3 * (Math.pow(2, maxLods) + 2),
      4 * maxLods + 2 * (Math.pow(2, maxLods + 1) - 1),
      params);
  cubeUVRenderTarget.texture.name = 'PMREMCubeUVPacker.cubeUv';
  cubeUVRenderTarget.texture.mapping = CubeUVReflectionMapping;

  return {cubeUVRenderTarget, cubeLods, meshes};
};

const appendLodMeshes =
    (meshes: Array<Mesh>,
     target: WebGLRenderTargetCube,
     sizeLod: number,
     offset: number) => {
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
        const material = new PackingShader();
        material.uniforms.texelSize.value = texelSize;
        material.uniforms.envMap.value = target.texture;
        // This hack comes from the original PMREMGenerator; if you set envMap
        // (even though it doesn't exist on ShaderMaterial), the assembled
        // shader will populate the correct function into envMapTexelToLinear().
        (material as any).envMap = target.texture;
        material.uniforms.faceIndex.value = i;

        const planeMesh = new Mesh(plane, material);

        planeMesh.position.x = (0.5 + (i % 3)) * sizePad;
        planeMesh.position.y = (0.5 + (i > 2 ? 1 : 0)) * sizePad + offset;
        (planeMesh.material as Material).side = DoubleSide;
        planeMesh.scale.setScalar(sizePad);
        meshes.push(planeMesh);
      }
    };

const generateMipmaps =
    (cubeTarget: WebGLRenderTargetCube,
     cubeLods: Array<WebGLRenderTargetCube>,
     renderer: WebGLRenderer) => {
      const mipmapShader = new MipmapShader();
      const cubeCamera = new CubeCamera(0.1, 100, 1);
      const mipmapScene = new Scene();
      const boxMesh = new Mesh(new BoxBufferGeometry(), mipmapShader);
      (boxMesh.material as Material).side = DoubleSide;
      mipmapScene.add(boxMesh);

      mipmapShader.uniforms.texelSize.value = 1.0 / cubeTarget.width;
      mipmapShader.uniforms.envMap.value = cubeTarget.texture;
      (mipmapShader as any).envMap = cubeTarget.texture;
      for (let i = cubeLods.length - 1; i >= 0; i--) {
        cubeCamera.renderTarget = cubeLods[i];
        cubeCamera.update(renderer, mipmapScene);
        mipmapShader.uniforms.texelSize.value = 1.0 / cubeLods[i].width;
        mipmapShader.uniforms.envMap.value = cubeLods[i].texture;
        (mipmapShader as any).envMap = cubeLods[i].texture;
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

class MipmapShader extends ShaderMaterial {
  constructor() {
    super({

      uniforms: {texelSize: {value: 0.5}, envMap: {value: null}},

      vertexShader: `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,

      fragmentShader: `
varying vec2 vUv;
varying vec3 vPosition;
uniform float texelSize;
uniform samplerCube envMap;
${getFaceChunk}
${getDirectionChunk}
void main() {
  int face = getFace(vPosition);
  vec2 uv = vUv - 0.5 * texelSize;
  vec3 texelDir = getDirection(uv, face);
  vec3 color = envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.x += texelSize;
  texelDir = getDirection(uv, face);
  color += envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.y += texelSize;
  texelDir = getDirection(uv, face);
  color += envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.x -= texelSize;
  texelDir = getDirection(uv, face);
  color += envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  gl_FragColor = linearToOutputTexel(vec4(color * 0.25, 1.0));
}
`,

      blending: NoBlending

    });

    this.type = 'PMREMGenerator';
  }
}

class PackingShader extends ShaderMaterial {
  constructor() {
    super({

      uniforms: {
        texelSize: {value: 0.5},
        envMap: {value: null},
        faceIndex: {value: 0},
      },

      vertexShader: `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,

      fragmentShader: `
varying vec2 vUv;
uniform float texelSize;
uniform samplerCube envMap;
uniform int faceIndex;
${getDirectionChunk}
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
      vec3 color = envMapTexelToLinear(textureCube(envMap, direction)).rgb;
      uv.y += vUv.y < 0.0 ? texelSize : -texelSize;
      direction = getDirection(uv, faceIndex);
      color += envMapTexelToLinear(textureCube(envMap, direction)).rgb;
      uv.x = vUv.x;
      direction = getDirection(uv, faceIndex);
      color += envMapTexelToLinear(textureCube(envMap, direction)).rgb;
      gl_FragColor = linearToOutputTexel(vec4(color / 3.0, 1.0));
    }
}
`,

      blending: NoBlending

    });

    this.type = 'PMREMCubeUVPacker';
  }
}
