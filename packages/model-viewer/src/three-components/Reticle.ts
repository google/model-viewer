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

import {Camera, MathUtils, Matrix4, Mesh, MeshBasicMaterial, Object3D, RingGeometry, Vector3,} from 'three';

/**
 * The Reticle class creates an object that repeatedly calls
 * `xrSession.requestHitTest()` to render a ring along a found
 * horizontal surface.
 */
export default class Reticle extends Object3D {
  private ring: Mesh;
  private camera: Camera;
  private hitTestSource: XRHitTestSource|null = null;
  private hitTestSourceRequest: Promise<void>|null = null;
  private _hitMatrix: Matrix4|null = null;

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
    geometry.applyMatrix4(new Matrix4().makeRotationX(MathUtils.degToRad(-90)));

    this.ring = new Mesh(geometry, material);

    this.add(this.ring);

    this.visible = false;
    this.camera = camera;
  }

  get hitMatrix(): Matrix4|null {
    return this._hitMatrix;
  }

  reset() {
    this.hitTestSourceRequest = null;
    this.hitTestSource = null;
    this._hitMatrix = null;
  }

  /**
   * Fires a hit test in the middle of the screen and places the reticle
   * upon the surface if found.
   */
  async update(
      session: XRSession, frame: XRFrame,
      viewerReferenceSpace: XRReferenceSpace, frameOfRef: XRReferenceSpace) {
    if (this.hitTestSourceRequest == null) {
      this.hitTestSourceRequest =
          session.requestHitTestSource({space: viewerReferenceSpace})
              .then(hitTestSource => {
                this.hitTestSource = hitTestSource;
              });
    } else if (this.hitTestSource != null) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        this._hitMatrix =
            new Matrix4().fromArray(hit.getPose(frameOfRef)!.transform.matrix);

        // Now apply the position from the hitMatrix onto our model
        this.position.setFromMatrixPosition(this._hitMatrix);

        // Rotate the anchor to face the camera
        const targetPos =
            new Vector3().setFromMatrixPosition(this.camera.matrixWorld);
        const angle = Math.atan2(
            targetPos.x - this.position.x, targetPos.z - this.position.z);
        this.rotation.set(0, angle, 0);

        this.visible = true;
      } else {
        this._hitMatrix = null;
      }
    } else {
      this._hitMatrix = null;
    }
  }
}
