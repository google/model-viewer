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

const $setup = Symbol('setup');
const $generateMipmaps = Symbol('generateMipmaps');
const $packMipmaps = Symbol('packMipmaps');
const $addLodMeshes = Symbol('addLodMeshes');
const $updateLodMeshes = Symbol('updateLodMeshes');

/**
 * This class generates a Prefiltered, Mipmapped Radiance Environment Map
 * (PMREM) from a cubeMap environment texture. This allows different levels of
 * blur to be quickly accessed based on material roughness. It is packed into a
 * special CubeUV format that allows us to perform custom interpolation so that
 * we can support nonlinear formats such as RGBE.
 */
export default class PMREMGenerator {
  private mipmapShader = new MipmapShader();
  private packingShader = new PackingShader();
  private cubeCamera = new CubeCamera(0.1, 100, 1);
  private flatCamera = new OrthographicCamera(-1, 1, 1, -1);
  private mipmapScene = new Scene();
  private packingScene = new Scene();
  private boxMesh = new Mesh(new BoxBufferGeometry(), this.mipmapShader);
  private plane = new PlaneBufferGeometry(1, 1);
  // Hard-coded to max faceSize = 256 until we can add a uniform.
  private maxLods = 8;
  private cubeLods: Array<WebGLRenderTargetCube>;
  private cubeUVRenderTarget: WebGLRenderTarget|null = null;
  private meshes: Array<Mesh>;

  constructor(private renderer: WebGLRenderer) {
    (this.boxMesh.material as Material).side = DoubleSide;
    this.mipmapScene.add(this.boxMesh);
    this.cubeLods = [];
    this.meshes = [];
  }

  update(cubeTarget: WebGLRenderTargetCube): WebGLRenderTarget {
    this[$setup](cubeTarget);

    const {renderer} = this;
    const {gammaInput, gammaOutput, toneMapping, toneMappingExposure} =
        renderer;
    const currentRenderTarget = renderer.getRenderTarget();

    renderer.toneMapping = LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.gammaInput = false;
    renderer.gammaOutput = false;

    this[$generateMipmaps](cubeTarget);
    this[$packMipmaps]();

    renderer.setRenderTarget(currentRenderTarget);
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.gammaInput = gammaInput;
    renderer.gammaOutput = gammaOutput;

    return this.cubeUVRenderTarget!;
  }

  private[$setup](cubeTarget: WebGLRenderTargetCube) {
    const params = {
      format: cubeTarget.texture.format,
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      type: cubeTarget.texture.type,
      generateMipmaps: false,
      anisotropy: cubeTarget.texture.anisotropy,
      encoding: cubeTarget.texture.encoding
    };

    const {maxLods, flatCamera} = this;

    // Math.log(cubeTarget.width) / Math.log(2) - 2;  // IE11 doesn't support
    // Math.log2

    let offset = 0;
    for (let i = 0; i <= maxLods; i++) {
      const sizeLod = Math.pow(2, i);
      const renderTarget = new WebGLRenderTargetCube(sizeLod, sizeLod, params);
      renderTarget.texture.name = 'PMREMGenerator.cube' + i;
      const target = i == maxLods ? cubeTarget : renderTarget;
      if (i < maxLods) {
        this.cubeLods.push(renderTarget);
      }
      if (this.meshes.length <= i * 6) {
        this[$addLodMeshes](target, sizeLod, offset);
      } else {
        this[$updateLodMeshes](i, target);
      }
      offset += 2 * (sizeLod + 2);
    }

    this.cubeUVRenderTarget = new WebGLRenderTarget(
        3 * (Math.pow(2, maxLods) + 2),
        4 * maxLods + 2 * (Math.pow(2, maxLods + 1) - 1),
        params);
    this.cubeUVRenderTarget.texture.name = 'PMREMCubeUVPacker.cubeUv';
    this.cubeUVRenderTarget.texture.mapping = CubeUVReflectionMapping;
    // This hack in necessary for now because CubeUV is not really a first-class
    // citizen within the Standard material yet, and it does not seem to be easy
    // to add new uniforms to existing materials.
    this.renderer.properties.get(this.cubeUVRenderTarget.texture)
        .__maxMipLevel = maxLods;

    flatCamera.left = 0;
    flatCamera.right = this.cubeUVRenderTarget.width;
    flatCamera.top = 0;
    flatCamera.bottom = this.cubeUVRenderTarget.height;
    flatCamera.near = 0;
    flatCamera.far = 1;
    flatCamera.updateProjectionMatrix();
  }

  private[$addLodMeshes](
      target: WebGLRenderTargetCube, sizeLod: number, offset: number) {
    const sizePad = sizeLod + 2;
    const texelSize = 1.0 / sizeLod;
    const plane = this.plane.clone();
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
      const material = this.packingShader.clone();
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
      this.meshes.push(planeMesh);
    }
  }

  private[$updateLodMeshes](index: number, target: WebGLRenderTargetCube) {
    for (let i = index * 6; i < (index + 1) * 6; i++) {
      const material = (this.meshes[i].material as any);
      material.uniforms.envMap.value = target.texture;
      material.envMap = target.texture;
    }
  }

  private[$generateMipmaps](cubeTarget: WebGLRenderTargetCube) {
    const {renderer, mipmapShader, cubeCamera, cubeLods} = this;
    mipmapShader.uniforms.texelSize.value = 1.0 / cubeTarget.width;
    mipmapShader.uniforms.envMap.value = cubeTarget.texture;
    (mipmapShader as any).envMap = cubeTarget.texture;
    for (let i = this.maxLods - 1; i >= 0; i--) {
      cubeCamera.renderTarget = cubeLods[i];
      cubeCamera.update(renderer, this.mipmapScene);
      mipmapShader.uniforms.texelSize.value = 1.0 / cubeLods[i].width;
      mipmapShader.uniforms.envMap.value = cubeLods[i].texture;
      (mipmapShader as any).envMap = cubeLods[i].texture;
    }
  }

  private[$packMipmaps]() {
    this.meshes.forEach((mesh) => {
      this.packingScene.add(mesh);
    });

    this.renderer.setRenderTarget(this.cubeUVRenderTarget);
    this.renderer.render(this.packingScene, this.flatCamera);

    this.meshes.forEach((mesh) => {
      this.packingScene.remove(mesh);
    });
    this.cubeLods.forEach((target) => {
      target.dispose();
    });
    this.cubeLods = [];
  }
}

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
