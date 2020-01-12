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

import {Camera, Math as ThreeMath, Matrix4, Mesh, MeshBasicMaterial, Object3D, Raycaster, RingGeometry, Vector3,} from 'three';

/**
 * The Reticle class creates an object that repeatedly calls
 * `xrSession.requestHitTest()` to render a ring along a found
 * horizontal surface.
 */
export default class Reticle extends Object3D {
  private ring: Mesh;
  private camera: Camera;
  private raycaster: Raycaster|null = null;

  /**
   * @param {XRSession} xrSession
   * @param {THREE.Camera} camera
   */
  constructor(camera: Camera) {
    super();

    this.name = 'Reticle';

    let geometry = new RingGeometry(0.1, 0.11, 24, 1);
    let material = new MeshBasicMaterial({color: 0xffffff});
    // Orient the geometry so its position is flat on a horizontal surface
    geometry.applyMatrix(new Matrix4().makeRotationX(ThreeMath.degToRad(-90)));

    this.ring = new Mesh(geometry, material);

    this.add(this.ring);

    this.visible = false;
    this.camera = camera;
  }

  /**
   * Fires a hit test in the middle of the screen and places the reticle
   * upon the surface if found.
   *
   * @param {XRSession} session
   * @param {XRFrameOfReference} frameOfRef
   */
  async update(session: XRSession, frameOfRef: XRFrameOfReference) {
    this.raycaster = this.raycaster || new Raycaster();
    this.raycaster.setFromCamera({x: 0, y: 0}, this.camera);
    const ray = this.raycaster.ray;
    let xrray: XRRay = new XRRay(ray.origin, ray.direction);

    let hits: Array<XRHitResult>;

    try {
      hits = await session.requestHitTest(xrray, frameOfRef);
    } catch (error) {
      hits = [];
    }

    if (hits.length) {
      const hit = hits[0];
      const hitMatrix = new Matrix4().fromArray(hit.hitMatrix as any);

      // Now apply the position from the hitMatrix onto our model
      this.position.setFromMatrixPosition(hitMatrix);

      // Rotate the anchor to face the camera
      const targetPos =
          new Vector3().setFromMatrixPosition(this.camera.matrixWorld);
      const angle = Math.atan2(
          targetPos.x - this.position.x, targetPos.z - this.position.z);
      this.rotation.set(0, angle, 0);

      this.visible = true;
    }
  }
}
