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

interface Box {
  position: [number, number, number];
  rotation: number;
  scale: [number, number, number];
}

interface Light {
  intensity: number;
  position: [number, number, number];
  scale: [number, number, number];
}

interface Env {
  topLight: {
    intensity: number,
    position: [number, number, number],
  };
  room: {
    position: [number, number, number],
    scale: [number, number, number],
  };
  boxes: Box[];
  lights: Light[];
}

const legacy = {
  topLight: {
    intensity: 500,
    position: [0.418, 16.199, 0.300],
  },
  room: {
    position: [-0.757, 13.219, 0.717],
    scale: [31.713, 28.305, 28.591],
  },
  boxes: [
    {
      position: [-10.906, 2.009, 1.846],
      rotation: -0.195,
      scale: [2.328, 7.905, 4.651],
    },
    {
      position: [-5.607, -0.754, -0.758],
      rotation: 0.994,
      scale: [1.970, 1.534, 3.955],
    },
    {
      position: [6.167, 0.857, 7.803],
      rotation: 0.561,
      scale: [3.927, 6.285, 3.687],
    },
    {
      position: [-2.017, 0.018, 6.124],
      rotation: 0.333,
      scale: [2.002, 4.566, 2.064],
    },
    {
      position: [2.291, -0.756, -2.621],
      rotation: -0.286,
      scale: [1.546, 1.552, 1.496],
    },
    {
      position: [-2.193, -0.369, -5.547],
      rotation: 0.516,
      scale: [3.875, 3.487, 2.986],
    },
  ],
  lights: [
    {
      intensity: 50,
      position: [-16.116, 14.37, 8.208],
      scale: [0.1, 2.428, 2.739],
    },
    {
      intensity: 50,
      position: [-16.109, 18.021, -8.207],
      scale: [0.1, 2.425, 2.751],
    },
    {
      intensity: 17,
      position: [14.904, 12.198, -1.832],
      scale: [0.15, 4.265, 6.331],
    },
    {
      intensity: 43,
      position: [-0.462, 8.89, 14.520],
      scale: [4.38, 5.441, 0.088],
    },
    {
      intensity: 20,
      position: [3.235, 11.486, -12.541],
      scale: [2.5, 2.0, 0.1],
    },
    {
      intensity: 100,
      position: [0.0, 20.0, 0.0],
      scale: [1.0, 0.1, 1.0],
    },
  ]
} as Env;

const neutral = {
  topLight: {
    intensity: 400,
    position: [0.5, 14.0, 0.5],
  },
  room: {
    position: [0.0, 13.2, 0.0],
    scale: [31.5, 28.5, 31.5],
  },
  boxes: [
    {
      position: [-10.906, -1.0, 1.846],
      rotation: -0.195,
      scale: [2.328, 7.905, 4.651],
    },
    {
      position: [-5.607, -0.754, -0.758],
      rotation: 0.994,
      scale: [1.970, 1.534, 3.955],
    },
    {
      position: [6.167, -0.16, 7.803],
      rotation: 0.561,
      scale: [3.927, 6.285, 3.687],
    },
    {
      position: [-2.017, 0.018, 6.124],
      rotation: 0.333,
      scale: [2.002, 4.566, 2.064],
    },
    {
      position: [2.291, -0.756, -2.621],
      rotation: -0.286,
      scale: [1.546, 1.552, 1.496],
    },
    {
      position: [-2.193, -0.369, -5.547],
      rotation: 0.516,
      scale: [3.875, 3.487, 2.986],
    },
  ],
  lights: [
    {
      intensity: 80,
      position: [-14.0, 10.0, 8.0],
      scale: [0.1, 2.5, 2.5],
    },
    {
      intensity: 80,
      position: [-14.0, 14.0, -4.0],
      scale: [0.1, 2.5, 2.5],
    },
    {
      intensity: 23,
      position: [14.0, 12.0, 0.0],
      scale: [0.1, 5.0, 5.0],
    },
    {
      intensity: 16,
      position: [0.0, 9.0, 14.0],
      scale: [5.0, 5.0, 0.1],
    },
    {
      intensity: 80,
      position: [7.0, 8.0, -14.0],
      scale: [2.5, 2.5, 0.1],
    },
    {
      intensity: 80,
      position: [-7.0, 16.0, -14.0],
      scale: [2.5, 2.5, 0.1],
    },
    {
      intensity: 1,
      position: [0.0, 20.0, 0.0],
      scale: [0.1, 0.1, 0.1],
    },
  ]
} as Env;

export default class EnvironmentScene extends Scene {
  constructor(name: 'legacy'|'neutral') {
    super();

    this.position.y = -3.5;

    const geometry = new BoxGeometry();
    geometry.deleteAttribute('uv');

    const roomMaterial =
        new MeshStandardMaterial({metalness: 0, side: BackSide});
    const boxMaterial = new MeshStandardMaterial({metalness: 0});

    const data = name == 'legacy' ? legacy : neutral;

    const mainLight = new PointLight(0xffffff, data.topLight.intensity, 28, 2);
    mainLight.position.set(...data.topLight.position);
    this.add(mainLight);

    const room = new Mesh(geometry, roomMaterial);
    room.position.set(...data.room.position);
    room.scale.set(...data.room.scale);
    this.add(room);

    for (const box of data.boxes) {
      const box1 = new Mesh(geometry, boxMaterial);
      box1.position.set(...box.position);
      box1.rotation.set(0, box.rotation, 0);
      box1.scale.set(...box.scale);
      this.add(box1);
    }

    for (const light of data.lights) {
      const light1 =
          new Mesh(geometry, this.createAreaLightMaterial(light.intensity));
      light1.position.set(...light.position);
      light1.scale.set(...light.scale);
      this.add(light1);
    }
  }

  createAreaLightMaterial(intensity: number): MeshBasicMaterial {
    const material = new MeshBasicMaterial();
    material.color.setScalar(intensity);
    return material;
  }
}
