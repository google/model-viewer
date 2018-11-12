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

import {BackSide, CubeCamera, EventDispatcher, Mesh, MeshBasicMaterial, PlaneBufferGeometry, PointLight, Scene, Vector3} from 'three';

import Sky from '../third_party/three/Sky.js';

const SKYSPHERE_SIZE = 10000;

export default class EnvMapGenerator extends EventDispatcher {
  constructor(renderer) {
    super();
    this.renderer = renderer;
    this.scene = new Scene();

    const gl = this.renderer.getContext();
    this.maxMapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);

    // Values generated from sky demo
    // @see https://threejs.org/examples/webgl_shaders_sky.html
    const distance = 400;
    const theta = Math.PI * (0.45 - 0.5);
    const phi = 2 * Math.PI * (.005 - 0.5);
    const sunPosition = new Vector3().set(
        distance * Math.cos(phi),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.sin(phi) * Math.cos(theta));

    this.sky = new Sky();
    this.sky.scale.multiplyScalar(SKYSPHERE_SIZE);
    this.sky.material.uniforms.luminance.value = 0.1;
    this.sky.material.uniforms.turbidity.value = 1;
    this.sky.material.uniforms.rayleigh.value = 0.2;
    this.sky.material.uniforms.mieCoefficient.value = 0.056;
    this.sky.material.uniforms.mieDirectionalG.value = 0.8;
    this.sky.material.uniforms.sunPosition.value = sunPosition;
    this.scene.add(this.sky);

    this.camera = new CubeCamera(1, SKYSPHERE_SIZE * 3, this.maxMapSize);
  }

  /**
   * Generate an environment map for a room.
   *
   * @param {number} mapSize
   */
  generate(mapSize) {
    mapSize = Math.min(mapSize, this.maxMapSize);
    this.camera.renderTarget.setSize(mapSize, mapSize);
    this.camera.clear(this.renderer);
    this.camera.update(this.renderer, this.scene);

    const texture = this.camera.renderTarget.texture;
    texture.name = 'Generated';
    return texture;
  }
}
