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

import {BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Material, Mesh, MeshBasicMaterial, PlaneGeometry, Vector2, Vector3, XRTargetRaySpace} from 'three';

import {Damper} from './Damper.js';
import {ModelScene} from './ModelScene.js';
import {Side} from './Shadow.js';

const RADIUS = 0.2;
const LINE_WIDTH = 0.03;
const MAX_OPACITY = 0.75;
const SEGMENTS = 12;
const DELTA_PHI = Math.PI / (2 * SEGMENTS);

const vector2 = new Vector2();

/**
 * Adds a quarter-annulus of vertices to the array, centered on cornerX,
 * cornerY.
 */
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

/**
 * This class is a set of two coincident planes. The first is just a cute box
 * outline with rounded corners and damped opacity to indicate the floor extents
 * of a scene. It is purposely larger than the scene's bounding box by RADIUS on
 * all sides so that small scenes are still visible / selectable. Its center is
 * actually carved out by vertices to ensure its fragment shader doesn't add
 * much time.
 *
 * The child plane is a simple plane with the same extents for use in hit
 * testing (translation is triggered when the touch hits the plane, rotation
 * otherwise).
 */
export class PlacementBox extends Mesh {
  private hitPlane: Mesh;
  private hitBox: Mesh;
  private shadowHeight: number;
  private side: Side;
  private goalOpacity: number;
  private opacityDamper: Damper;

  constructor(scene: ModelScene, side: Side) {
    const geometry = new BufferGeometry();
    const triangles: Array<number> = [];
    const vertices: Array<number> = [];
    const {size, boundingBox} = scene;

    const x = size.x / 2;
    const y = (side === 'back' ? size.y : size.z) / 2;
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

    this.side = side;
    const material = this.material as MeshBasicMaterial;
    material.side = DoubleSide;
    material.transparent = true;
    material.opacity = 0;
    this.goalOpacity = 0;
    this.opacityDamper = new Damper();

    this.hitPlane =
        new Mesh(new PlaneGeometry(2 * (x + RADIUS), 2 * (y + RADIUS)));
    this.hitPlane.visible = false;
    (this.hitPlane.material as Material).side = DoubleSide;
    this.add(this.hitPlane);

    // The box matches the dimensions of the plane (extra radius all around),
    // but only the top is expanded by radius, not the bottom.
    this.hitBox = new Mesh(new BoxGeometry(
        size.x + 2 * RADIUS, size.y + RADIUS, size.z + 2 * RADIUS));
    this.hitBox.visible = false;
    (this.hitBox.material as Material).side = DoubleSide;
    this.add(this.hitBox);

    boundingBox.getCenter(this.position);

    switch (side) {
      case 'bottom':
        this.rotateX(-Math.PI / 2);
        this.shadowHeight = boundingBox.min.y;
        this.position.y = this.shadowHeight;
        break;
      case 'back':
        this.shadowHeight = boundingBox.min.z;
        this.position.z = this.shadowHeight;
    }

    scene.target.add(this);
    this.hitBox.position.y = (size.y + RADIUS) / 2 + boundingBox.min.y;
    scene.target.add(this.hitBox);
    this.offsetHeight = 0;
  }

  /**
   * Get the world hit position if the touch coordinates hit the box, and null
   * otherwise. Pass the scene in to get access to its raycaster.
   */
  getHit(scene: ModelScene, screenX: number, screenY: number): Vector3|null {
    vector2.set(screenX, -screenY);
    this.hitPlane.visible = true;
    const hitResult = scene.positionAndNormalFromPoint(vector2, this.hitPlane);
    this.hitPlane.visible = false;
    return hitResult == null ? null : hitResult.position;
  }

  getExpandedHit(scene: ModelScene, screenX: number, screenY: number): Vector3
      |null {
    this.hitPlane.scale.set(1000, 1000, 1000);
    this.hitPlane.updateMatrixWorld();
    const hitResult = this.getHit(scene, screenX, screenY);
    this.hitPlane.scale.set(1, 1, 1);
    return hitResult;
  }

  controllerIntersection(scene: ModelScene, controller: XRTargetRaySpace) {
    this.hitBox.visible = true;
    const hitResult = scene.hitFromController(controller, this.hitBox);
    this.hitBox.visible = false;
    return hitResult;
  }

  /**
   * Offset the height of the box relative to the bottom of the scene. Positive
   * is up, so generally only negative values are used.
   */
  set offsetHeight(offset: number) {
    offset -= 0.001;  // push 1 mm below shadow to avoid z-fighting
    if (this.side === 'back') {
      this.position.z = this.shadowHeight + offset;
    } else {
      this.position.y = this.shadowHeight + offset;
    }
  }

  get offsetHeight(): number {
    if (this.side === 'back') {
      return this.position.z - this.shadowHeight;
    } else {
      return this.position.y - this.shadowHeight;
    }
  }

  /**
   * Set the box's visibility; it will fade in and out.
   */
  set show(visible: boolean) {
    this.goalOpacity = visible ? MAX_OPACITY : 0;
  }

  /**
   * Call on each frame with the frame delta to fade the box.
   */
  updateOpacity(delta: number) {
    const material = this.material as MeshBasicMaterial;
    material.opacity =
        this.opacityDamper.update(material.opacity, this.goalOpacity, delta, 1);
    this.visible = material.opacity > 0;
  }

  /**
   * Call this to clean up Three's cache when you remove the box.
   */
  dispose() {
    const {geometry, material} = this.hitPlane;
    geometry.dispose();
    (material as Material).dispose();
    this.hitBox.geometry.dispose();
    (this.hitBox.material as Material).dispose();
    this.geometry.dispose();
    (this.material as Material).dispose();
    this.hitBox.removeFromParent();
    this.removeFromParent();
  }
}