/* @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

import {BackSide, BoxGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, Scene} from 'three';

export default class EnvironmentSceneAlt extends Scene {
  constructor() {
    super();

    this.position.y = -3.5;

    const geometry = new BoxGeometry();
    geometry.deleteAttribute('uv');

    const roomMaterial =
        new MeshStandardMaterial({metalness: 0, side: BackSide});
    const boxMaterial = new MeshStandardMaterial({metalness: 0});

    const mainLight = new PointLight(0xffffff, 400.0, 28, 2);
    mainLight.position.set(0.5, 14.0, 0.5);
    this.add(mainLight);

    const room = new Mesh(geometry, roomMaterial);
    room.position.set(0.0, 13.2, 0.0);
    room.scale.set(31.5, 28.5, 31.5);
    this.add(room);

    const box1 = new Mesh(geometry, boxMaterial);
    box1.position.set(-10.906, -1.0, 1.846);
    box1.rotation.set(0, -0.195, 0);
    box1.scale.set(2.328, 7.905, 4.651);
    this.add(box1);

    const box2 = new Mesh(geometry, boxMaterial);
    box2.position.set(-5.607, -0.754, -0.758);
    box2.rotation.set(0, 0.994, 0);
    box2.scale.set(1.970, 1.534, 3.955);
    this.add(box2);

    const box3 = new Mesh(geometry, boxMaterial);
    box3.position.set(6.167, -0.16, 7.803);
    box3.rotation.set(0, 0.561, 0);
    box3.scale.set(3.927, 6.285, 3.687);
    this.add(box3);

    const box4 = new Mesh(geometry, boxMaterial);
    box4.position.set(-2.017, 0.018, 6.124);
    box4.rotation.set(0, 0.333, 0);
    box4.scale.set(2.002, 4.566, 2.064);
    this.add(box4);

    const box5 = new Mesh(geometry, boxMaterial);
    box5.position.set(2.291, -0.756, -2.621);
    box5.rotation.set(0, -0.286, 0);
    box5.scale.set(1.546, 1.552, 1.496);
    this.add(box5);

    const box6 = new Mesh(geometry, boxMaterial);
    box6.position.set(-2.193, -0.369, -5.547);
    box6.rotation.set(0, 0.516, 0);
    box6.scale.set(3.875, 3.487, 2.986);
    this.add(box6);

    // -x_left
    const light1 = new Mesh(geometry, this.createAreaLightMaterial(80));
    light1.position.set(-14.0, 10.0, 8.0);
    light1.scale.set(0.1, 2.5, 2.5);
    this.add(light1);

    // -x_right
    const light2 = new Mesh(geometry, this.createAreaLightMaterial(80));
    light2.position.set(-14.0, 14.0, -4.0);
    light2.scale.set(0.1, 2.5, 2.5);
    this.add(light2);



    // +x only on light
    const light3 = new Mesh(geometry, this.createAreaLightMaterial(23));
    light3.position.set(14.0, 12.0, 0.0);
    light3.scale.set(0.1, 5.0, 5.0);
    this.add(light3);

    // +z
    const light4 = new Mesh(geometry, this.createAreaLightMaterial(16));
    light4.position.set(0.0, 9.0, 14.0);
    light4.scale.set(5.0, 5.0, 0.1);
    this.add(light4);

    // -z right
    const light5 = new Mesh(geometry, this.createAreaLightMaterial(80));
    light5.position.set(7.0, 8.0, -14.0);
    light5.scale.set(2.5, 2.5, 0.1);
    this.add(light5);

    // -z left
    const light6 = new Mesh(geometry, this.createAreaLightMaterial(80));
    light6.position.set(-7.0, 16.0, -14.0);
    light6.scale.set(2.5, 2.5, 0.1);
    this.add(light6);

    // +y
    const light7 = new Mesh(geometry, this.createAreaLightMaterial(1));
    light7.position.set(0.0, 20.0, 0.0);
    light7.scale.set(0.1, 0.1, 0.1);
    this.add(light7);
  }

  createAreaLightMaterial(intensity: number): MeshBasicMaterial {
    const material = new MeshBasicMaterial();
    material.color.setScalar(intensity);
    return material;
  }
}
