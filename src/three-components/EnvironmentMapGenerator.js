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

import {BackSide, BoxBufferGeometry, CubeCamera, EventDispatcher, FloatType, Group, LinearMipMapLinearFilter, LinearToneMapping, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PointLight, Scene} from 'three';

const $getLightMaterial = Symbol('getLightMaterial');

/**
 * This class is intended to implement helper methods on top of Scene for
 * constructing a "lightroom" in the spirit of a satisfying, neutral default
 * studio lighting scenario.
 */
class Lightroom extends Scene {
  /**
   * This ratio is intended to approximate an averaging of the intensity over
   * the area of a given light. This ratio has been emperically derived, and
   * could probably benefit from additional massaging. However, it would be
   * better if we worked on figuring out how to blur the environment map first.
   */
  static get areaLightIntensityRatio() {
    return 1.0 / 2.25;
  }

  constructor() {
    super();

    const size = this.size = 40;
    this.geometry = new BoxBufferGeometry();

    this.furnishingMaterial =
        new MeshStandardMaterial({roughness: 1, metalness: 0});
    this.lightMaterials = new Map();

    const roomMaterial = this.furnishingMaterial.clone();
    roomMaterial.side = BackSide;

    this.room = new Mesh(this.geometry, roomMaterial);

    this.room.position.set(0, size / 2.0, 0);
    this.room.scale.multiplyScalar(size);

    this.dolly = new Object3D();
    this.dolly.position.set(0, size / 2.0, 0);

    const lightOffset = size * 0.15;
    const roomMargin = size * -0.05;
    const halfSize = size / 2.0;

    this.mainLight =
        new PointLight(0xffffff, size * 10.0, size - roomMargin, 1.75);
    this.mainLight.position.set(0.0, halfSize + lightOffset, 0.0);

    this.floorLight = new PointLight(0xffffff, size, size, 2.0);
    this.floorLight.position.set(0.0, lightOffset, 0.0);

    this.room.add(this.dolly);

    this.add(this.mainLight);
    this.add(this.floorLight);
    this.add(this.room);

    window.lightroom = this;
  }

  /**
   * Add a "furnishing", which is basically a box sitting somewhere in the room
   */
  addFurnishing(x, z, rotation, width, height, depth) {
    const {size} = this;
    const halfSize = size / 2.0;
    const furnishing = new Mesh(this.geometry, this.furnishingMaterial);

    furnishing.scale.set(size * width, size * height, size * depth);
    furnishing.rotation.set(0, rotation, 0);
    furnishing.position.set(x * halfSize, size * height / 2.0, z * halfSize);

    this.add(furnishing);
  }

  /**
   * Add a light to the wall of the room. Specify the x and y coordinates on
   * a 2D plane in [-1,1] on both axes, and use the "facing" direction to place
   * the light on a particular wall.
   */
  addWallAreaLight(x, y, width, height, facing, intensity) {
    intensity *= Lightroom.areaLightIntensityRatio;

    const lightBox =
        new Mesh(this.geometry, this[$getLightMaterial](intensity));
    const {dolly, size} = this;
    const halfSize = size / 2.0;

    lightBox.position.set(
        x * halfSize, (y - height / 2.0) * halfSize, -1.0 * halfSize + 1.0);
    lightBox.scale.set(size * width, size * height, 0.1);

    dolly.rotation.set(0, 0, 0);
    dolly.add(lightBox);

    switch (facing) {
      case '-z':
        dolly.rotation.y = Math.PI;
        break;
      case '+x':
        dolly.rotation.y = Math.PI / -2.0;
        break;
      case '-x':
        dolly.rotation.y = Math.PI / 2.0;
        break;
    }

    dolly.updateMatrixWorld(true);
    lightBox.updateMatrixWorld(true);
    lightBox.matrix.identity();
    lightBox.applyMatrix(lightBox.matrixWorld);

    this.add(lightBox);
  }

  [$getLightMaterial](intensity) {
    if (!this.lightMaterials.has(intensity)) {
      const material = new MeshBasicMaterial();
      material.color.setRGB(intensity, intensity, intensity);
      this.lightMaterials.set(intensity, material);
    }

    return this.lightMaterials.get(intensity);
  }
}

const rendererTextureCache = new Map();

export default class EnvironmentMapGenerator extends EventDispatcher {
  constructor(renderer) {
    super();

    this.renderer = renderer;

    this.scene = new Lightroom();

    // NOTE(cdata): Intensities here are mostly sampled from a relevant
    // environment map that we are trying to match closely to
    this.scene.addWallAreaLight(-0.15, -0.1, 0.325, 0.25, '+z', 15.0);
    this.scene.addWallAreaLight(0.55, 0.275, 0.2, 0.175, '-z', 30.0);
    this.scene.addWallAreaLight(-0.55, 0.05, 0.2, 0.175, '-z', 25.0);
    // NOTE(cdata): Intensity of this light was originally ~50
    this.scene.addWallAreaLight(0, -0.3, 0.25, 0.25, '+x', 30.0);
    this.scene.addWallAreaLight(0.25, -0.125, 0.15, 0.15, '-x', 13.0);

    this.scene.addFurnishing(0.1, 0.6, Math.PI / -32.0, 0.1, 0.175, 0.1);
    this.scene.addFurnishing(-0.025, 0.3, Math.PI / -6.0, 0.05, 0.02, 0.1);
    this.scene.addFurnishing(0.375, 0.1, Math.PI / 12.0, 0.08, 0.08, 0.06);
    this.scene.addFurnishing(-0.25, 0.1, Math.PI / 8.0, 0.07, 0.05, 0.08);
    this.scene.addFurnishing(0.45, -0.35, Math.PI / 6.0, 0.12, 0.12, 0.1);
    this.scene.addFurnishing(-0.125, -0.1, Math.PI / -16.0, 0.04, 0.02, 0.04);

    this.scene.position.set(-0, -4, 0);

    this.camera = new CubeCamera(0.1, 100, 256);
    this.camera.renderTarget.texture.type = FloatType;
    this.camera.renderTarget.texture.minFilter = LinearMipMapLinearFilter;
    this.camera.renderTarget.texture.generateMipmaps = true;
  }

  /**
   * Generate an environment map for a room.
   *
   * @param {number} mapSize
   */
  generate() {
    if (!rendererTextureCache.has(this.renderer)) {
      this.camera.clear(this.renderer);

      var gammaOutput = this.renderer.gammaOutput;
      var toneMapping = this.renderer.toneMapping;
      var toneMappingExposure = this.renderer.toneMappingExposure;

      this.renderer.toneMapping = LinearToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.gammaOutput = false;

      this.camera.update(this.renderer, this.scene);

      this.renderer.toneMapping = toneMapping;
      this.renderer.toneMappingExposure = toneMappingExposure;
      this.renderer.gammaOutput = gammaOutput;

      rendererTextureCache.set(this.renderer, this.camera.renderTarget.texture);
    }

    return rendererTextureCache.get(this.renderer);
  }

  dispose() {
    this.camera.renderTarget.dispose();
  }
}
