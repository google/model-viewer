/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, PlaneBufferGeometry} from 'three';

const RADIUS = 0.1;
const LINE_WIDTH = 0.02;
const SEGMENTS = 12;
const DELTA_PHI = Math.PI / (2 * SEGMENTS);

const addCorner =
    (vertices: Array<number>, cornerX: number, cornerY: number) => {
      let phi = cornerX > 0 ? (cornerY > 0 ? 0 : -Math.PI / 2) :
                              (cornerY > 0 ? Math.PI / 2 : Math.PI);
      for (let i = 0; i <= SEGMENTS; ++i) {
        vertices.push(
            cornerX + (RADIUS - LINE_WIDTH) * Math.cos(phi),
            cornerY + (RADIUS - LINE_WIDTH) * Math.sin(phi),
            0,
            cornerX + RADIUS * Math.cos(phi),
            cornerY + RADIUS * Math.sin(phi),
            0);
        phi += DELTA_PHI;
      }
    };

export class PlacementBox extends Mesh {
  constructor(xSize: number, zSize: number) {
    const geometry = new BufferGeometry();
    const triangles: Array<number> = [];
    const vertices: Array<number> = [];

    const x = xSize / 2;
    const y = zSize / 2;
    addCorner(vertices, x, y);
    addCorner(vertices, -x, y);
    addCorner(vertices, -x, -y);
    addCorner(vertices, x, -y);

    const numVertices = vertices.length / 3;
    for (let i = 0; i < numVertices - 2; i += 2) {
      triangles.push(i, i + 1, i + 3, i, i + 3, i + 2);
    }
    const i = numVertices - 2;
    triangles.push(i, i + 1, 1, i, 1, 0);

    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(triangles);

    super(geometry);
    (this.material as MeshBasicMaterial).side = DoubleSide;

    const plane = new Mesh(
        new PlaneBufferGeometry(xSize + 2 * RADIUS, zSize + 2 * RADIUS));
    plane.visible = false;
    this.add(plane);

    this.rotateX(-Math.PI / 2);
  }
}