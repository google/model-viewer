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

import {
  BackSide,
  BoxBufferGeometry,
  CubeCamera,
  EventDispatcher,
  FloatType,
  Group,
  LinearToneMapping,
  LinearMipMapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Scene
} from 'three';

export default class EnvironmentMapGenerator extends EventDispatcher {
  constructor(renderer) {
    super();
    this.renderer = renderer;
    this.scene = new Scene();

    // Scene

    const geometry = new BoxBufferGeometry();

    const material1 = new MeshStandardMaterial({roughness: 1, metalness: 0, side: BackSide});
    const material2 = new MeshStandardMaterial({roughness: 1, metalness: 0});
    const material3 = new MeshBasicMaterial();
    material3.color.setRGB(10,10,10);

    //

    const light = new PointLight(0xffffff,50,30);
    light.position.set(0.418, 16.199, 0.300);
    this.scene.add(light);

    const room = new Mesh(geometry,material1);
    room.position.set(-0.757, 13.219, 0.717);
    room.scale.set(31.713, 28.305, 28.591);
    this.scene.add(room);

    const box1 = new Mesh(geometry,material2);
    box1.position.set(-10.906, 2.009, 1.846);
    box1.rotation.set(0,-0.195,0);
    box1.scale.set(2.328, 7.905, 4.651);
    this.scene.add(box1);

    const box2 = new Mesh(geometry,material2);
    box2.position.set(-5.607, -0.754, -0.758);
    box2.rotation.set(0,0.994,0);
    box2.scale.set(1.970, 1.534, 3.955);
    this.scene.add(box2);

    const box3 = new Mesh(geometry,material2);
    box3.position.set(6.167, 0.857, 7.803);
    box3.rotation.set(0,0.561,0);
    box3.scale.set(3.927, 6.285, 3.687);
    this.scene.add(box3);

    const box4 = new Mesh(geometry,material2);
    box4.position.set(-2.017, 0.018, 6.124);
    box4.rotation.set(0,0.333,0);
    box4.scale.set(2.002, 4.566, 2.064);
    this.scene.add(box4);

    const box5 = new Mesh(geometry,material2);
    box5.position.set(2.291, -0.756, -2.621);
    box5.rotation.set(0,-0.286,0);
    box5.scale.set(1.546, 1.552, 1.496);
    this.scene.add(box5);

    const box6 = new Mesh(geometry,material2);
    box6.position.set(-2.193, -0.369, -5.547);
    box6.rotation.set(0,0.516,0);
    box6.scale.set(3.875, 3.487, 2.986);
    this.scene.add(box6);

    const light1 = new Mesh(geometry,material3);
    light1.position.set(-1.509, 19.227, 0.429);
    light1.scale.set(7.268, 0.1, 7.851);
    this.scene.add(light1);

    const light2 = new Mesh(geometry,material3);
    light2.position.set(-16.001, 13.499, -4.222);
    light2.scale.set(0.1, 2.865, 4.53);
    this.scene.add(light2);

    const light3 = new Mesh(geometry,material3);
    light3.position.set(14.527, 8.424, 0.489);
    light3.scale.set(0.1, 6.325, 5.871);
    this.scene.add(light3);

    const light4 = new Mesh(geometry,material3);
    light4.position.set(7.221, 12.760, 14.063);
    light4.scale.set(3.78, 2.485, 0.1);
    this.scene.add(light4);

    const light5 = new Mesh(geometry,material3);
    light5.position.set(-1.820, 10.209, -11.999);
    light5.scale.set(6.38, 4.245, 0.15);
    this.scene.add(light5);

    this.camera = new CubeCamera(0.1, 100, 256);
    this.camera.renderTarget.texture.type = FloatType;
    this.camera.renderTarget.texture.minFilter = LinearMipMapLinearFilter;
    this.camera.renderTarget.texture.generateMipmaps = true;

  }

  /**
   * Generate an environment map for a room.
   *
   * @param {number} mapSize
   */
  generate() {
    this.camera.clear(this.renderer);

    var gammaOutput = this.renderer.gammaOutput;
    var toneMapping = this.renderer.toneMapping;
    var toneMappingExposure = this.renderer.toneMappingExposure;

    this.renderer.toneMapping = LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.gammaOutput = false;

    this.camera.update(this.renderer, this.scene);

    this.renderer.toneMapping = toneMapping;
    this.renderer.toneMappingExposure = toneMappingExposure;
    this.renderer.gammaOutput = gammaOutput;

    return this.camera.renderTarget.texture;
  }

  dispose() {
    this.camera.renderTarget.dispose();
  }
}
