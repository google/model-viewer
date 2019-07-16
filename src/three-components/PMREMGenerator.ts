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

import {BoxBufferGeometry, CubeCamera, DoubleSide, LinearToneMapping, Material, Mesh, NearestFilter, NoBlending, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetCube} from 'three';

export default class PMREMGenerator {
  private mipmapShader = this.getMipmapShader();
  private packingShader = this.getPackingShader();
  private cubeCamera: CubeCamera|null = null;
  private flatCamera = new OrthographicCamera(-1, 1, 1, -1);
  private mipmapScene = new Scene();
  private packingScene = new Scene();
  private boxMesh = new Mesh(new BoxBufferGeometry(), this.mipmapShader);
  private plane = new PlaneBufferGeometry(1, 1);
  private numLods = -1;
  private cubeLods: Array<WebGLRenderTargetCube>;
  private cubeUVRenderTarget: WebGLRenderTarget|null = null;
  private objects: Array<Mesh>;
  private faceOffsets: Array<Vector2>;

  constructor() {
    (this.boxMesh.material as Material).side = DoubleSide;
    this.mipmapScene.add(this.boxMesh);
    this.cubeLods = [];
    this.objects = [];
    this.faceOffsets = [];
    this.faceOffsets.push(new Vector2(0, 0));
    this.faceOffsets.push(new Vector2(1, 0));
    this.faceOffsets.push(new Vector2(2, 0));
    this.faceOffsets.push(new Vector2(0, 1));
    this.faceOffsets.push(new Vector2(1, 1));
    this.faceOffsets.push(new Vector2(2, 1));
  }

  update(cubeTarget: WebGLRenderTargetCube, renderer: WebGLRenderer):
      WebGLRenderTarget {
    this.setup(cubeTarget);
    this.generateMipmaps(cubeTarget, renderer);
    this.packMipmaps(renderer);
    return this.cubeUVRenderTarget!;
  }

  setup(cubeTarget: WebGLRenderTargetCube) {
    const size = cubeTarget.width;
    if (this.cubeCamera == null ||
        this.cubeCamera.renderTarget.width !== size) {
      this.cubeCamera = new CubeCamera(0.1, 100, size);
    }
    this.mipmapScene.add(this.cubeCamera);

    const params = {
      format: cubeTarget.texture.format,
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      type: cubeTarget.texture.type,
      generateMipmaps: false,
      anisotropy: cubeTarget.texture.anisotropy,
      encoding: cubeTarget.texture.encoding
    };

    // how many LODs fit in the given CubeUV Texture.
    let numLods =
        Math.log(size) / Math.log(2) - 2;  // IE11 doesn't support Math.log2

    let offset = 0;
    for (let i = 0; i < numLods; i++) {
      const sizeLod = Math.pow(2, i);
      const sizePad = sizeLod + 2;
      if (this.cubeLods.length <= i) {
        let renderTarget = new WebGLRenderTargetCube(sizeLod, sizeLod, params);
        renderTarget.texture.name = 'PMREMGenerator.cube' + i;
        this.cubeLods.push(renderTarget);
        this.addLodObjects(renderTarget, offset);
      }
      offset += 2 * sizePad;
    }
    this.addLodObjects(cubeTarget, offset);

    if (numLods !== this.numLods) {
      this.numLods = numLods;
      this.cubeUVRenderTarget =
          new WebGLRenderTargetCube(4 * size, 4 * size, params);
      this.flatCamera.left = -2 * size;
      this.flatCamera.right = 2 * size;
      this.flatCamera.top = 2 * size;
      this.flatCamera.bottom = -2 * size;
      this.flatCamera.near = 0;
      this.flatCamera.far = 1;
      this.flatCamera.updateProjectionMatrix();
    }
  }

  addLodObjects(target: WebGLRenderTargetCube, offset: number) {
    const sizeLod = target.width;
    const sizePad = sizeLod + 2;
    const invSize = 1.0 / sizeLod;
    const plane = this.plane.clone();
    const uv = (plane.attributes.uv.array as Array<number>);
    for (let j = 0; j < uv.length; j++) {
      if (uv[j] === 0) {
        uv[j] = -invSize;
      } else if (uv[j] === 1) {
        uv[j] = 1 + invSize;
      } else {
        console.error('unexpected UV coordiante ' + uv);
      }
    }
    for (let k = 0; k < 6; k++) {
      // 6 Cube Faces
      let material = this.packingShader.clone();
      material.uniforms['invMapSize'].value = invSize;
      material.uniforms['envMap'].value = target.texture;
      material.uniforms['faceIndex'].value = k;

      let planeMesh = new Mesh(plane, material);
      planeMesh.position.x = this.faceOffsets[k].x * sizePad;
      planeMesh.position.y = this.faceOffsets[k].y * sizePad + offset;
      (planeMesh.material as Material).side = DoubleSide;
      planeMesh.scale.setScalar(sizePad);
      this.objects.push(planeMesh);
    }
  }

