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

import {AmbientLight, BackSide, Box3, Color, DirectionalLight, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Scene, SphereBufferGeometry, Vector3} from 'three';

import Model from './Model.js';
import StaticShadow from './StaticShadow.js';

// Valid types for `setScaleType` -- 'framed' scales the model
// so that it fits within its 2D plane nicely. 'lifesize' is
// unaltered scaling and uses whatever size the model provides,
// such that 1 unit === 1 meter, used in AR.
export const ScaleTypes = {
  Framed: 'framed',
  Lifesize: 'lifesize',
};
const ScaleTypeNames = Object.keys(ScaleTypes).map(type => ScaleTypes[type]);

// This (arbitrary) value represents the height of the scene in
// meters. With a fixed dimension, we can scale everything accordingly
// to fit within this space and properly frame the model within view.
// For example, if the containing canvas is 800px x 400px, then the scene
// would be 20m x 10m if FRAMED_HEIGHT === 10.
export const FRAMED_HEIGHT = 10;

// Vertical field of view of camera, in degrees.
const FOV = 45;
const DPR = window.devicePixelRatio;

const $paused = Symbol('paused');

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export default class ModelScene extends Scene {
  /**
   * @param {XRModelElement} options.element
   * @param {CanvasHTMLElement} options.canvas
   * @param {number} options.width
   * @param {number} options.height
   * @param {THREE.WebGLRenderer} options.renderer
   */
  constructor({canvas, element, width, height, renderer}) {
    super();

    this.onModelLoad = this.onModelLoad.bind(this);
    this[$paused] = false;

    this.element = element;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.renderer = renderer;
    this.scaleType = ScaleTypes.Framed;

    this.model = new Model();
    this.shadow = new StaticShadow();
    this.light = new AmbientLight(0xffffff, 1.5);
    // This light is only for generating (fake) shadows
    // and does not needed to be added to the scene.
    // @see StaticShadow.js
    this.shadowLight = new DirectionalLight(0xffffff, 0);
    this.shadowLight.position.set(0, 10, 0);

    this.camera = new PerspectiveCamera(FOV, this.aspect, 0.1, 100);
    this.camera.position.y = 5;
    this.activeCamera = this.camera;
    this.pivot = new Object3D();

    const skysphereGeo = new SphereBufferGeometry(1, 32, 32);
    const skysphereMat = new MeshBasicMaterial({
      side: BackSide,
      color: 0xffffff,
    });
    this.skysphere = new Mesh(skysphereGeo, skysphereMat);

    this.add(this.pivot);
    this.add(this.light);
    this.add(this.skysphere);
    this.pivot.add(this.model);

    this.isVisible = false;
    this.isDirty = false;

    this.roomBox = new Box3();
    this.roomSize = new Vector3();
    this.setSize(width, height);

    this.model.addEventListener('model-load', this.onModelLoad);
  }

  get paused() {
    return this[$paused];
  }

  pause() {
    this[$paused] = true;
  }

  resume() {
    this[$paused] = false;
  }

  /**
   * Sets the model via URL.
   *
   * @param {String} source
   */
  async setModelSource(source) {
    try {
      await this.model.setSource(source);
    } catch (e) {
      console.error(`Could not set model source: ${source}`);
    }
  }

  /**
   * Receives the size of the 2D canvas element to make according
   * adjustments in the scene.
   *
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    if (width !== this.width || height !== this.height) {
      this.width = Math.max(width, 1);
      this.height = Math.max(height, 1);
      this.aspect = this.width / this.height;
      this.applyRoomSize();
    }
  }

  /**
   * Updates the 3D room and model scale based on the 2D
   * dimensions for the encapsulating element.
   */
  applyRoomSize() {
    this.canvas.width = this.width * DPR;
    this.canvas.height = this.height * DPR;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    // Use the room width as the room depth as well, since
    // the model can rotate on its Y axis
    const halfWidth = this.aspect * FRAMED_HEIGHT / 2;
    this.roomBox.min.set(-halfWidth, 0, -halfWidth);
    this.roomBox.max.set(halfWidth, FRAMED_HEIGHT, halfWidth);
    this.roomBox.getSize(this.roomSize);

    this.scaleModelToFitRoom();

    // Now that the room has been scaled with width === depth,
    // we may be able to reduce the depth so that the camera
    // doesn't have to be so far back. This can only occur
    // when the model is scale-limited on the Y axis, since
    // otherwise, width === depth must be equal for rotation.
    const modelSize = this.model.size;
    if (modelSize.length() !== 0 && modelSize.y >= modelSize.x &&
        modelSize.y >= modelSize.z) {
      const depth = Math.max(modelSize.x, modelSize.z) * this.model.scale.z;
      this.roomBox.max.z = depth / 2;
      this.roomBox.min.z = depth / -2;
      this.roomSize.z = depth;
    }

    // Position the camera such that the element is perfectly framed
    this.camera.near =
        (FRAMED_HEIGHT / 2) / Math.tan((FOV / 2) * Math.PI / 180);
    this.camera.aspect = this.aspect;
    this.camera.position.z = (this.roomBox.max.z) + this.camera.near;
    this.camera.updateProjectionMatrix();

    // We want to scale our skysphere such that it's larger than the room.
    // Take the largest side of the room, assume it's as large as possible
    // on all sides (cube), find the diagonal of the cube, and set the
    // skysphere's diameter to that.
    // width == depth, so check the aspect ratio to find largest side.
    const longestWall = this.aspect > 1 ? halfWidth * 2 : FRAMED_HEIGHT;

    // `x * sqrt(3)` is the length of the longest diagonal through a cube
    // with longest side of `x`.
    this.skysphere.scale.setScalar(longestWall * Math.sqrt(3));

    this.updateStaticShadow();
  }

  /**
   * Returns the size of the corresponding canvas element.
   * @return {Object}
   */
  getSize() {
    return {width: this.width, height: this.height};
  }

  /**
   * Scales the model to fit the enclosed room.
   */
  scaleModelToFitRoom() {
    if (!this.model.hasModel() || this.model.size.length() === 0) {
      return;
    }

    this.resetModelPose();

    const roomSize = this.roomSize;
    const modelSize = this.model.size;
    const roomCenter = this.roomBox.getCenter(new Vector3());
    const modelCenter = this.model.boundingBox.getCenter(new Vector3());

    const scale = Math.min(
        roomSize.x / modelSize.x,
        roomSize.y / modelSize.y,
        roomSize.z / modelSize.z);

    modelCenter.multiplyScalar(scale);
    this.model.scale.multiplyScalar(scale);
    this.model.position.subVectors(roomCenter, modelCenter);
  }

  resetModelPose() {
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);
  }

  /**
   * Returns the current camera.
   * @return {THREE.PerspectiveCamera}
   */
  getCamera() {
    return this.activeCamera;
  }

  /**
   * Sets the passed in camera to be used for rendering.
   * @param {THREE.Camera}
   */
  setCamera(camera) {
    this.activeCamera = camera;
  }

  /**
   * Called when the model's contents have loaded, or changed.
   */
  onModelLoad() {
    this.applyRoomSize();
    this.dispatchEvent({type: 'model-load'});
  }

  /**
   * Called to update the shadow rendering when the room or model changes.
   */
  updateStaticShadow() {
    if (!this.model.hasModel() || this.model.size.length() === 0) {
      this.pivot.remove(this.shadow);
      return;
    }

    this.shadow.scale.x = this.roomSize.x;
    this.shadow.scale.z = this.roomSize.z;
    this.shadow.render(this.renderer.renderer, this, this.shadowLight);

    // Lazily add the shadow so we're only displaying it once it has
    // a generated texture.
    this.pivot.add(this.shadow);
  }
}
