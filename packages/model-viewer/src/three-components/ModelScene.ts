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

import {ACESFilmicToneMapping, AnimationAction, AnimationActionLoopStyles, AnimationClip, AnimationMixer, Box3, Camera, Euler, Event as ThreeEvent, LoopPingPong, LoopRepeat, Material, Matrix3, Mesh, Object3D, PerspectiveCamera, Raycaster, Scene, Sphere, Texture, ToneMapping, Triangle, Vector2, Vector3, WebGLRenderer, XRTargetRaySpace} from 'three';
import {CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {reduceVertices} from 'three/examples/jsm/utils/SceneUtils.js';

import {$currentGLTF, $model, $originalGltfJson} from '../features/scene-graph.js';
import {$nodeFromIndex, $nodeFromPoint} from '../features/scene-graph/model.js';
import ModelViewerElementBase, {$renderer, EffectComposerInterface, RendererInterface} from '../model-viewer-base.js';
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
  public element: ModelViewerElement;
  public canvas: HTMLCanvasElement;
  public annotationRenderer = new CSS2DRenderer();
  public effectRenderer: EffectComposerInterface|null = null;
  public schemaElement = document.createElement('script');
  public width = 1;
  public height = 1;
  public aspect = 1;
  public scaleStep = 0;
  public renderCount = 0;
  public externalRenderer: RendererInterface|null = null;

  // These default camera values are never used, as they are reset once the
  // model is loaded and framing is computed.
  public camera = new PerspectiveCamera(45, 1, 0.1, 100);
  public xrCamera: Camera|null = null;

  public url: string|null = null;
  public pivot = new Object3D();
  public target = new Object3D();
  public animationNames: Array<string> = [];
  public boundingBox = new Box3();
  public boundingSphere = new Sphere();
  public size = new Vector3();
  public idealAspect = 0;
  public framedFoVDeg = 0;

  public shadow: Shadow|null = null;
  public shadowIntensity = 0;
  public shadowSoftness = 1;
  public bakedShadows = new Set<Mesh>();

  public exposure = 1;
  public toneMapping: ToneMapping = ACESFilmicToneMapping;
  public canScale = true;

  private isDirty = false;

  private goalTarget = new Vector3();
  private targetDamperX = new Damper();
  private targetDamperY = new Damper();
  private targetDamperZ = new Damper();

  private _currentGLTF: ModelViewerGLTFInstance|null = null;
  private _model: Object3D|null = null;
  private mixer: AnimationMixer;
  private cancelPendingSourceChange: (() => void)|null = null;
  private animationsByName: Map<string, AnimationClip> = new Map();
  private currentAnimationAction: AnimationAction|null = null;

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

    this.add(this.pivot);
    this.pivot.name = 'Pivot';

    this.pivot.add(this.target);

    this.setSize(width, height);

    this.target.name = 'Target';

    this.mixer = new AnimationMixer(this.target);

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
    this._model = model;
    this.target.add(model);
    await this.setupScene();
  }

  /**
   * Sets the model via URL.
   */

  async setSource(
      url: string|null,
      progressCallback: (progress: number) => void = () => {}) {
    if (!url || url === this.url) {
      progressCallback(1);
      return;
    }
    this.reset();
    this.url = url;

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

    let gltf: ModelViewerGLTFInstance;

    try {
      gltf = await new Promise<ModelViewerGLTFInstance>(
          async (resolve, reject) => {
            this.cancelPendingSourceChange = () => reject();
            try {
              const result = await this.element[$renderer].loader.load(
                  url, this.element, progressCallback);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
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
    this._currentGLTF = gltf;

    if (gltf != null) {
      this._model = gltf.scene;
      this.target.add(gltf.scene);
    }

    const {animations} = gltf!;
    const animationsByName = new Map();
    const animationNames = [];

    for (const animation of animations) {
      animationsByName.set(animation.name, animation);
      animationNames.push(animation.name);
    }

    this.animations = animations;
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

  reset() {
    this.url = null;
    this.renderCount = 0;
    this.queueRender();
    if (this.shadow != null) {
      this.shadow.setIntensity(0);
    }
    this.bakedShadows.clear();

    const {_model} = this;
    if (_model != null) {
      _model.removeFromParent();
      this._model = null;
    }

    const gltf = this._currentGLTF;
    if (gltf != null) {
      gltf.dispose();
      this._currentGLTF = null;
    }

    if (this.currentAnimationAction != null) {
      this.currentAnimationAction.stop();
      this.currentAnimationAction = null;
    }

    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this);
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
    return this._currentGLTF;
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
    const {model} = this;
    if (model == null) {
      return;
    }
    const orientation = parseExpressions(this.element.orientation)[0]
                            .terms as [NumberNode, NumberNode, NumberNode];

    const roll = normalizeUnit(orientation[0]).number;
    const pitch = normalizeUnit(orientation[1]).number;
    const yaw = normalizeUnit(orientation[2]).number;

    model.quaternion.setFromEuler(new Euler(pitch, yaw, roll, 'YXZ'));

    const scale = parseExpressions(this.element.scale)[0]
                      .terms as [NumberNode, NumberNode, NumberNode];

    model.scale.set(scale[0].number, scale[1].number, scale[2].number);
  }

  updateBoundingBox() {
    const {model} = this;
    if (model == null) {
      return;
    }
    this.target.remove(model);

    this.findBakedShadows(model);

    const bound = (box: Box3, vertex: Vector3): Box3 => {
      return box.expandByPoint(vertex);
    };
    this.setBakedShadowVisibility(false);
    this.boundingBox = reduceVertices(model, bound, new Box3());
    // If there's nothing but the baked shadow, then it's not a baked shadow.
    if (this.boundingBox.isEmpty()) {
      this.setBakedShadowVisibility(true);
      this.bakedShadows.forEach((mesh) => this.unmarkBakedShadow(mesh));
      this.boundingBox = reduceVertices(model, bound, new Box3());
    }
    this.checkBakedShadows();
    this.setBakedShadowVisibility();

    this.boundingBox.getSize(this.size);

    this.target.add(model);
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
    const {model} = this;
    if (model == null) {
      return;
    }
    this.target.remove(model);
    this.setBakedShadowVisibility(false);
    const {center} = this.boundingSphere;

    this.element.requestUpdate('cameraTarget');
    await this.element.updateComplete;
    center.copy(this.getTarget());

    const radiusSquared = (value: number, vertex: Vector3): number => {
      return Math.max(value, center!.distanceToSquared(vertex));
    };
    this.boundingSphere.radius =
        Math.sqrt(reduceVertices(model, radiusSquared, 0));

    const horizontalTanFov = (value: number, vertex: Vector3): number => {
      vertex.sub(center!);
      const radiusXZ = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      return Math.max(
          value, radiusXZ / (this.idealCameraDistance() - Math.abs(vertex.y)));
    };
    this.idealAspect = reduceVertices(model, horizontalTanFov, 0) /
        Math.tan((this.framedFoVDeg / 2) * Math.PI / 180);

    this.setBakedShadowVisibility();
    this.target.add(model);
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
    return this._model;
  }

  /**
   * Yaw is the scene's orientation about the y-axis, around the rotation
   * center.
   */
  set yaw(radiansY: number) {
    this.pivot.rotation.y = radiansY;
    this.groundedSkybox.rotation.y = -radiansY;
    this.queueRender();
  }

  get yaw(): number {
    return this.pivot.rotation.y;
  }

  set animationTime(value: number) {
    this.mixer.setTime(value);
    this.queueShadowRender();
  }

  get animationTime(): number {
    if (this.currentAnimationAction != null) {
      const loopCount =
          Math.max((this.currentAnimationAction as any)._loopCount, 0);
      if (this.currentAnimationAction.loop === LoopPingPong &&
          (loopCount & 1) === 1) {
        return this.duration - this.currentAnimationAction.time
      } else {
        return this.currentAnimationAction.time;
      }
    }

    return 0;
  }

  set animationTimeScale(value: number) {
    this.mixer.timeScale = value;
  }

  get animationTimeScale(): number {
    return this.mixer.timeScale;
  }

  get duration(): number {
    if (this.currentAnimationAction != null &&
        this.currentAnimationAction.getClip()) {
      return this.currentAnimationAction.getClip().duration;
    }

    return 0;
  }

  get hasActiveAnimation(): boolean {
    return this.currentAnimationAction != null;
  }

  /**
   * Plays an animation if there are any associated with the current model.
   * Accepts an optional string name of an animation to play. If no name is
   * provided, or if no animation is found by the given name, always falls back
   * to playing the first animation.
   */
  playAnimation(
      name: string|null = null, crossfadeTime: number = 0,
      loopMode: AnimationActionLoopStyles = LoopRepeat,
      repetitionCount: number = Infinity) {
    if (this._currentGLTF == null) {
      return;
    }
    const {animations} = this;
    if (animations == null || animations.length === 0) {
      return;
    }

    let animationClip = null;

    if (name != null) {
      animationClip = this.animationsByName.get(name);

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
      const {currentAnimationAction: lastAnimationAction} = this;

      const action = this.mixer.clipAction(animationClip, this);
      this.currentAnimationAction = action;

      if (this.element.paused) {
        this.mixer.stopAllAction();
      } else {
        action.paused = false;
        if (lastAnimationAction != null && action !== lastAnimationAction) {
          action.crossFadeFrom(lastAnimationAction, crossfadeTime, false);
        } else if (
            this.animationTimeScale > 0 &&
            this.animationTime == this.duration) {
          // This is a workaround for what I believe is a three.js bug.
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

  stopAnimation() {
    this.currentAnimationAction = null;
    this.mixer.stopAllAction();
  }

  updateAnimation(step: number) {
    this.mixer.update(step);
    this.queueShadowRender();
  }

  subscribeMixerEvent(event: string, callback: (...args: any[]) => void) {
    this.mixer.addEventListener(event, callback);
  }

  /**
   * Call if the object has been changed in such a way that the shadow's shape
   * has changed (not a rotation about the Y axis).
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
    if (this._currentGLTF == null) {
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
   * Sets the shadow's softness by mapping a [0, 1] softness parameter to the
   * shadow's resolution. This involves reallocation, so it should not be
   * changed frequently. Softer shadows are cheaper to render.
   */
  setShadowSoftness(softness: number) {
    this.shadowSoftness = softness;
    const shadow = this.shadow;
    if (shadow != null) {
      shadow.setSoftness(softness);
    }
  }

  /**
   * Shift the floor vertically from the bottom of the model's bounding box by
   * offset (should generally be negative).
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

  /**
   * This method returns the world position, model-space normal and texture
   * coordinate of the point on the mesh corresponding to the input pixel
   * coordinates given relative to the model-viewer element. If the mesh
   * is not hit, the result is null.
   */
  positionAndNormalFromPoint(ndcPosition: Vector2, object: Object3D = this):
      {position: Vector3, normal: Vector3, uv: Vector2|null}|null {
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

    return {position, normal, uv};
  }

  /**
   * This method returns a dynamic hotspot ID string of the point on the mesh
   * corresponding to the input pixel coordinates given relative to the
   * model-viewer element. The ID string can be used in the data-surface
   * attribute of the hotspot to make it follow this point on the surface even
   * as the model animates. If the mesh is not hit, the result is null.
   */
  surfaceFromPoint(ndcPosition: Vector2, object: Object3D = this): string|null {
    const model = this.element.model;
    if (model == null) {
      return null;
    }

    const hit = this.hitFromPoint(ndcPosition, object);
    if (hit == null || hit.face == null) {
      return null;
    }

    const node = model[$nodeFromPoint](hit);
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

    return `${meshes} ${primitives} ${a} ${b} ${c} ${uvw.x.toFixed(3)} ${
        uvw.y.toFixed(3)} ${uvw.z.toFixed(3)}`;
  }

  /**
   * The following methods are for operating on the set of Hotspot objects
   * attached to the scene. These come from DOM elements, provided to slots by
   * the Annotation Mixin.
   */
  addHotspot(hotspot: Hotspot) {
    this.target.add(hotspot);
    // This happens automatically in render(), but we do it early so that
    // the slots appear in the shadow DOM and the elements get attached,
    // allowing us to dispatch events on them.
    this.annotationRenderer.domElement.appendChild(hotspot.element);
    this.updateSurfaceHotspot(hotspot);
  }

  removeHotspot(hotspot: Hotspot) {
    this.target.remove(hotspot);
  }

  /**
   * Helper method to apply a function to all hotspots.
   */
  forHotspots(func: (hotspot: Hotspot) => void) {
    const {children} = this.target;
    for (let i = 0, l = children.length; i < l; i++) {
      const hotspot = children[i];
      if (hotspot instanceof Hotspot) {
        func(hotspot);
      }
    }
  }

  /**
   * Lazy initializer for surface hotspots - will only run once.
   */
  updateSurfaceHotspot(hotspot: Hotspot) {
    if (hotspot.surface == null || this.element.model == null) {
      return;
    }
    const nodes = parseExpressions(hotspot.surface)[0].terms as NumberNode[];
    if (nodes.length != 8) {
      console.warn(hotspot.surface + ' does not have exactly 8 numbers.');
      return;
    }
    const primitiveNode =
        this.element.model[$nodeFromIndex](nodes[0].number, nodes[1].number);
    if (primitiveNode == null) {
      console.warn(
          hotspot.surface +
          ' does not match a node/primitive in this glTF! Skipping this hotspot.');
      return;
    }

    const numVert = primitiveNode.mesh.geometry.attributes.position.count;
    const tri = new Vector3(nodes[2].number, nodes[3].number, nodes[4].number);
    if (tri.x >= numVert || tri.y >= numVert || tri.z >= numVert) {
      console.warn(
          hotspot.surface +
          ' vertex indices out of range in this glTF! Skipping this hotspot.');
      return;
    }

    const bary = new Vector3(nodes[5].number, nodes[6].number, nodes[7].number);
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
   * Update the CSS visibility of the hotspots based on whether their normals
   * point toward the camera.
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