  generateMipmaps(cubeTarget: WebGLRenderTargetCube, renderer: WebGLRenderer) {
    var gammaInput = renderer.gammaInput;
    var gammaOutput = renderer.gammaOutput;
    var toneMapping = renderer.toneMapping;
    var toneMappingExposure = renderer.toneMappingExposure;
    var currentRenderTarget = renderer.getRenderTarget();

    renderer.toneMapping = LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.gammaInput = false;
    renderer.gammaOutput = false;

    this.mipmapShader.uniforms['invMapSize'].value = 1.0 / cubeTarget.width;
    this.mipmapShader.uniforms['envMap'].value = cubeTarget.texture;
    for (let i = this.numLods - 1; i >= 0; i--) {
      renderer.setRenderTarget(this.cubeLods[i]);
      this.cubeCamera!.update(renderer, this.mipmapScene);
      this.mipmapShader.uniforms['invMapSize'].value =
          1.0 / this.cubeLods[i].width;
      this.mipmapShader.uniforms['envMap'].value = this.cubeLods[i].texture;
    }

    renderer.setRenderTarget(currentRenderTarget);
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.gammaInput = gammaInput;
    renderer.gammaOutput = gammaOutput;
  }

  packMipmaps(renderer: WebGLRenderer) {
    for (let i = 0; i < 6 * this.numLods; i++) {
      this.packingScene.add(this.objects[i]);
    }

    var gammaInput = renderer.gammaInput;
    var gammaOutput = renderer.gammaOutput;
    var toneMapping = renderer.toneMapping;
    var toneMappingExposure = renderer.toneMappingExposure;
    var currentRenderTarget = renderer.getRenderTarget();

    renderer.gammaInput = false;
    renderer.gammaOutput = false;
    renderer.toneMapping = LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setRenderTarget(this.cubeUVRenderTarget);
    renderer.render(this.packingScene, this.flatCamera);

    renderer.setRenderTarget(currentRenderTarget);
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.gammaInput = gammaInput;
    renderer.gammaOutput = gammaOutput;

    for (let i = 0; i < 6 * this.numLods; i++) {
      this.packingScene.remove(this.objects[i]);
    }
  }

  getMipmapShader() {
    var shaderMaterial = new ShaderMaterial({

      uniforms: {
        'invMapSize': {value: 0.5},
        'envMap': {value: null},
      },

      vertexShader: `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,

      fragmentShader: `
#include <common>
varying vec2 vUv;
uniform float invMapSize;
uniform samplerCube envMap;
int getFace(vec3 direction) {
    vec3 absDirection = abs(direction);
    int face = -1;
    if (absDirection.x > absDirection.z) {
      if (absDirection.x > absDirection.y)
        face = direction.x > 0.0 ? 0 : 3;
      else
        face = direction.y > 0.0 ? 1 : 4;
    } else {
      if (absDirection.z > absDirection.y)
        face = direction.z > 0.0 ? 2 : 5;
      else
        face = direction.y > 0.0 ? 1 : 4;
    }
    return face;
}
vec3 getDirection(vec2 uv, int face) {
    uv = 2.0 * uv - 1.0;
    vec3 direction;
    if (face == 0) {
      direction = vec3(1.0, uv);
    } else if (face == 1) {
      direction = vec3(uv.x, 1.0, uv.y);
    } else if (face == 2) {
      direction = vec3(uv, 1.0);
    } else if (face == 3) {
      direction = vec3(-1.0, uv);
    } else if (face == 4) {
      direction = vec3(uv.x, -1.0, uv.y);
    } else {
      direction = vec3(uv, -1.0);
    }
    return direction;
}
void main() {
  vec3 direction = -vViewPosition;
  int face = getFace(direction);
  vec2 uv = vUv - 0.5 * invMapSize;
  vec3 texelDir = getDirection(uv, face);
  vec3 color = envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.x += invMapSize;
  texelDir = getDirection(uv, face);
  color += envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.y += invMapSize;
  texelDir = getDirection(uv, face);
  color += envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  uv.x -= invMapSize;
  texelDir = getDirection(uv, face);
  color += envMapTexelToLinear(textureCube(envMap, texelDir)).rgb;
  gl_FragColor = linearToOutputTexel(vec4(color * 0.25, 1.0));
}
`,

      blending: NoBlending

    });

    shaderMaterial.type = 'PMREMGenerator';

    return shaderMaterial;
  }

  getPackingShader() {
    var shaderMaterial = new ShaderMaterial({

      uniforms: {
        'invMapSize': {value: 0.5},
        'envMap': {value: null},
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
uniform float invMapSize;
uniform samplerCube envMap;
uniform int faceIndex;
void main() {
    if ((vUv.x > 0 && vUv.x < 1) || (vUv.y > 0 && vUv.y < 1)) {
      gl_FragColor = textureCube(envMap, vUv);
    } else {
      vec2 uv = vUv;
      uv.x += uv.x < 0 ? invMapSize : -invMapSize;
      vec3 color = envMapTexelToLinear(textureCube(envMap, uv)).rgb;
      uv.y += uv.y < 0 ? invMapSize : -invMapSize;
      color += envMapTexelToLinear(textureCube(envMap, uv)).rgb;
      uv.x += uv.x < 0 ? invMapSize : -invMapSize;
      color += envMapTexelToLinear(textureCube(envMap, uv)).rgb;
      gl_FragColor = linearToOutputTexel(vec4(color / 3.0, 1.0));
    }
  }
`,

      blending: NoBlending

    });

    shaderMaterial.type = 'PMREMGenerator';

    return shaderMaterial;
  }
}