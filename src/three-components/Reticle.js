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
  Mesh,
  RingGeometry,
  MeshBasicMaterial,
  Object3D,
  Matrix4,
  Vector3,
  Geometry,
  Raycaster,
  Math as ThreeMath
} from 'three';

/**
 * The Reticle class creates an object that repeatedly calls
 * `xrSession.requestHitTest()` to render a ring along a found
 * horizontal surface.
 */
export default class Reticle extends Object3D {
  /**
   * @param {XRSession} xrSession
   * @param {THREE.Camera} camera
   */
  constructor(xrSession, camera) {
    super();

    let geometry = new RingGeometry(0.1, 0.11, 24, 1);
    let material = new MeshBasicMaterial({ color: 0xffffff });
    // Orient the geometry so its position is flat on a horizontal surface
    geometry.applyMatrix(new Matrix4().makeRotationX(ThreeMath.degToRad(-90)));

    this.ring = new Mesh(geometry, material);

    this.add(this.ring);

    this.session = xrSession;
    this.visible = false;
    this.camera = camera;
  }

  /**
   * Fires a hit test in the middle of the screen and places the reticle
   * upon the surface if found.
   *
   * @param {XRCoordinateSystem} frameOfRef
   */
  async update(frameOfRef) {
    this.raycaster = this.raycaster || new Raycaster();
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const ray = this.raycaster.ray;

    const origin = new Float32Array(ray.origin.toArray());
    const direction = new Float32Array(ray.direction.toArray());
    this.session.requestHitTest(origin,
                                                   direction,
                                                   frameOfRef).then(hits => {

    if (hits.length) {
      const hit = hits[0];
      const hitMatrix = new Matrix4().fromArray(hit.hitMatrix);

      // Now apply the position from the hitMatrix onto our model
      this.position.setFromMatrixPosition(hitMatrix);

      // Rotate the anchor to face the camera
      const targetPos = new Vector3().setFromMatrixPosition(this.camera.matrixWorld);
      const angle = Math.atan2(targetPos.x - this.position.x,
                               targetPos.z - this.position.z);
      this.rotation.set(0, angle, 0);

      try {
      this.visible = true;
      } catch (e) {
        console.error(e);
        window.e = e;
      }
    }
  })}
}
