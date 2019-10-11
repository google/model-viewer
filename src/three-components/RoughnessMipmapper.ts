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

import {Mesh, MeshStandardMaterial, NoBlending, OrthographicCamera, PlaneBufferGeometry, RawShaderMaterial, Scene, Vector2, WebGLRenderer, WebGLRenderTarget} from 'three';
import {_Math} from 'three/src/math/Math';

const $mipmapMaterial = Symbol('mipmapMaterial');
const $scene = Symbol('scene');
const $flatCamera = Symbol('flatCamera');

export class RoughnessMipmapper {
  private[$mipmapMaterial] = new MipmapMaterial;
  private[$scene] = new Scene;
  private[$flatCamera] = new OrthographicCamera(0, 1, 0, 1, 0, 1);

  constructor() {
    this[$scene].add(new Mesh(new PlaneBufferGeometry, this[$mipmapMaterial]));
  }

  generateMipmaps(renderer: WebGLRenderer, material: MeshStandardMaterial) {
    const {roughnessMap} = material;
    if (roughnessMap == null || !roughnessMap.generateMipmaps ||
        material.userData.roughnessUpdated) {
      return;
    }
    material.userData.roughnessUpdated = true;

    let {width, height} = roughnessMap.image;
    if (!_Math.isPowerOfTwo(width) || !_Math.isPowerOfTwo(height)) {
      return;
    }

    const dpr = renderer.getPixelRatio();
    const autoClear = renderer.autoClear;
    renderer.setPixelRatio(1);
    renderer.autoClear = false;

    const roughnessTarget = new WebGLRenderTarget(0, 0);
    roughnessTarget.texture = roughnessMap;
    roughnessTarget.width = roughnessMap.image.width;
    roughnessTarget.height = roughnessMap.image.height;
    this[$mipmapMaterial].uniforms.roughnessMap.value = roughnessMap;
    this[$mipmapMaterial].uniforms.normalMap.value = material.normalMap;

    width /= 2;
    height /= 2;
    for (let mip = 1; width >= 1 && height >= 1;
         ++mip, width /= 2, height /= 2) {
      // rendering to a mip level is not allowed in webGL1. Instead we must set
      // up a secondary texture to write the result to, then use
      // gl.copyTexImage2D to copy it back to the proper mipmap level. In this
      // case roughnessMap does not need to be a renderTarget, since it will
      // only be read from and copied to. The secondary texture will be a
      // renderTarget, and we can reuse it by narrowing the viewport.
      renderer.setRenderTarget(roughnessTarget, undefined, mip);
      renderer.render(this[$scene], this[$flatCamera]);
    }

    renderer.setPixelRatio(dpr);
    renderer.autoClear = autoClear;
  }
}

class MipmapMaterial extends RawShaderMaterial {
  constructor() {
    const texelSize = new Vector2(1, 1);

    super({
      uniforms: {
        roughnessMap: {value: null},
        normalMap: {value: null},
        texelSize: {value: texelSize}
      },

      vertexShader: `
precision mediump float;
precision mediump int;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position, 1.0 );
}
      `,

      fragmentShader: `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform sampler2D roughnessMap;
uniform sampler2D normalMap;
uniform vec2 texelSize;
void main() {
  float roughness = texture2D(roughnessMap, vUv, -1.0).g;
  gl_FragColor.g = roughness;
}
      `,

      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    });

    this.type = 'RoughnessMipmap';
  }
}
