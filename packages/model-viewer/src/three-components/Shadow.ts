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
// The softness [0, 1] of the shadow is mapped to a resolution between
// 2^LOG_MAX_RESOLUTION and 2^LOG_MIN_RESOLUTION.
const LOG_MAX_RESOLUTION = 9;
const LOG_MIN_RESOLUTION = 6;
// Animated models are not in general contained in their bounding box, as this
// is calculated only for their resting pose. We create a cubic shadow volume
// for animated models sized to their largest bounding box dimesion multiplied
// by this scale factor.
const ANIMATION_SCALING = 2;

/**
 * The Shadow class creates a shadow that fits a given model and follows a
 * target. This shadow will follow the model without any updates needed so long
 * as the shadow and model are both parented to the same object (call it the
 * pivot) and this pivot is passed as the target parameter to the shadow's
 * constructor. We also must constrain the pivot to motion within the horizontal
 * plane and call the setRotation() method whenever the pivot's Y-axis rotation
 * changes. For motion outside of the horizontal plane, this.needsUpdate must be
 * set to true.
 *
 * The softness of the shadow is controlled by changing its resolution, making
 * softer shadows faster, but less precise.
 */
export class Shadow extends DirectionalLight {
  private shadowMaterial = new ShadowMaterial;
  private floor: Mesh;
  private boundingBox = new Box3;
  private size = new Vector3;
  public needsUpdate = false;

  constructor(private model: Model, target: Object3D, softness: number) {
    super();

    // We use the light only to cast a shadow, not to light the scene.
    this.intensity = 0;
    this.castShadow = true;
    this.frustumCulled = false;

    this.floor = new Mesh(new PlaneBufferGeometry, this.shadowMaterial);
    this.floor.rotateX(-Math.PI / 2);
    this.floor.receiveShadow = true;
    this.floor.castShadow = false;
    this.floor.frustumCulled = false;
    this.add(this.floor);

    this.shadow.camera.up.set(0, 0, 1);

    this.target = target;

    this.setModel(model, softness);
  }

  setModel(model: Model, softness: number) {
    this.model = model;
    const {camera} = this.shadow;

    this.boundingBox.copy(model.boundingBox);
    this.size.copy(model.size);
    const {boundingBox, size} = this;

    if (this.model.animationNames.length > 0) {
      const maxDimension = Math.max(size.x, size.y, size.z) * ANIMATION_SCALING;
      size.y = maxDimension;
      boundingBox.expandByVector(
          size.subScalar(maxDimension).multiplyScalar(-0.5));
      boundingBox.max.y = boundingBox.min.y + maxDimension;
      size.set(maxDimension, maxDimension, maxDimension);
    }

    const shadowOffset = size.y * OFFSET;
    this.position.y = boundingBox.max.y + shadowOffset;
    boundingBox.getCenter(this.floor.position);
    // Floor plane is up slightly to avoid Z-fighting with baked-in shadows and
    // to stay inside the shadow camera.
    this.floor.position.y -= size.y / 2 + this.position.y - 2 * shadowOffset;

    camera.near = 0;
    camera.far = size.y;

    this.setSoftness(softness);
  }

  setSoftness(softness: number) {
    const resolution = Math.pow(
        2,
        LOG_MAX_RESOLUTION -
            softness * (LOG_MAX_RESOLUTION - LOG_MIN_RESOLUTION));
    this.setMapSize(resolution);
  }

  setMapSize(maxMapSize: number) {
    const {camera, mapSize, map} = this.shadow;
    const {boundingBox, size} = this;

    if (map != null) {
      (map as any).dispose();
      (this.shadow.map as any) = null;
    }

    if (this.model.animationNames.length > 0) {
      maxMapSize *= ANIMATION_SCALING;
    }

    const width =
        Math.floor(size.x > size.z ? maxMapSize : maxMapSize * size.x / size.z);
    const height =
        Math.floor(size.x > size.z ? maxMapSize * size.z / size.x : maxMapSize);

    mapSize.set(width, height);
    // These pads account for the softening radius around the shadow.
    const widthPad = 2.5 * size.x / width;
    const heightPad = 2.5 * size.z / height;

    camera.left = -boundingBox.max.x - widthPad;
    camera.right = -boundingBox.min.x + widthPad;
    camera.bottom = boundingBox.min.z - heightPad;
    camera.top = boundingBox.max.z + heightPad;

    this.updateMatrixWorld();
    camera.updateProjectionMatrix();
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