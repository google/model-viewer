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

import {LinearMipMapLinearFilter, Mesh, MeshStandardMaterial, NoBlending, OrthographicCamera, PlaneBufferGeometry, RawShaderMaterial, Scene, Vector2, WebGLRenderer, WebGLRenderTarget} from 'three';
import {_Math} from 'three/src/math/Math';

const $mipmapMaterial = Symbol('mipmapMaterial');
const $scene = Symbol('scene');
const $flatCamera = Symbol('flatCamera');
const $tempTarget = Symbol('tempTarget');

export class RoughnessMipmapper {
  private[$mipmapMaterial] = new MipmapMaterial;
  private[$scene] = new Scene;
  private[$flatCamera] = new OrthographicCamera(0, 1, 0, 1, 0, 1);
  private[$tempTarget]: WebGLRenderTarget|null = null;

  constructor() {
    this[$scene].add(
        new Mesh(new PlaneBufferGeometry(2, 2), this[$mipmapMaterial]));
  }

  generateMipmaps(renderer: WebGLRenderer, material: MeshStandardMaterial) {
    const {roughnessMap, normalMap} = material;
    if (roughnessMap == null || normalMap == null ||
        !roughnessMap.generateMipmaps || material.userData.roughnessUpdated) {
      return;
    }
    material.userData.roughnessUpdated = true;

    let width = Math.max(roughnessMap.image.width, normalMap.image.width);
    let height = Math.max(roughnessMap.image.height, normalMap.image.height);
    if (!_Math.isPowerOfTwo(width) || !_Math.isPowerOfTwo(height)) {
      return;
    }

    const dpr = renderer.getPixelRatio();
    const autoClear = renderer.autoClear;
    renderer.setPixelRatio(1);
    renderer.autoClear = false;

    if (this[$tempTarget] == null || this[$tempTarget]!.width !== width ||
        this[$tempTarget]!.height !== height) {
      if (this[$tempTarget] != null) {
        this[$tempTarget]!.dispose();
      }
      this[$tempTarget] = new WebGLRenderTarget(
          width, height, {depthBuffer: false, stencilBuffer: false});
    }

    if (width !== roughnessMap.image.width ||
        height !== roughnessMap.image.height) {
      const newRoughnessTarget = new WebGLRenderTarget(width, height, {
        minFilter: LinearMipMapLinearFilter,
        depthBuffer: false,
        stencilBuffer: false
      });
      newRoughnessTarget.texture.generateMipmaps = true;
      // Setting the render target causes the memory to be allocated.
      renderer.setRenderTarget(newRoughnessTarget);
      material.roughnessMap = newRoughnessTarget.texture;
      if (material.metalnessMap != null) {
        material.metalnessMap = material.roughnessMap;
      }
      if (material.aoMap != null) {
        material.aoMap = material.roughnessMap;
      }
    }

    this[$mipmapMaterial].uniforms.roughnessMap.value = roughnessMap;
    this[$mipmapMaterial].uniforms.normalMap.value = normalMap;

    const position = new Vector2(0, 0);
    const texelSize = new Vector2(0, 0);
    for (let mip = 0; width >= 1 && height >= 1;
         ++mip, width /= 2, height /= 2) {
      // Rendering to a mip level is not allowed in webGL1. Instead we must set
      // up a secondary texture to write the result to, then use
      // gl.copyTexImage2D to copy it back to the proper mipmap level.
      texelSize.set(1.0 / width, 1.0 / height);
      this[$mipmapMaterial].uniforms.texelSize.value = texelSize;

      renderer.setRenderTarget(this[$tempTarget]);
      renderer.setViewport(position.x, position.y, width, height);
      renderer.render(this[$scene], this[$flatCamera]);
      renderer.copyFramebufferToTexture(position, material.roughnessMap!, mip);
      this[$mipmapMaterial].uniforms.roughnessMap.value = material.roughnessMap;
    }

    if (roughnessMap !== material.roughnessMap) {
      roughnessMap.dispose();
    }

    renderer.setPixelRatio(dpr);
    renderer.autoClear = autoClear;

    // debug
    const saveTarget =
        (target: WebGLRenderTarget, filename: string) => {
          const {width, height} = target;
          const output = document.createElement('canvas');
          output.width = width;
          output.height = height;

          const ctx = output.getContext('2d')!;
          const img = ctx.getImageData(0, 0, width, height);
          renderer.readRenderTargetPixels(
              target, 0, 0, width, height, img.data);
          ctx.putImageData(img, 0, 0);

          output.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();

            URL.revokeObjectURL(url);
          });
        }

    saveTarget(this[$tempTarget]!, 'temp.png');
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
  gl_FragColor = texture2D(roughnessMap, vUv, -1.0);
  float roughness = gl_FragColor.g;
  float alpha = roughness*roughness;
  vec3 avgNormal;
  for(float x = -1.0; x < 2.0; x += 2.0){
    for(float y = -1.0; y < 2.0; y += 2.0){
      vec2 uv = vUv + vec2(x, y) * 0.25 * texelSize;
      avgNormal += normalize(texture2D(normalMap, uv, -1.0).xyz);
    }
  }
  avgNormal *= 0.25;
  float r2 = dot(avgNormal, avgNormal);
  float invLambda = sqrt(r2)*(1.0-r2)/(3.0-r2);
  alpha = sqrt(alpha * alpha + 20.0*invLambda);
  gl_FragColor.g = clamp(sqrt(alpha), 0.0, 1.0);
}
      `,

      blending: NoBlending,
      depthTest: false,
      depthWrite: false
    });

    this.type = 'RoughnessMipmap';
  }
}
