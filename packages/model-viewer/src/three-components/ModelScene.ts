/* @license
 * Copyright 2025 Google LLC. All Rights Reserved.
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

import {AnimationAction, AnimationActionLoopStyles, AnimationClip, AnimationMixer, AnimationMixerEventMap, Box3, Camera, Euler, Event as ThreeEvent, Intersection, LoopOnce, LoopPingPong, LoopRepeat, Material, Matrix3, Matrix4, Mesh, NeutralToneMapping, Object3D, PerspectiveCamera, Raycaster, Scene, Sphere, Texture, ToneMapping, Triangle, Vector2, Vector3, WebGLRenderer, XRTargetRaySpace} from 'three';
import {CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {reduceVertices} from 'three/examples/jsm/utils/SceneUtils.js';

import {$currentGLTF, $model, $originalGltfJson} from '../features/scene-graph.js';
import {$nodeFromIndex, $nodeFromPoint} from '../features/scene-graph/model.js';
import ModelViewerElementBase, {$renderer, $scene, EffectComposerInterface, RendererInterface} from '../model-viewer-base.js';
import {ModelViewerElement} from '../model-viewer.js';
import {normalizeUnit} from '../styles/conversions.js';
import {NumberNode, parseExpressions} from '../styles/parsers.js';

import {Damper, SETTLING_TIME} from './Damper.js';
import {ModelViewerGLTFInstance} from './gltf-instance/ModelViewerGLTFInstance.js';
import {GroundedSkybox} from './GroundedSkybox.js';
import {Hotspot} from './Hotspot.js';
import {Shadow} from './Shadow.js';

export const GROUNDED_SKYBOX_SIZE = 10;
const MIN_SHADOW_RATIO = 100;

export interface ModelLoadEvent extends ThreeEvent {
  url: string;
}

export interface ModelSceneConfig {
  element: ModelViewerElementBase;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface MarkedAnimation {
  name: string, loopMode: AnimationActionLoopStyles, repetitionCount: number
}

export type IlluminationRole = 'primary'|'secondary';

export const IlluminationRole: {[index: string]: IlluminationRole} = {
  Primary: 'primary',
  Secondary: 'secondary'
};

const view = new Vector3();
const target = new Vector3();
const normalWorld = new Vector3();

const raycaster = new Raycaster();
const vector3 = new Vector3();
const ndc = new Vector2();

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export class ModelScene extends Scene {
  element: ModelViewerElement;
  canvas: HTMLCanvasElement;
  annotationRenderer = new CSS2DRenderer();
  effectRenderer: EffectComposerInterface|null = null;
  schemaElement = document.createElement('script');
  width = 1;
  height = 1;
  aspect = 1;
  scaleStep = 0;
  renderCount = 0;
  externalRenderer: RendererInterface|null = null;
  appendedAnimations: Array<string> = [];
  markedAnimations: Array<MarkedAnimation> = [];

  // These default camera values are never used, as they are reset once the
  // model is loaded and framing is computed.
  camera = new PerspectiveCamera(45, 1, 0.1, 100);
  xrCamera: Camera|null = null;

  url: string|null = null;
  extraUrls: string[] = [];
  scenePivot = new Object3D();
  target = new Object3D();
  animationNames: Array<string> = [];
  boundingBox = new Box3();
  boundingSphere = new Sphere();
  size = new Vector3();
  idealAspect = 0;
  framedFoVDeg = 0;

  shadow: Shadow|null = null;
  shadowIntensity = 0;
  shadowSoftness = 1;
  bakedShadows = new Set<Mesh>();

  exposure = 1;
  toneMapping: ToneMapping = NeutralToneMapping;
  canScale = true;

  private isDirty = false;

  private goalTarget = new Vector3();
  private targetDamperX = new Damper();
  private targetDamperY = new Damper();
  private targetDamperZ = new Damper();

  private _currentGLTFs: ModelViewerGLTFInstance[] = [];
  private _models: Object3D[] = [];
  private boundsAndShadowDirty = false;
  private mixers: AnimationMixer[] = [];
  private mixerPausedStates: boolean[] = [];
  private cancelPendingSourceChange: (() => void)|null = null;
  private animationsByName: Map<string, AnimationClip> = new Map();
  private currentAnimationActions: (AnimationAction|null)[] = [];

  private groundedSkybox = new GroundedSkybox();

  constructor({canvas, element, width, height}: ModelSceneConfig) {
    super();

    this.name = 'ModelScene';

    this.element = element as ModelViewerElement;
    this.canvas = canvas;

    // These default camera values are never used, as they are reset once the
    // model is loaded and framing is computed.
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.name = 'MainCamera';

    this.add(this.scenePivot);
    this.scenePivot.name = 'Pivot';

    this.scenePivot.add(this.target);

    this.setSize(width, height);

    this.target.name = 'Target';

    // Mixers will be array based
    this.mixers = [];

    const {domElement} = this.annotationRenderer;
    const {style} = domElement;
    style.display = 'none';
    style.pointerEvents = 'none';
    style.position = 'absolute';
    style.top = '0';
    this.element.shadowRoot!.querySelector('.default')!.appendChild(domElement);

    this.schemaElement.setAttribute('type', 'application/ld+json');
  }

  /**
   * Function to create the context lazily, as when there is only one
   * <model-viewer> element, the renderer's 3D context can be displayed
   * directly. This extra context is necessary to copy the renderings into when
   * there are more than one.
   */
  get context() {
    return this.canvas.getContext('2d');
  }

  getCamera(): Camera {
    return this.xrCamera != null ? this.xrCamera : this.camera;
  }

  queueRender() {
    this.isDirty = true;
  }

  shouldRender() {
    return this.isDirty;
  }

  hasRendered() {
    this.isDirty = false;
  }

  forceRescale() {
    this.scaleStep = -1;
    this.queueRender();
  }

  /**
   * Pass in a THREE.Object3D to be controlled
   * by this model.
   */
  async setObject(model: Object3D) {
    this.reset();
    this._models = [model];
    this.target.add(model);
    await this.setupScene();
  }

  /**
   * Sets the model via URL.
   */

  async setSource(
      url: string|null, extraUrls: string[] = [],
      progressCallback: (progress: number) => void = () => {}) {
    if ((!url || url === this.url) &&
        extraUrls.join(',') === this.extraUrls.join(',')) {
      progressCallback(1);
      return;
    }
    this.reset();
    this.url = url;
    this.extraUrls = extraUrls;

    if (this.externalRenderer != null) {
      const framingInfo = await this.externalRenderer.load(progressCallback);

      this.boundingSphere.radius = framingInfo.framedRadius;
      this.idealAspect = framingInfo.fieldOfViewAspect;
      return;
    }

    // If we have pending work due to a previous source change in progress,
    // cancel it so that we do not incur a race condition:
    if (this.cancelPendingSourceChange != null) {
      this.cancelPendingSourceChange!();
      this.cancelPendingSourceChange = null;
    }

    let gltfs: ModelViewerGLTFInstance[] = [];

    try {
      const urlsToLoad: string[] = [];
      if (url)
        urlsToLoad.push(url);
      if (extraUrls)
        urlsToLoad.push(...extraUrls);

      if (urlsToLoad.length > 0) {
        gltfs =
            await new Promise<ModelViewerGLTFInstance[]>((resolve, reject) => {
              this.cancelPendingSourceChange = () => reject();

              (async () => {
                try {
                  const results = await Promise.all(urlsToLoad.map(
                      curUrl => this.element[$renderer].loader.load(
                          curUrl, this.element, progressCallback)));
                  resolve(results as ModelViewerGLTFInstance[]);
                } catch (error) {
                  reject(error);
                }
              })();
            });
      }
    } catch (error) {
      if (error == null) {
        // Loading was cancelled, so silently return
        return;
      }

      throw error;
    }


    this.cancelPendingSourceChange = null;
    this.reset();
    this.url = url;
    this.extraUrls = extraUrls;
    this._currentGLTFs = gltfs;

    for (const gltf of gltfs) {
      if (gltf != null) {
        this._models.push(gltf.scene);
        this.target.add(gltf.scene);
        this.mixers.push(new AnimationMixer(gltf.scene));
        this.mixerPausedStates.push(false);
        this.currentAnimationActions.push(null);
      } else {
        this.mixers.push(new AnimationMixer(this.target));
        this.mixerPausedStates.push(false);
        this.currentAnimationActions.push(null);
      }
    }

    const animationsByName = new Map();
    const animationNames = [];
    const allAnimations = [];

    for (const gltf of gltfs) {
      for (const animation of gltf.animations || []) {
        animationsByName.set(animation.name, animation);
        animationNames.push(animation.name);
        allAnimations.push(animation);
      }
    }

    this.animations = allAnimations;
    this.animationsByName = animationsByName;
    this.animationNames = animationNames;

    await this.setupScene();
  }

  private async setupScene() {
    this.applyTransform();
    this.updateBoundingBox();

    await this.updateFraming();

    this.updateShadow();
    this.setShadowIntensity(this.shadowIntensity);

    this.setGroundedSkybox();
  }

  updateModelTransforms(
      index: number, offset?: string|null, _orientation?: string|null,
      scale?: string|null) {
    const model = this._models[index];
    if (!model)
      return;

    if (offset) {
      const parts = offset.split(' ')
                        .map(s => s.trim())
                        .filter(s => s.length > 0)
                        .map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        model.position.set(parts[0], parts[1], parts[2]);
      }
    }

    if (scale) {
      const parts = scale.split(' ')
                        .map(s => s.trim())
                        .filter(s => s.length > 0)
                        .map(Number);
      if (parts.length === 1 && !isNaN(parts[0])) {
        model.scale.setScalar(parts[0]);
      } else if (parts.length === 3 && !parts.some(isNaN)) {
        model.scale.set(parts[0], parts[1], parts[2]);
      }
    }

    model.updateMatrixWorld(true);
    // Defer bounding box and shadow recalculations.
    // If developers animate `<extra-model>` offset or scale properties via
    // requestAnimationFrame, recalculating bounding boxes synchronously every
    // single frame here blocks the main thread and tanks frame rates. Instead,
    // we mark the bounds as dirty and wait for the render loop or a public
    // dimensions getter to flush the changes.
    this.boundsAndShadowDirty = true;
    this.queueRender();
  }

  /**
   * Evaluates bounding box recalculations asynchronously.
   * Flushed right before a frame is rendered or when dimension properties are
   * formally queried to ensure that high-frequency layout changes don't stall
   * execution natively.
   */
  updateBoundingBoxAndShadowIfDirty() {
    if (this.boundsAndShadowDirty) {
      this.boundsAndShadowDirty = false;
      this.updateBoundingBox();
      this.updateShadow();
    }
  }

  reset() {
    this.url = null;
    this.renderCount = 0;
    this.queueRender();
    if (this.shadow != null) {
      this.shadow.setIntensity(0);
    }
    this.bakedShadows.clear();

    const {_models} = this;
    for (const mod of _models) {
      if (mod != null)
        mod.removeFromParent();
    }
    this._models = [];

    const gltfs = this._currentGLTFs;
    for (const gltf of gltfs) {
      if (gltf != null)
        gltf.dispose();
    }
    this._currentGLTFs = [];

    for (const action of this.currentAnimationActions) {
      if (action != null) {
        action.stop();
      }
    }
    this.currentAnimationActions = [];

    for (const mixer of this.mixers) {
      mixer.stopAllAction();
      mixer.uncacheRoot(this);
    }
    this.mixers = [];
    this.mixerPausedStates = [];
  }

  dispose() {
    this.reset();
    if (this.shadow != null) {
      this.shadow.dispose();
      this.shadow = null;
    }
    (this.element as any)[$currentGLTF] = null;
    (this.element as any)[$originalGltfJson] = null;
    (this.element as any)[$model] = null;
  }

  get currentGLTF() {
    return this._currentGLTFs[0] || null;
  }

  get currentGLTFs() {
    return this._currentGLTFs;
  }

  /**
   * Updates the ModelScene for a new container size in CSS pixels.
   */
  setSize(width: number, height: number) {
    if (this.width === width && this.height === height) {
      return;
    }
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.annotationRenderer.setSize(width, height);

    this.aspect = this.width / this.height;

    if (this.externalRenderer != null) {
      const dpr = window.devicePixelRatio;
      this.externalRenderer.resize(width * dpr, height * dpr);
    }

    this.queueRender();
  }

  markBakedShadow(mesh: Mesh) {
    mesh.userData.noHit = true;
    this.bakedShadows.add(mesh);
  }

  unmarkBakedShadow(mesh: Mesh) {
    mesh.userData.noHit = false;
    mesh.visible = true;
    this.bakedShadows.delete(mesh);
    this.boundingBox.expandByObject(mesh);
  }

  findBakedShadows(group: Object3D) {
    const boundingBox = new Box3();

    group.traverse((object: Object3D) => {
      const mesh = object as Mesh;
      if (!mesh.material) {
        return;
      }
      const material = mesh.material as Material;
      if (!material.transparent) {
        return;
      }
      boundingBox.setFromObject(mesh);
      const size = boundingBox.getSize(vector3);
      const minDim = Math.min(size.x, size.y, size.z);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim < MIN_SHADOW_RATIO * minDim) {
        return;
      }
      this.markBakedShadow(mesh);
    });
  }

  checkBakedShadows() {
    const {min, max} = this.boundingBox;
    const shadowBox = new Box3();
    this.boundingBox.getSize(this.size);

    for (const mesh of this.bakedShadows) {
      shadowBox.setFromObject(mesh);
      if (shadowBox.min.y < min.y + this.size.y / MIN_SHADOW_RATIO &&
          shadowBox.min.x <= min.x && shadowBox.max.x >= max.x &&
          shadowBox.min.z <= min.z && shadowBox.max.z >= max.z) {
        // floor shadow
        continue;
      }
      if (shadowBox.min.z < min.z + this.size.z / MIN_SHADOW_RATIO &&
          shadowBox.min.x <= min.x && shadowBox.max.x >= max.x &&
          shadowBox.min.y <= min.y && shadowBox.max.y >= max.y) {
        // wall shadow
        continue;
      }
      this.unmarkBakedShadow(mesh);
    }
  }

  applyTransform() {
    const {models} = this;
    if (models.length === 0) {
      return;
    }
    const orientation = parseExpressions(this.element.orientation)[0]
                            .terms as [NumberNode, NumberNode, NumberNode];

    const roll = normalizeUnit(orientation[0]).number;
    const pitch = normalizeUnit(orientation[1]).number;
    const yaw = normalizeUnit(orientation[2]).number;

    const scale = parseExpressions(this.element.scale)[0]
                      .terms as [NumberNode, NumberNode, NumberNode];

    for (const mod of models) {
      mod.quaternion.setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'));
      mod.scale.set(scale[0].number, scale[1].number, scale[2].number);
    }
  }

  updateBoundingBox() {
    const {models} = this;
    if (models.length === 0) {
      return;
    }

    for (const mod of models) {
      this.target.remove(mod);
      this.findBakedShadows(mod);
    }

    const bound = (box: Box3, vertex: Vector3): Box3 => {
      return box.expandByPoint(vertex);
    };
    this.setBakedShadowVisibility(false);

    let combinedBox = new Box3();
    for (const mod of models) {
      combinedBox = reduceVertices(mod, bound, combinedBox);
    }
    this.boundingBox = combinedBox;

    // If there's nothing but the baked shadow, then it's not a baked shadow.
    if (this.boundingBox.isEmpty()) {
      this.setBakedShadowVisibility(true);
      this.bakedShadows.forEach((mesh) => this.unmarkBakedShadow(mesh));
      combinedBox = new Box3();
      for (const mod of models) {
        combinedBox = reduceVertices(mod, bound, combinedBox);
      }
      this.boundingBox = combinedBox;
    }
    this.checkBakedShadows();
    this.setBakedShadowVisibility();

    this.boundingBox.getSize(this.size);

    for (const mod of models) {
      this.target.add(mod);
    }
  }

  /**
   * Calculates the boundingSphere and idealAspect that allows the 3D
   * object to be framed tightly in a 2D window of any aspect ratio without
   * clipping at any camera orbit. The camera's center target point can be
   * optionally specified. If no center is specified, it defaults to the center
   * of the bounding box, which means asymmetric models will tend to be tight on
   * one side instead of both. Proper choice of center can correct this.
   */
  async updateFraming() {
    const {models} = this;
    if (models.length === 0) {
      return;
    }

    for (const mod of models) {
      this.target.remove(mod);
    }
    this.setBakedShadowVisibility(false);
    const {center} = this.boundingSphere;

    this.element.requestUpdate('cameraTarget');
    await this.element.updateComplete;
    center.copy(this.getTarget());

    const radiusSquared = (value: number, vertex: Vector3): number => {
      return Math.max(value, center!.distanceToSquared(vertex));
    };

    let maxRadiusSq = 0;
    for (const mod of models) {
      maxRadiusSq =
          Math.max(maxRadiusSq, reduceVertices(mod, radiusSquared, 0));
    }
    this.boundingSphere.radius = Math.sqrt(maxRadiusSq);

    const horizontalTanFov = (value: number, vertex: Vector3): number => {
      vertex.sub(center!);
      const radiusXZ = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      return Math.max(
          value, radiusXZ / (this.idealCameraDistance() - Math.abs(vertex.y)));
    };

    let maxAspect = 0;
    for (const mod of models) {
      maxAspect = Math.max(maxAspect, reduceVertices(mod, horizontalTanFov, 0));
    }
    this.idealAspect =
        maxAspect / Math.tan((this.framedFoVDeg / 2) * Math.PI / 180);

    this.setBakedShadowVisibility();
    for (const mod of models) {
      this.target.add(mod);
    }
  }

  setBakedShadowVisibility(visible: boolean = this.shadowIntensity <= 0) {
    for (const shadow of this.bakedShadows) {
      shadow.visible = visible;
    }
  }

  idealCameraDistance(): number {
    const halfFovRad = (this.framedFoVDeg / 2) * Math.PI / 180;
    return this.boundingSphere.radius / Math.sin(halfFovRad);
  }

  /**
   * Set's the framedFieldOfView based on the aspect ratio of the window in
   * order to keep the model fully visible at any camera orientation.
   */
  adjustedFoV(fovDeg: number): number {
    const vertical = Math.tan((fovDeg / 2) * Math.PI / 180) *
        Math.max(1, this.idealAspect / this.aspect);
    return 2 * Math.atan(vertical) * 180 / Math.PI;
  }

  getNDC(clientX: number, clientY: number): Vector2 {
    if (this.xrCamera != null) {
      ndc.set(clientX / window.screen.width, clientY / window.screen.height);
    } else {
      const rect = this.element.getBoundingClientRect();
      ndc.set(
          (clientX - rect.x) / this.width, (clientY - rect.y) / this.height);
    }

    ndc.multiplyScalar(2).subScalar(1);
    ndc.y *= -1;
    return ndc;
  }

  /**
   * Returns the size of the corresponding canvas element.
   */
  getSize(): {width: number, height: number} {
    return {width: this.width, height: this.height};
  }

  setEnvironmentAndSkybox(environment: Texture|null, skybox: Texture|null) {
    if (this.element[$renderer].arRenderer.presentedScene === this) {
      return;
    }
    this.environment = environment;
    this.setBackground(skybox);
    this.queueRender();
  }

  setBackground(skybox: Texture|null) {
    this.groundedSkybox.map = skybox;
    if (this.groundedSkybox.isUsable()) {
      this.target.add(this.groundedSkybox);
      this.background = null;
    } else {
      this.target.remove(this.groundedSkybox);
      this.background = skybox;
    }
  }

  farRadius() {
    return this.boundingSphere.radius *
        (this.groundedSkybox.parent != null ? GROUNDED_SKYBOX_SIZE : 1);
  }

  setGroundedSkybox() {
    const heightNode =
        parseExpressions(this.element.skyboxHeight)[0].terms[0] as NumberNode;
    const height = normalizeUnit(heightNode).number;
    const radius = GROUNDED_SKYBOX_SIZE * this.boundingSphere.radius;

    this.groundedSkybox.updateGeometry(height, radius);
    this.groundedSkybox.position.y =
        height - (this.shadow ? 2 * this.shadow.gap() : 0);

    this.setBackground(this.groundedSkybox.map);
  }

  /**
   * Sets the point in model coordinates the model should orbit/pivot around.
   */
  setTarget(modelX: number, modelY: number, modelZ: number) {
    this.goalTarget.set(-modelX, -modelY, -modelZ);
  }

  /**
   * Set the decay time of, affects the speed of target transitions.
   */
  setTargetDamperDecayTime(decayMilliseconds: number) {
    this.targetDamperX.setDecayTime(decayMilliseconds);
    this.targetDamperY.setDecayTime(decayMilliseconds);
    this.targetDamperZ.setDecayTime(decayMilliseconds);
  }

  /**
   * Gets the point in model coordinates the model should orbit/pivot around.
   */
  getTarget(): Vector3 {
    return this.goalTarget.clone().multiplyScalar(-1);
  }

  /**
   * Gets the current target point, which may not equal the goal returned by
   * getTarget() due to finite input decay smoothing.
   */
  getDynamicTarget(): Vector3 {
    return this.target.position.clone().multiplyScalar(-1);
  }

  /**
   * Shifts the model to the target point immediately instead of easing in.
   */
  jumpToGoal() {
    this.updateTarget(SETTLING_TIME);
  }

  /**
   * This should be called every frame with the frame delta to cause the target
   * to transition to its set point.
   */
  updateTarget(delta: number): boolean {
    const goal = this.goalTarget;
    const target = this.target.position;
    if (!goal.equals(target)) {
      const normalization = this.boundingSphere.radius / 10;
      let {x, y, z} = target;
      x = this.targetDamperX.update(x, goal.x, delta, normalization);
      y = this.targetDamperY.update(y, goal.y, delta, normalization);
      z = this.targetDamperZ.update(z, goal.z, delta, normalization);
      this.groundedSkybox.position.x = -x;
      this.groundedSkybox.position.z = -z;
      this.target.position.set(x, y, z);
      this.target.updateMatrixWorld();
      this.queueRender();
      return true;
    } else {
      return false;
    }
  }

  /**
   * Yaw the +z (front) of the model toward the indicated world coordinates.
   */
  pointTowards(worldX: number, worldZ: number) {
    const {x, z} = this.position;
    this.yaw = Math.atan2(worldX - x, worldZ - z);
  }

  get model() {
    return this._models[0] || null;
  }

  get models() {
    return this._models;
  }

  /**
   * Yaw is the scene's orientation about the y-axis, around the rotation
   * center.
   */
  set yaw(radiansY: number) {
    this.scenePivot.rotation.y = radiansY;
    this.groundedSkybox.rotation.y = -radiansY;
    this.queueRender();
  }

  get yaw(): number {
    return this.scenePivot.rotation.y;
  }

  set animationTime(value: number) {
    for (const mixer of this.mixers) {
      mixer.setTime(value);
    }
    this.queueShadowRender();
  }

  get animationTime(): number {
    let maxTime = 0;

    for (const action of this.currentAnimationActions) {
      if (action != null) {
        let currentTime = action.time;
        const loopCount = Math.max((action as any)._loopCount, 0);

        if (action.loop === LoopPingPong && (loopCount & 1) === 1) {
          const clipDuration = action.getClip() ? action.getClip().duration : 0;
          currentTime = clipDuration - action.time;
        }

        if (currentTime > maxTime) {
          maxTime = currentTime;
        }
      }
    }

    return maxTime;
  }

  set animationTimeScale(value: number) {
    for (const mixer of this.mixers) {
      mixer.timeScale = value;
    }
  }

  get animationTimeScale(): number {
    return this.mixers.length > 0 ? this.mixers[0].timeScale : 1;
  }

  get duration(): number {
    let maxDuration = 0;

    for (const action of this.currentAnimationActions) {
      if (action != null && action.getClip()) {
        const clipDuration = action.getClip().duration;
        if (clipDuration > maxDuration) {
          maxDuration = clipDuration;
        }
      }
    }

    return maxDuration;
  }

  get hasActiveAnimation(): boolean {
    return this.currentAnimationActions.some(action => action != null);
  }

  /**
   * Plays an animation if there are any associated with the current model.
   * Accepts an optional string name of an animation to play. If no name is
   * provided, or if no animation is found by the given name, always falls back
   * to playing the first animation.
   * If a modelIndex is provided, plays the animation only on that model.
   */
  playAnimation(
      name: string|null = null, crossfadeTime: number = 0,
      loopMode: AnimationActionLoopStyles = LoopRepeat,
      repetitionCount: number = Infinity, modelIndex: number|null = null) {
    // Determine which models we're animating
    const startIndex = modelIndex != null ? modelIndex : 0;
    const endIndex = modelIndex != null ? modelIndex + 1 : this._models.length;

    for (let i = startIndex; i < endIndex; i++) {
      const gltf = this._currentGLTFs[i];
      if (gltf == null)
        continue;

      // Collect animations specific to this model
      const animations = gltf.animations || [];
      if (animations.length === 0)
        continue;

      let animationClip = null;

      if (name != null) {
        // Look for an animation with this precise name inside this model
        // We search backwards to mimic previous Map.set overriding behavior
        // so the last animation with the same name takes precedence.
        for (let k = animations.length - 1; k >= 0; k--) {
          if (animations[k].name === name) {
            animationClip = animations[k];
            break;
          }
        }

        if (animationClip == null) {
          const parsedAnimationIndex = parseInt(name);
          if (!isNaN(parsedAnimationIndex) && parsedAnimationIndex >= 0 &&
              parsedAnimationIndex < animations.length) {
            animationClip = animations[parsedAnimationIndex];
          }
        }
      }

      if (animationClip == null) {
        animationClip = animations[0];
      }

      try {
        const lastAnimationAction = this.currentAnimationActions[i];
        const mixer = this.mixers[i];
        const action = mixer.clipAction(animationClip, this._models[i]);

        this.currentAnimationActions[i] = action;

        if (this.element.paused) {
          mixer.stopAllAction();
          this.mixerPausedStates[i] = true;
        } else {
          action.paused = false;
          this.mixerPausedStates[i] = false;
          // Crossfade behavior doesn't work perfectly when the actions don't
          // map to the same skeleton. Since we're making a new mixer/action for
          // each model, if we didn't have one before it's fine.
          if (lastAnimationAction != null && action !== lastAnimationAction) {
            action.crossFadeFrom(lastAnimationAction, crossfadeTime, false);
          } else if (
              this.animationTimeScale > 0 &&
              this.animationTime == this.duration) {
            this.animationTime = 0;
          }
        }

        action.setLoop(loopMode, repetitionCount);
        action.enabled = true;
        action.clampWhenFinished = true;
        action.play();
      } catch (error) {
        console.error(error);
      }
    }
  }

  appendAnimation(
      name: string = '', loopMode: AnimationActionLoopStyles = LoopRepeat,
      repetitionCount: number = Infinity, weight: number = 1,
      timeScale: number = 1, fade: boolean|number|string = false,
      warp: boolean|number|string = false, relativeWarp: boolean = true,
      time: null|number|string = null, needsToStop: boolean = false,
      modelIndex: number|null = null) {
    if (this.currentGLTF == null || name === this.element.animationName) {
      return;
    }
    const {animations} = this;
    if (animations == null || animations.length === 0) {
      return;
    }

    const animationClip = name ? this.animationsByName.get(name) : null;
    if (animationClip == null) {
      return;
    }

    // validate and normalize parameters
    if (typeof repetitionCount === 'string') {
      if (isNaN(parseFloat(repetitionCount))) {
        repetitionCount = Infinity;
        console.warn(`Invalid repetitionCount value: ${
            repetitionCount}. Using default: Infinity`);
      } else {
        if (parseInt(repetitionCount) < 1) {
          console.warn(`Invalid repetitionCount value: ${
              repetitionCount}. Using 1 as minimum.`);
        }
        repetitionCount = Math.max(parseInt(repetitionCount), 1);
      }
    } else if (typeof repetitionCount === 'number' && repetitionCount < 1) {
      repetitionCount = 1;
      console.warn(`Invalid repetitionCount value: ${
          repetitionCount}. Using  1 value as minimum.`);
    } else {
      console.warn(`Invalid repetitionCount value: ${
          repetitionCount}. Using default: Infinity`);
    }

    if (repetitionCount === 1 && loopMode !== LoopOnce) {
      loopMode = LoopOnce;
    }

    if (typeof weight === 'string') {
      const parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 1) {
        weight = 1;
        console.warn(`Invalid weight value: ${weight}. Using default: 1`);
      } else {
        weight = parsedWeight;
      }
    }

    if (typeof timeScale === 'string') {
      const parsedTimeScale = parseFloat(timeScale);
      if (isNaN(parsedTimeScale) || parsedTimeScale < 0) {
        timeScale = 1;
        console.warn(`Invalid timeScale value: ${timeScale}. Using default: 1`);
      } else {
        timeScale = parsedTimeScale;
      }
    }

    if (typeof time === 'string') {
      // time = !isNaN(parseFloat(time)) ? parseFloat(time) : null;
      const parsedTime = parseFloat(time);
      if (isNaN(parsedTime)) {
        time = null;
        console.warn(
            `Invalid time value: ${time}. Using default: 0 or previous time`);
      } else {
        time = parsedTime;
      }
    }

    const {shouldFade, duration: fadeDuration} =
        this.parseFadeValue(fade, false, 1.25);

    const defaultWarpDuration = 1.25;
    let shouldWarp = false;
    let warpDuration = 0;

    if (typeof warp === 'boolean') {
      shouldWarp = warp;
      warpDuration = warp ? defaultWarpDuration : 0;
    } else if (typeof warp === 'number') {
      shouldWarp = warp > 0;
      warpDuration = Math.max(warp, 0);
      if (warp < 0) {
        console.warn(`Invalid warp value: ${warp}. Using default: false`);
      }
    } else if (typeof warp === 'string') {
      if (warp.toLowerCase().trim() === 'true') {
        shouldWarp = true;
        warpDuration = defaultWarpDuration;
      } else if (warp.toLowerCase().trim() === 'false') {
        shouldWarp = false;
      } else if (!isNaN(parseFloat(warp))) {
        warpDuration = Math.max(parseFloat(warp), 0);
        shouldWarp = warpDuration > 0;
        if (warpDuration <= 0) {
          console.warn(`Invalid warp value: ${warp}. Using default: false`);
        }
      } else {
        console.warn(`Invalid warp value: ${warp}. Using default: false`);
      }
    }

    try {
      if (needsToStop && this.appendedAnimations.includes(name)) {
        if (!this.markedAnimations.map(e => e.name).includes(name)) {
          this.markedAnimations.push({name, loopMode, repetitionCount});
        }
      }

      const startIndex = modelIndex != null ? modelIndex : 0;
      const endIndex = modelIndex != null ? modelIndex + 1 : this.mixers.length;

      for (let i = startIndex; i < endIndex; i++) {
        const mixer = this.mixers[i];
        const action = mixer.existingAction(animationClip) ||
            mixer.clipAction(animationClip, this._models[i] || this);

        const currentTimeScale = action.timeScale;

        if (typeof time === 'number') {
          action.time = Math.min(Math.max(time, 0), animationClip.duration);
        }

        if (shouldFade) {
          action.fadeIn(fadeDuration);
        } else if (weight >= 0) {
          action.weight = Math.min(Math.max(weight, 0), 1);
        }

        if (shouldWarp) {
          action.warp(
              relativeWarp ? currentTimeScale : 0, timeScale, warpDuration);
        } else {
          action.timeScale = timeScale;
        }

        if (!action.isRunning()) {
          if (action.time == animationClip.duration) {
            action.stop();
          }
          action.setLoop(loopMode, repetitionCount);
          action.paused = false;
          action.enabled = true;
          action.clampWhenFinished = true;
          action.play();
        }
      }

      if (!this.appendedAnimations.includes(name)) {
        this.element[$scene].appendedAnimations.push(name);
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Helper function to parse fade parameter values
   */
  private parseFadeValue(
      fade: boolean|number|string, defaultValue: boolean = true,
      defaultDuration: number = 1.5): {shouldFade: boolean, duration: number} {
    const normalizeString = (str: string) => str.toLowerCase().trim();

    if (typeof fade === 'boolean') {
      return {shouldFade: fade, duration: fade ? defaultDuration : 0};
    }

    if (typeof fade === 'number') {
      const duration = Math.max(fade, 0);
      return {shouldFade: duration > 0, duration};
    }

    if (typeof fade === 'string') {
      const normalized = normalizeString(fade);

      if (normalized === 'true') {
        return {shouldFade: true, duration: defaultDuration};
      }

      if (normalized === 'false') {
        return {shouldFade: false, duration: 0};
      }

      const parsed = parseFloat(normalized);
      if (!isNaN(parsed)) {
        const duration = Math.max(parsed, 0);
        return {shouldFade: duration > 0, duration};
      }
    }

    console.warn(`Invalid fade value: ${fade}. Using default: ${defaultValue}`);
    return {
      shouldFade: defaultValue,
      duration: defaultValue ? defaultDuration : 0
    };
  }

  detachAnimation(
      name: string = '', fade: boolean|number|string = true,
      modelIndex: number|null = null) {
    if (this.currentGLTF == null || name === this.element.animationName) {
      return;
    }
    const {animations} = this;
    if (animations == null || animations.length === 0) {
      return;
    }

    const animationClip = name ? this.animationsByName.get(name) : null;
    if (animationClip == null) {
      return;
    }

    const {shouldFade, duration} = this.parseFadeValue(fade, true, 1.5);

    try {
      const startIndex = modelIndex != null ? modelIndex : 0;
      const endIndex = modelIndex != null ? modelIndex + 1 : this.mixers.length;

      for (let i = startIndex; i < endIndex; i++) {
        const mixer = this.mixers[i];
        const action = mixer.existingAction(animationClip) ||
            mixer.clipAction(animationClip, this._models[i] || this);

        if (shouldFade) {
          action.fadeOut(duration);
        } else {
          action.stop();
        }
      }

      this.element[$scene].appendedAnimations =
          this.element[$scene].appendedAnimations.filter(i => i !== name);
    } catch (error) {
      console.error(error);
    }
  }

  updateAnimationLoop(
      name: string = '', loopMode: AnimationActionLoopStyles = LoopRepeat,
      repetitionCount: number = Infinity, modelIndex: number|null = null) {
    if (this.currentGLTF == null || name === this.element.animationName) {
      return;
    }
    const {animations} = this;
    if (animations == null || animations.length === 0) {
      return;
    }

    let animationClip = null;

    if (name) {
      animationClip = this.animationsByName.get(name);
    }

    if (animationClip == null) {
      return;
    }

    try {
      const startIndex = modelIndex != null ? modelIndex : 0;
      const endIndex = modelIndex != null ? modelIndex + 1 : this.mixers.length;

      for (let i = startIndex; i < endIndex; i++) {
        const mixer = this.mixers[i];
        const action = mixer.existingAction(animationClip) ||
            mixer.clipAction(animationClip, this._models[i] || this);
        action.stop();
        action.setLoop(loopMode, repetitionCount);
        action.play();
      }
    } catch (error) {
      console.error(error);
    }
  }

  stopAnimation() {
    this.currentAnimationActions.fill(null);
    for (const mixer of this.mixers) {
      mixer.stopAllAction();
    }
    this.mixerPausedStates.fill(true);
  }

  isAllAnimationsPaused(): boolean {
    return this.mixerPausedStates.every(paused => paused);
  }

  pauseAnimation(modelIndex: number|null = null) {
    const startIndex = modelIndex != null ? modelIndex : 0;
    const endIndex = modelIndex != null ? modelIndex + 1 : this.mixers.length;
    for (let i = startIndex; i < endIndex; i++) {
      this.mixerPausedStates[i] = true;
    }
  }

  unpauseAnimation(modelIndex: number|null = null) {
    const startIndex = modelIndex != null ? modelIndex : 0;
    const endIndex = modelIndex != null ? modelIndex + 1 : this.mixers.length;
    for (let i = startIndex; i < endIndex; i++) {
      this.mixerPausedStates[i] = false;
    }
  }

  updateAnimation(step: number) {
    for (let i = 0; i < this.mixers.length; i++) {
      if (!this.mixerPausedStates[i]) {
        this.mixers[i].update(step);
      }
    }
    this.queueShadowRender();
  }

  subscribeMixerEvent(
      event: keyof AnimationMixerEventMap, callback: (...args: any[]) => void) {
    for (const mixer of this.mixers) {
      mixer.addEventListener(event, callback);
    }
  }

  /**
   * Call if the object has been changed in such a way that the shadow's
   * shape has changed (not a rotation about the Y axis).
   */
  updateShadow() {
    const shadow = this.shadow;
    if (shadow != null) {
      const side = this.element.arPlacement === 'wall' ? 'back' : 'bottom';
      shadow.setScene(this, this.shadowSoftness, side);
      shadow.needsUpdate = true;
    }
  }

  renderShadow(renderer: WebGLRenderer) {
    this.updateBoundingBoxAndShadowIfDirty();
    const shadow = this.shadow;
    if (shadow != null && shadow.needsUpdate == true) {
      shadow.render(renderer, this);
      shadow.needsUpdate = false;
    }
  }

  private queueShadowRender() {
    if (this.shadow != null) {
      this.shadow.needsUpdate = true;
    }
  }

  /**
   * Sets the shadow's intensity, lazily creating the shadow as necessary.
   */
  setShadowIntensity(shadowIntensity: number) {
    this.shadowIntensity = shadowIntensity;
    if (this.currentGLTF == null) {
      return;
    }
    this.setBakedShadowVisibility();
    if (shadowIntensity <= 0 && this.shadow == null) {
      return;
    }

    if (this.shadow == null) {
      const side = this.element.arPlacement === 'wall' ? 'back' : 'bottom';
      this.shadow = new Shadow(this, this.shadowSoftness, side);
    }
    this.shadow.setIntensity(shadowIntensity);
  }

  /**
   * Sets the shadow's softness by mapping a [0, 1] softness parameter to
   * the shadow's resolution. This involves reallocation, so it should not
   * be changed frequently. Softer shadows are cheaper to render.
   */
  setShadowSoftness(softness: number) {
    this.shadowSoftness = softness;
    const shadow = this.shadow;
    if (shadow != null) {
      shadow.setSoftness(softness);
    }
  }

  /**
   * Shift the floor vertically from the bottom of the model's bounding box
   * by offset (should generally be negative).
   */
  setShadowOffset(offset: number) {
    const shadow = this.shadow;
    if (shadow != null) {
      shadow.setOffset(offset);
    }
  }

  getHit(object: Object3D = this) {
    const hits = raycaster.intersectObject(object, true);
    return hits.find((hit) => hit.object.visible && !hit.object.userData.noHit);
  }

  hitFromController(controller: XRTargetRaySpace, object: Object3D = this) {
    raycaster.setFromXRController(controller);
    return this.getHit(object);
  }

  hitFromPoint(ndcPosition: Vector2, object: Object3D = this) {
    raycaster.setFromCamera(ndcPosition, this.getCamera());
    return this.getHit(object);
  }

  getModelIndexFromHit(hit: Intersection): number {
    let current: Object3D|null = hit.object;
    while (current != null) {
      const idx = this.models.indexOf(current);
      if (idx !== -1)
        return idx;
      current = current.parent;
    }
    return 0;  // Default to primary model if not found
  }

  /**
   * This method returns the world position, model-space normal and texture
   * coordinate of the point on the mesh corresponding to the input pixel
   * coordinates given relative to the model-viewer element. If the mesh
   * is not hit, the result is null.
   */
  positionAndNormalFromPoint(ndcPosition: Vector2, object: Object3D = this): {
    position: Vector3,
    normal: Vector3,
    uv: Vector2|null,
    modelIndex?: number, worldToModel: Matrix4
  }|null {
    const hit = this.hitFromPoint(ndcPosition, object);
    if (hit == null) {
      return null;
    }

    const position = hit.point;
    const normal = hit.face != null ?
        hit.face.normal.clone().applyNormalMatrix(
            new Matrix3().getNormalMatrix(hit.object.matrixWorld)) :
        raycaster.ray.direction.clone().multiplyScalar(-1);
    const uv = hit.uv ?? null;
    const modelIndex = this.getModelIndexFromHit(hit);
    const targetModel = this.models[modelIndex] || this.target;
    const worldToModel = new Matrix4().copy(targetModel.matrixWorld).invert();

    return {position, normal, uv, modelIndex, worldToModel};
  }

  /**
   * This method returns a dynamic hotspot ID string of the point on the
   * mesh corresponding to the input pixel coordinates given relative to the
   * model-viewer element. The ID string can be used in the data-surface
   * attribute of the hotspot to make it follow this point on the surface
   * even as the model animates. If the mesh is not hit, the result is null.
   */
  surfaceFromPoint(ndcPosition: Vector2, object: Object3D = this): string|null {
    const hit = this.hitFromPoint(ndcPosition, object);
    if (hit == null || hit.face == null) {
      return null;
    }

    const modelIndex = this.getModelIndexFromHit(hit);
    const model = modelIndex === 0 ? this.element.model :
                                     this.element.extraModels?.[modelIndex - 1];

    if (model == null) {
      return null;
    }

    const node = model[$nodeFromPoint](hit);
    if (node == null)
      return null;
    const {meshes, primitives} = node.mesh.userData.associations;

    const va = new Vector3();
    const vb = new Vector3();
    const vc = new Vector3();
    const {a, b, c} = hit.face;
    const mesh = hit.object as any;
    mesh.getVertexPosition(a, va);
    mesh.getVertexPosition(b, vb);
    mesh.getVertexPosition(c, vc);
    const tri = new Triangle(va, vb, vc);
    const uvw = new Vector3();
    tri.getBarycoord(mesh.worldToLocal(hit.point), uvw);

    tri.getBarycoord(mesh.worldToLocal(hit.point), uvw);

    const baseSurface = `${meshes} ${primitives} ${a} ${b} ${c} ${
        uvw.x.toFixed(3)} ${uvw.y.toFixed(3)} ${uvw.z.toFixed(3)}`;

    return modelIndex === 0 ? baseSurface : `${modelIndex} ${baseSurface}`;
  }

  /**
   * The following methods are for operating on the set of Hotspot objects
   * attached to the scene. These come from DOM elements, provided to slots
   * by the Annotation Mixin.
  /**
   * Evaluates the intended `modelIndex` of the hotspot and safely reparents it
   * to the corresponding `Object3D` node mapped inside this scene's `_models`
  array.
   * This guarantees that declarative offset and layout transforms affect
  positional anchors.
   */
  updateHotspotAttachment(hotspot: Hotspot) {
    const targetNode = (hotspot.modelIndex != null && hotspot.modelIndex > 0 &&
                        this._models[hotspot.modelIndex]) ?
        this._models[hotspot.modelIndex] :
        this.target;

    if (hotspot.parent !== targetNode) {
      targetNode.add(hotspot);
      hotspot.updatePosition(
          hotspot.position.toArray().join(' ') +
          'm');  // Force bounds sync to fresh parent
      hotspot.updateMatrixWorld(true);
    }
  }

  addHotspot(hotspot: Hotspot) {
    this.updateHotspotAttachment(hotspot);
    // This happens automatically in render(), but we do it early so that
    // the slots appear in the shadow DOM and the elements get attached,
    // allowing us to dispatch events on them.
    this.annotationRenderer.domElement.appendChild(hotspot.element);
    this.updateSurfaceHotspot(hotspot);
  }

  removeHotspot(hotspot: Hotspot) {
    if (hotspot.parent) {
      hotspot.parent.remove(hotspot);
    }
  }

  /**
   * Helper method to apply a function to all hotspots.
   */
  forHotspots(func: (hotspot: Hotspot) => void) {
    const children = [...this.target.children];
    for (let i = 0, l = children.length; i < l; i++) {
      const hotspot = children[i];
      if (hotspot instanceof Hotspot) {
        func(hotspot);
      }
    }

    // Also traverse extra models to find any hotspots already reparented to
    // them
    for (const model of this._models) {
      if (model && model !== this.target) {
        const extraChildren = [...model.children];
        for (let i = 0, l = extraChildren.length; i < l; i++) {
          const hotspot = extraChildren[i];
          if (hotspot instanceof Hotspot) {
            func(hotspot);
          }
        }
      }
    }
  }

  /**
   * Lazy initializer for surface hotspots - will only run once.
   */
  updateSurfaceHotspot(hotspot: Hotspot) {
    if (hotspot.surface == null) {
      return;
    }
    const nodes = parseExpressions(hotspot.surface)[0].terms as NumberNode[];
    if (nodes.length !== 8 && nodes.length !== 9) {
      console.warn(
          hotspot.surface +
          ' does not have exactly 8 or 9 numbers. Did you use an outdated string?');
      return;
    }

    // Determine format: 8 numbers = legacy (index 0), 9 numbers = indexed
    const isLegacy = nodes.length === 8;
    const parsedModelIndex = isLegacy ? 0 : nodes[0].number;
    const offset = isLegacy ? 0 : 1;

    // DOM attribute (`data-model-index`) takes precedence over the parsed
    // surface index.
    const finalModelIndex = hotspot.modelIndex ?? parsedModelIndex;

    // Assign resolved modelIndex to the hotspot
    hotspot.modelIndex = finalModelIndex;

    // Ensure physical attachment matches the logical model index
    this.updateHotspotAttachment(hotspot);

    const model = finalModelIndex === 0 ?
        this.element.model :
        this.element.extraModels?.[finalModelIndex - 1];
    if (model == null) {
      return;
    }

    const primitiveNode = model[$nodeFromIndex](
        nodes[0 + offset].number, nodes[1 + offset].number);
    if (primitiveNode == null) {
      console.warn(
          hotspot.surface +
          ' does not match a node/primitive in this glTF! Skipping this hotspot.');
      return;
    }

    const numVert = primitiveNode.mesh.geometry.attributes.position.count;
    const tri = new Vector3(
        nodes[2 + offset].number,
        nodes[3 + offset].number,
        nodes[4 + offset].number);
    if (tri.x >= numVert || tri.y >= numVert || tri.z >= numVert) {
      console.warn(
          hotspot.surface +
          ' vertex indices out of range in this glTF! Skipping this hotspot.');
      return;
    }

    const bary = new Vector3(
        nodes[5 + offset].number,
        nodes[6 + offset].number,
        nodes[7 + offset].number);
    hotspot.mesh = primitiveNode.mesh;
    hotspot.tri = tri;
    hotspot.bary = bary;

    hotspot.updateSurface();
  }

  /**
   * Update positions of surface hotspots to follow model animation.
   */
  animateSurfaceHotspots() {
    if (this.element.paused) {
      return;
    }
    this.forHotspots((hotspot) => {
      hotspot.updateSurface();
    });
  }

  /**
   * Update the CSS visibility of the hotspots based on whether their
   * normals point toward the camera.
   */
  updateHotspotsVisibility(viewerPosition: Vector3) {
    this.forHotspots((hotspot) => {
      view.copy(viewerPosition);
      target.setFromMatrixPosition(hotspot.matrixWorld);
      view.sub(target);
      normalWorld.copy(hotspot.normal)
          .transformDirection(this.target.matrixWorld);
      if (view.dot(normalWorld) < 0) {
        hotspot.hide();
      } else {
        hotspot.show();
      }
    });
  }

  /**
   * Rotate all hotspots to an absolute orientation given by the input
   * number of radians. Zero returns them to upright.
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

  updateSchema(src: string|null) {
    const {schemaElement, element} = this;
    const {alt, poster, iosSrc} = element;
    if (src != null) {
      const encoding = [{
        '@type': 'MediaObject',
        contentUrl: src,
        encodingFormat: src.split('.').pop()?.toLowerCase() === 'gltf' ?
            'model/gltf+json' :
            'model/gltf-binary'
      }];

      if (iosSrc) {
        encoding.push({
          '@type': 'MediaObject',
          contentUrl: iosSrc,
          encodingFormat: 'model/vnd.usdz+zip'
        });
      }

      const structuredData = {
        '@context': 'http://schema.org/',
        '@type': '3DModel',
        image: poster ?? undefined,
        name: alt ?? undefined,
        encoding
      };

      schemaElement.textContent = JSON.stringify(structuredData);
      document.head.appendChild(schemaElement);
    } else if (schemaElement.parentElement != null) {
      schemaElement.parentElement.removeChild(schemaElement);
    }
  }
}