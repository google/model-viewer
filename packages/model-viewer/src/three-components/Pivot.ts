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

import {Object3D, Vector3} from 'three';

import {Hotspot} from './Hotspot';
import Model from './Model';
import {Shadow} from './Shadow';

export const $shadow = Symbol('shadow');
const $rotationCenter = Symbol('rotationCenter');

const view = new Vector3();
const target = new Vector3();
const normalWorld = new Vector3();

export class Pivot extends Object3D {
  protected[$shadow]: Shadow|null = null;
  private[$rotationCenter] = new Vector3();

  constructor(model: Model) {
    super();
    this.name = 'Pivot';
    this.add(model);
  }

  /**
   * Sets the point the model should pivot around. The height of the floor is
   * recorded in pivotCenter.y.
   */
  setCenter(x: number, y: number, z: number) {
    this[$rotationCenter].set(x, y, z);
    this.setRotation(this.getRotation());
  }

  pointToward(worldX: number, worldZ: number) {
    const centerWorld = this.localToWorld(this[$rotationCenter].clone());
    const {x, z} = centerWorld;
    const angle = Math.atan2(worldX - x, worldZ - z);
    this.setRotation(angle);
  }

  /**
   * Sets the rotation of the model's pivot, around its pivotCenter point.
   */
  setRotation(radiansY: number) {
    const rotationCenter = this[$rotationCenter];
    this.rotation.y = radiansY;
    this.position.x = -rotationCenter.x;
    this.position.z = -rotationCenter.z;
    this.position.applyAxisAngle(this.up, radiansY);
    this.position.x += rotationCenter.x;
    this.position.z += rotationCenter.z;
    const shadow = this[$shadow];
    if (shadow != null) {
      shadow.setRotation(radiansY);
    }
  }

  /**
   * Gets the current rotation value of the pivot
   */
  getRotation(): number {
    return this.rotation.y;
  }

  /**
   * Sets the shadow's intensity, lazily creating the shadow as necessary.
   */
  setShadowIntensity(
      shadowIntensity: number, model: Model, shadowSoftness: number) {
    let shadow = this[$shadow];
    if (shadow != null) {
      shadow.setIntensity(shadowIntensity);
      shadow.setModel(model, shadowSoftness);
    } else if (shadowIntensity > 0) {
      shadow = new Shadow(model, this, shadowSoftness);
      this.add(shadow);
      shadow.setIntensity(shadowIntensity);
      this[$shadow] = shadow;
      // showShadowHelper(this);
    }
    // Uncomment if using showShadowHelper below
    // if (this.children.length > 1) {
    //   (this.children[1] as CameraHelper).update();
    // }
  }

  /**
   * Sets the shadow's softness by mapping a [0, 1] softness parameter to the
   * shadow's resolution. This involves reallocation, so it should not be
   * changed frequently. Softer shadows are cheaper to render.
   */
  setShadowSoftness(softness: number) {
    const shadow = this[$shadow];
    if (shadow != null) {
      shadow.setSoftness(softness);
    }
  }

  /**
   * Call when updating the shadow; returns true if an update is needed and
   * resets the state.
   */
  updateShadow(): boolean {
    const shadow = this[$shadow];
    if (shadow == null) {
      return false;
    } else {
      const {needsUpdate} = shadow;
      shadow.needsUpdate = false;
      return needsUpdate;
    }
  }

  /**
   * The following methods are for operating on the set of Hotspot objects
   * attached to the scene. These come from DOM elements, provided to slots by
   * the Annotation Mixin.
   */
  addHotspot(hotspot: Hotspot) {
    this.add(hotspot);
  }

  removeHotspot(hotspot: Hotspot) {
    this.remove(hotspot);
  }

  /**
   * Helper method to apply a function to all hotspots.
   */
  forHotspots(func: (hotspot: Hotspot) => void) {
    const {children} = this;
    for (let i = 0, l = children.length; i < l; i++) {
      const hotspot = children[i];
      if (hotspot instanceof Hotspot) {
        func(hotspot);
      }
    }
  }

  /**
   * Update the CSS visibility of the hotspots based on whether their normals
   * point toward the camera.
   */
  updateHotspots(viewerPosition: Vector3) {
    this.forHotspots((hotspot) => {
      view.copy(viewerPosition);
      target.setFromMatrixPosition(hotspot.matrixWorld);
      view.sub(target);
      normalWorld.copy(hotspot.normal).transformDirection(this.matrixWorld);
      if (view.dot(normalWorld) < 0) {
        hotspot.hide();
      } else {
        hotspot.show();
      }
    });
  }

  /**
   * Rotate all hotspots to an absolute orientation given by the input number of
   * radians. Zero returns them to upright.
   */
  orientHotspots(radians: number) {
    this.forHotspots((hotspot) => {
      hotspot.orient(radians);
    });
  }

  /**
   * Set the rendering visibility of all hotspots. This is used to hide them
   * during transitions and such.
   */
  setHotspotsVisibility(visible: boolean) {
    this.forHotspots((hotspot) => {
      hotspot.visible = visible;
    });
  }
}