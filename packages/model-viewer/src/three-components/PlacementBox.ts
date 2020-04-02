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

import {BufferGeometry, DoubleSide, Float32BufferAttribute, Material, Mesh, MeshBasicMaterial, PlaneBufferGeometry, Vector2, Vector3} from 'three';

import {Damper} from './Damper';
import Model from './Model';
import {ModelScene} from './ModelScene';

const RADIUS = 0.2;
const LINE_WIDTH = 0.03;
const MAX_OPACITY = 0.75;
const SEGMENTS = 12;
const DELTA_PHI = Math.PI / (2 * SEGMENTS);

const vector2 = new Vector2();

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
  private hitPlane: Mesh;
  private shadowHeight: number;
  private goalOpacity: number;
  private opacityDamper: Damper;

  constructor(model: Model) {
    const geometry = new BufferGeometry();
    const triangles: Array<number> = [];
    const vertices: Array<number> = [];
    const {size, boundingBox} = model;

    const x = size.x / 2;
    const y = size.z / 2;
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

    const material = this.material as MeshBasicMaterial;
    material.side = DoubleSide;
    material.transparent = true;
    material.opacity = 0;
    this.goalOpacity = 0;
    this.opacityDamper = new Damper();

    this.hitPlane = new Mesh(
        new PlaneBufferGeometry(size.x + 2 * RADIUS, size.z + 2 * RADIUS));
    this.hitPlane.visible = false;
    this.add(this.hitPlane);

    this.rotateX(-Math.PI / 2);
    boundingBox.getCenter(this.position);
    this.shadowHeight = boundingBox.min.y;
    this.position.y = this.shadowHeight;

    model.add(this);
  }

  getHit(scene: ModelScene, screenX: number, screenY: number): Vector3|null {
    vector2.set(screenX, -screenY);
    this.hitPlane.visible = true;
    const hitResult = scene.positionAndNormalFromPoint(vector2, this.hitPlane);
    this.hitPlane.visible = false;
    return hitResult == null ? null : hitResult.position;
  }

  set offsetHeight(offset: number) {
    this.position.y = this.shadowHeight + offset;
  }

  get offsetHeight(): number {
    return this.position.y - this.shadowHeight;
  }

  set show(visible: boolean) {
    this.goalOpacity = visible ? MAX_OPACITY : 0;
  }

  updateOpacity(delta: number) {
    const material = this.material as MeshBasicMaterial;
    material.opacity =
        this.opacityDamper.update(material.opacity, this.goalOpacity, delta, 1);
    this.visible = material.opacity > 0;
  }

  dispose() {
    const {geometry, material} = this.hitPlane;
    geometry.dispose();
    (material as Material).dispose();
    this.geometry.dispose();
    (this.material as Material).dispose();
  }
}