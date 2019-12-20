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

import {BackSide, BoxBufferGeometry, Camera, Color, Event as ThreeEvent, Mesh, Object3D, PerspectiveCamera, Scene, Shader, ShaderLib, ShaderMaterial, Vector3} from 'three';

import ModelViewerElementBase, {$needsRender, $renderer} from '../model-viewer-base.js';
import {resolveDpr} from '../utilities.js';

import Model, {DEFAULT_FOV_DEG} from './Model.js';
import {cubeUVChunk} from './shader-chunk/cube_uv_reflection_fragment.glsl.js';
import {Shadow} from './Shadow.js';

export interface ModelLoadEvent extends ThreeEvent {
  url: string
}

export interface ModelSceneConfig {
  element: ModelViewerElementBase;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export type IlluminationRole = 'primary'|'secondary'

export const IlluminationRole: {[index: string]: IlluminationRole} = {
  Primary: 'primary',
  Secondary: 'secondary'
};

const DEFAULT_TAN_FOV = Math.tan((DEFAULT_FOV_DEG / 2) * Math.PI / 180);

const $paused = Symbol('paused');

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export class ModelScene extends Scene {
  private[$paused]: boolean = false;

  public aspect = 1;
  public canvas: HTMLCanvasElement;
  public shadow: Shadow|null = null;
  public shadowIntensity = 0;
  public shadowSoftness = 1;
  public pivot: Object3D;
  public pivotCenter: Vector3;
  public width = 1;
  public height = 1;
  public isVisible: boolean = false;
  public isDirty: boolean = false;
  public element: ModelViewerElementBase;
  public context: CanvasRenderingContext2D;
  public exposure = 1;
  public model: Model;
  public framedFieldOfView = DEFAULT_FOV_DEG;
  public skyboxMesh: Mesh;
  public activeCamera: Camera;
  // These default camera values are never used, as they are reset once the
  // model is loaded and framing is computed.
  public camera = new PerspectiveCamera(45, 1, 0.1, 100);

  constructor({canvas, element, width, height}: ModelSceneConfig) {
    super();

    this.name = 'ModelScene';

    this.element = element;
    this.canvas = canvas;
    this.context = canvas.getContext('2d')!;

    this.model = new Model();

    // These default camera values are never used, as they are reset once the
    // model is loaded and framing is computed.
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.name = 'MainCamera';

    this.activeCamera = this.camera;
    this.pivot = new Object3D();
    this.pivot.name = 'Pivot';
    this.pivotCenter = new Vector3;

    this.skyboxMesh = this.createSkyboxMesh();

    this.add(this.pivot);
    this.pivot.add(this.model);

    this.setSize(width, height);
    this.background = new Color(0xffffff);

    this.model.addEventListener(
        'model-load', (event: any) => this.onModelLoad(event));
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
   */
  async setModelSource(
      source: string|null, progressCallback?: (progress: number) => void) {
    try {
      await this.model.setSource(source, progressCallback);
    } catch (e) {
      throw new Error(
          `Could not set model source to '${source}': ${e.message}`);
    }
  }

  /**
   * Receives the size of the 2D canvas element to make according
   * adjustments in the scene.
   */
  setSize(width: number, height: number) {
    if (width !== this.width || height !== this.height) {
      this.width = Math.max(width, 1);
      this.height = Math.max(height, 1);
      // In practice, invocations of setSize are throttled at the element level,
      // so no need to throttle here:
      const dpr = resolveDpr();
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.aspect = this.width / this.height;
      this.frameModel();

      // Immediately queue a render to happen at microtask timing. This is
      // necessary because setting the width and height of the canvas has the
      // side-effect of clearing it, and also if we wait for the next rAF to
      // render again we might get hit with yet-another-resize, or worse we
      // may not actually be marked as dirty and so render will just not
      // happen. Queuing a render to happen here means we will render twice on
      // a resize frame, but it avoids most of the visual artifacts associated
      // with other potential mitigations for this problem. See discussion in
      // https://github.com/GoogleWebComponents/model-viewer/pull/619 for
      // additional considerations.
      Promise.resolve().then(() => {
        this.element[$renderer].render(performance.now());
      });
    }
  }

  /**
   * Set's the framedFieldOfView based on the aspect ratio of the window in
   * order to keep the model fully visible at any camera orientation.
   */
  frameModel() {
    const vertical = DEFAULT_TAN_FOV *
        Math.max(1, this.model.fieldOfViewAspect / this.aspect);
    this.framedFieldOfView = 2 * Math.atan(vertical) * 180 / Math.PI;
  }

  /**
   * Returns the size of the corresponding canvas element.
   */
  getSize(): {width: number, height: number} {
    return {width: this.width, height: this.height};
  }

  /**
   * Returns the current camera.
   */
  getCamera(): Camera {
    return this.activeCamera;
  }

  /**
   * Sets the passed in camera to be used for rendering.
   */
  setCamera(camera: Camera) {
    this.activeCamera = camera;
  }

  /**
   * Sets the rotation of the model's pivot, around its pivotCenter point.
   */
  setPivotRotation(radiansY: number) {
    this.pivot.rotation.y = radiansY;
    this.pivot.position.x = -this.pivotCenter.x;
    this.pivot.position.z = -this.pivotCenter.z;
    this.pivot.position.applyAxisAngle(this.pivot.up, radiansY);
    this.pivot.position.x += this.pivotCenter.x;
    this.pivot.position.z += this.pivotCenter.z;
    if (this.shadow != null) {
      this.shadow.setRotation(radiansY);
    }
  }

  /**
   * Gets the current rotation value of the pivot
   */
  getPivotRotation(): number {
    return this.pivot.rotation.y;
  }

  /**
   * Called when the model's contents have loaded, or changed.
   */
  onModelLoad(event: {url: string}) {
    this.frameModel();
    this.setShadowIntensity(this.shadowIntensity);
    if (this.shadow != null) {
      this.shadow.setModel(this.model, this.shadowSoftness);
    }
    // Uncomment if using showShadowHelper below
    // if (this.children.length > 1) {
    //   (this.children[1] as CameraHelper).update();
    // }
    this.element[$needsRender]();
    this.dispatchEvent({type: 'model-load', url: event.url});
  }

  /**
   * Sets the shadow's intensity, lazily creating the shadow as necessary.
   */
  setShadowIntensity(shadowIntensity: number) {
    this.shadowIntensity = shadowIntensity;
    if (shadowIntensity > 0 && this.model.hasModel()) {
      if (this.shadow == null) {
        this.shadow = new Shadow(this.model, this.pivot, this.shadowSoftness);
        this.pivot.add(this.shadow);
        // showShadowHelper(this);
      }
      this.shadow.setIntensity(shadowIntensity);
    }
  }

  /**
   * Sets the shadow's softness by mapping a [0, 1] softness parameter to the
   * shadow's resolution. This involves reallocation, so it should not be
   * changed frequently. Softer shadows are cheaper to render.
   */
  setShadowSoftness(softness: number) {
    this.shadowSoftness = softness;
    if (this.shadow != null) {
      this.shadow.setSoftness(softness);
    }
  }

  createSkyboxMesh(): Mesh {
    const geometry = new BoxBufferGeometry(1, 1, 1);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    const material = new ShaderMaterial({
      uniforms: {envMap: {value: null}, opacity: {value: 1.0}},
      vertexShader: ShaderLib.cube.vertexShader,
      fragmentShader: ShaderLib.cube.fragmentShader,
      side: BackSide,
      // Turn off the depth buffer so that even a small box still ends up
      // enclosing a scene of any size.
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    material.extensions = {
      derivatives: true,
      fragDepth: false,
      drawBuffers: false,
      shaderTextureLOD: false
    };
    const samplerUV = `
#define ENVMAP_TYPE_CUBE_UV
#define PI 3.14159265359
${cubeUVChunk}
uniform sampler2D envMap;
    `;
    material.onBeforeCompile = (shader: Shader) => {
      shader.fragmentShader =
          shader.fragmentShader.replace('uniform samplerCube tCube;', samplerUV)
              .replace(
                  'vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );',
                  'gl_FragColor = textureCubeUV( envMap, vWorldDirection, 0.0 );')
              .replace('gl_FragColor = mapTexelToLinear( texColor );', '');
    };
    const skyboxMesh = new Mesh(geometry, material);
    skyboxMesh.frustumCulled = false;
    // This centers the box on the camera, ensuring the view is not affected by
    // the camera's motion, which makes it appear inifitely large, as it should.
    skyboxMesh.onBeforeRender = function(_renderer, _scene, camera) {
      this.matrixWorld.copyPosition(camera.matrixWorld);
    };
    return skyboxMesh;
  }

  skyboxMaterial(): ShaderMaterial {
    return this.skyboxMesh.material as ShaderMaterial;
  }
}
