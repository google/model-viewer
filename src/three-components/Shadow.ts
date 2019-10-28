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

import {Box3, DirectionalLight, Mesh, Object3D, PlaneBufferGeometry, ShadowMaterial, Vector3} from 'three';

import Model from './Model';

// Nothing within Offset of the bottom of the model casts a shadow
// (this is to avoid having a baked-in shadow plane cast its own shadow).
const OFFSET = 0.001;
const BASE_OPACITY = 0.1;
// The softness of the shadow is controlled with this resolution parameter. The
// lower the resolution, the softer the shadow.
const MAX_RESOLUTION = 64;
// Animated models are not in general contained in their bounding box, as this
// is calculated only for their resting pose. We create a cubic shadow volume
// for animated models sized to their largest bounding box dimesion multiplied
// by this scale factor.
const ANIMATION_SCALING = 2;

/**
 *
 */
export class Shadow extends DirectionalLight {
  private shadowMaterial = new ShadowMaterial;
  private floor: Mesh;
  private boundingBox = new Box3;
  private size = new Vector3;
  public needsUpdate = false;

  constructor(private model: Model, pivot: Object3D) {
    super();

    // We use the light only to cast a shadow, not to light the scene.
    this.intensity = 0;
    this.castShadow = true;

    this.floor = new Mesh(new PlaneBufferGeometry, this.shadowMaterial);
    this.floor.receiveShadow = true;
    this.floor.castShadow = false;

    pivot.add(this.floor);
    pivot.add(this);
    this.target = pivot;

    this.setModel(model);
  }

  setModel(model: Model) {
    this.model = model;
    const {camera} = this.shadow;

    this.floor.rotateX(-Math.PI / 2);
    this.boundingBox.copy(model.boundingBox);
    this.size.copy(model.size);
    const {boundingBox, size} = this;

    if (this.model.animationNames.length > 0) {
      const maxDimension = Math.max(size.x, size.y, size.z) * ANIMATION_SCALING;
      size.y = maxDimension;
      boundingBox.expandByVector(
          size.subScalar(maxDimension).multiplyScalar(-0.5));
      boundingBox.max.y = maxDimension;
      size.set(maxDimension, maxDimension, maxDimension);
    }

    boundingBox.getCenter(this.floor.position);
    const shadowOffset = size.y * OFFSET;
    // Floor plane is up slightly to avoid Z-fighting with baked-in shadows and
    // to stay inside the shadow camera.
    this.floor.position.y -= size.y / 2 - 2 * shadowOffset;

    this.position.y = boundingBox.max.y + shadowOffset;
    this.up.set(0, 0, 1);
    camera.near = 0;
    camera.far = size.y;

    this.setMapSize(MAX_RESOLUTION);
  }

  setMapSize(maxMapSize: number) {
    const {camera, mapSize} = this.shadow;
    const {boundingBox, size} = this;

    if (this.model.animationNames.length > 0) {
      maxMapSize *= ANIMATION_SCALING;
    }

    const width =
        size.x > size.z ? maxMapSize : Math.floor(maxMapSize * size.x / size.z);
    const height =
        size.x > size.z ? Math.floor(maxMapSize * size.z / size.x) : maxMapSize;

    mapSize.set(width, height);
    // These pads account for the softening radius around the shadow.
    const widthPad = 2.5 * size.x / width;
    const heightPad = 2.5 * size.z / height;

    camera.left = -boundingBox.max.x - widthPad;
    camera.right = -boundingBox.min.x + widthPad;
    camera.bottom = boundingBox.min.z - heightPad;
    camera.top = boundingBox.max.z + heightPad;

    this.updateMatrixWorld();
    (this.shadow as any).updateMatrices(this);

    this.floor.scale.set(size.x + 2 * widthPad, size.z + 2 * heightPad, 1);
    this.needsUpdate = true;
  }

  setIntensity(intensity: number) {
    this.shadowMaterial.opacity = intensity * BASE_OPACITY;
    if (intensity > 0) {
      this.visible = true;
      this.floor.visible = true;
    } else {
      this.visible = false;
      this.floor.visible = false;
    }
  }

  getIntensity(): number {
    return this.shadowMaterial.opacity / BASE_OPACITY;
  }

  setRotation(radiansY: number) {
    this.shadow.camera.up.set(Math.sin(radiansY), 0, Math.cos(radiansY));
    (this.shadow as any).updateMatrices(this);
  }
}