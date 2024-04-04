/* @license
 * Copyright 2022 Google LLC. All Rights Reserved.
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

import {BackSide, Box3, Material, Mesh, MeshBasicMaterial, MeshDepthMaterial, Object3D, OrthographicCamera, PlaneGeometry, RenderTargetOptions, RGBAFormat, Scene, ShaderMaterial, Vector3, WebGLRenderer, WebGLRenderTarget} from 'three';
import {HorizontalBlurShader} from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import {VerticalBlurShader} from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import {lerp} from 'three/src/math/MathUtils.js';

import {ModelScene} from './ModelScene.js';

export type Side = 'back'|'bottom';

// The softness [0, 1] of the shadow is mapped to a resolution between
// 2^LOG_MAX_RESOLUTION and 2^LOG_MIN_RESOLUTION.
const LOG_MAX_RESOLUTION = 9;
const LOG_MIN_RESOLUTION = 6;
// Animated models are not in general contained in their bounding box, as this
// is calculated only for their resting pose. We create a cubic shadow volume
// for animated models sized to their largest bounding box dimension multiplied
// by this scale factor.
const ANIMATION_SCALING = 2;
// Since hard shadows are not lightened by blurring and depth, set a lower
// default intensity to make them more perceptually similar to the intensity of
// the soft shadows.
const DEFAULT_HARD_INTENSITY = 0.3;

/**
 * The Shadow class creates a shadow that fits a given scene and follows a
 * target. This shadow will follow the scene without any updates needed so long
 * as the shadow and scene are both parented to the same object (call it the
 * scene) and this scene is passed as the target parameter to the shadow's
 * constructor. We also must constrain the scene to motion within the horizontal
 * plane and call the setRotation() method whenever the scene's Y-axis rotation
 * changes. For motion outside of the horizontal plane, this.needsUpdate must be
 * set to true.
 *
 * The softness of the shadow is controlled by changing its resolution, making
 * softer shadows faster, but less precise.
 */
export class Shadow extends Object3D {
  private camera = new OrthographicCamera();
  // private cameraHelper = new CameraHelper(this.camera);
  private renderTarget: WebGLRenderTarget|null = null;
  private renderTargetBlur: WebGLRenderTarget|null = null;
  private depthMaterial = new MeshDepthMaterial();
  private horizontalBlurMaterial = new ShaderMaterial(HorizontalBlurShader);
  private verticalBlurMaterial = new ShaderMaterial(VerticalBlurShader);
  private intensity = 0;
  private softness = 1;
  private floor: Mesh;
  private blurPlane: Mesh;
  private boundingBox = new Box3;
  private size = new Vector3;
  private maxDimension = 0;
  private isAnimated = false;
  public needsUpdate = false;

  constructor(scene: ModelScene, softness: number, side: Side) {
    super();

    const {camera} = this;
    camera.rotation.x = Math.PI / 2;
    camera.left = -0.5;
    camera.right = 0.5;
    camera.bottom = -0.5;
    camera.top = 0.5;
    this.add(camera);

    // this.add(this.cameraHelper);
    // this.cameraHelper.updateMatrixWorld = function() {
    //   this.matrixWorld = this.camera.matrixWorld;
    // };

    const plane = new PlaneGeometry();
    const shadowMaterial = new MeshBasicMaterial({
      // color: new Color(1, 0, 0),
      opacity: 1,
      transparent: true,
      side: BackSide,
    });
    this.floor = new Mesh(plane, shadowMaterial);
    this.floor.userData.noHit = true;
    camera.add(this.floor);

    // the plane onto which to blur the texture
    this.blurPlane = new Mesh(plane);
    this.blurPlane.visible = false;
    camera.add(this.blurPlane);

    scene.target.add(this);

    // like MeshDepthMaterial, but goes from black to transparent
    this.depthMaterial.onBeforeCompile = function(shader) {
      shader.fragmentShader = shader.fragmentShader.replace(
          'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
          'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * opacity );');
    };

    this.horizontalBlurMaterial.depthTest = false;
    this.verticalBlurMaterial.depthTest = false;

    this.setScene(scene, softness, side);
  }

  /**
   * Update the shadow's size and position for a new scene. Softness is also
   * needed, as this controls the shadow's resolution.
   */
  setScene(scene: ModelScene, softness: number, side: Side) {
    const {boundingBox, size, rotation, position} = this;

    this.isAnimated = scene.animationNames.length > 0;
    this.boundingBox.copy(scene.boundingBox);
    this.size.copy(scene.size);
    this.maxDimension = Math.max(size.x, size.y, size.z) *
        (this.isAnimated ? ANIMATION_SCALING : 1);

    this.boundingBox.getCenter(position);

    if (side === 'back') {
      const {min, max} = boundingBox;
      [min.y, min.z] = [min.z, min.y];
      [max.y, max.z] = [max.z, max.y];
      [size.y, size.z] = [size.z, size.y];
      rotation.x = Math.PI / 2;
      rotation.y = Math.PI;
    } else {
      rotation.x = 0;
      rotation.y = 0;
    }

    if (this.isAnimated) {
      const minY = boundingBox.min.y;
      const maxY = boundingBox.max.y;
      size.y = this.maxDimension;
      boundingBox.expandByVector(
          size.subScalar(this.maxDimension).multiplyScalar(-0.5));
      boundingBox.min.y = minY;
      boundingBox.max.y = maxY;
      size.set(this.maxDimension, maxY - minY, this.maxDimension);
    }

    if (side === 'bottom') {
      position.y = boundingBox.min.y;
    } else {
      position.z = boundingBox.min.y;
    }

    this.setSoftness(softness);
  }

  /**
   * Update the shadow's resolution based on softness (between 0 and 1). Should
   * not be called frequently, as this results in reallocation.
   */
  setSoftness(softness: number) {
    this.softness = softness;
    const {size, camera} = this;
    const scaleY = (this.isAnimated ? ANIMATION_SCALING : 1);

    const resolution = scaleY *
        Math.pow(
            2,
            LOG_MAX_RESOLUTION -
                softness * (LOG_MAX_RESOLUTION - LOG_MIN_RESOLUTION));
    this.setMapSize(resolution);

    const softFar = size.y / 2;
    const hardFar = size.y * scaleY;

    camera.near = 0;
    camera.far = lerp(hardFar, softFar, softness);
    // we have co-opted opacity to scale the depth to clip
    this.depthMaterial.opacity = 1.0 / softness;
    camera.updateProjectionMatrix();
    // this.cameraHelper.update();

    this.setIntensity(this.intensity);
    this.setOffset(0);
  }

  /**
   * Lower-level version of the above function.
   */
  setMapSize(maxMapSize: number) {
    const {size} = this;

    if (this.isAnimated) {
      maxMapSize *= ANIMATION_SCALING;
    }

    const baseWidth =
        Math.floor(size.x > size.z ? maxMapSize : maxMapSize * size.x / size.z);
    const baseHeight =
        Math.floor(size.x > size.z ? maxMapSize * size.z / size.x : maxMapSize);
    // width of blur filter in pixels (not adjustable)
    const TAP_WIDTH = 10;
    const width = TAP_WIDTH + baseWidth;
    const height = TAP_WIDTH + baseHeight;

    if (this.renderTarget != null &&
        (this.renderTarget.width !== width ||
         this.renderTarget.height !== height)) {
      this.renderTarget.dispose();
      this.renderTarget = null;
      this.renderTargetBlur!.dispose();
      this.renderTargetBlur = null;
    }

    if (this.renderTarget == null) {
      const params: RenderTargetOptions = {format: RGBAFormat};
      this.renderTarget = new WebGLRenderTarget(width, height, params);
      this.renderTargetBlur = new WebGLRenderTarget(width, height, params);

      (this.floor.material as MeshBasicMaterial).map =
          this.renderTarget.texture;
    }

    // These pads account for the softening radius around the shadow.
    this.camera.scale.set(
        size.x * (1 + TAP_WIDTH / baseWidth),
        size.z * (1 + TAP_WIDTH / baseHeight),
        1);
    this.needsUpdate = true;
  }

  /**
   * Set the shadow's intensity (0 to 1), which is just its opacity. Turns off
   * shadow rendering if zero.
   */
  setIntensity(intensity: number) {
    this.intensity = intensity;
    if (intensity > 0) {
      this.visible = true;
      this.floor.visible = true;
      (this.floor.material as MeshBasicMaterial).opacity = intensity *
          lerp(DEFAULT_HARD_INTENSITY, 1, this.softness * this.softness);
    } else {
      this.visible = false;
      this.floor.visible = false;
    }
  }

  getIntensity(): number {
    return this.intensity;
  }

  /**
   * An offset can be specified to move the
   * shadow vertically relative to the bottom of the scene. Positive is up, so
   * values are generally negative. A small offset keeps our shadow from
   * z-fighting with any baked-in shadow plane.
   */
  setOffset(offset: number) {
    this.floor.position.z = -offset + this.gap();
  }

  gap() {
    return 0.001 * this.maxDimension;
  }

  render(renderer: WebGLRenderer, scene: Scene) {
    // this.cameraHelper.visible = false;

    // force the depthMaterial to everything
    scene.overrideMaterial = this.depthMaterial;

    // set renderer clear alpha
    const initialClearAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    this.floor.visible = false;

    // disable XR for offscreen rendering
    const xrEnabled = renderer.xr.enabled;
    renderer.xr.enabled = false;

    // render to the render target to get the depths
    const oldRenderTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, this.camera);

    // and reset the override material
    scene.overrideMaterial = null;
    this.floor.visible = true;

    this.blurShadow(renderer);

    // reset and render the normal scene
    renderer.xr.enabled = xrEnabled;
    renderer.setRenderTarget(oldRenderTarget);
    renderer.setClearAlpha(initialClearAlpha);
    // this.cameraHelper.visible = true;
  }

  blurShadow(renderer: WebGLRenderer) {
    const {
      camera,
      horizontalBlurMaterial,
      verticalBlurMaterial,
      renderTarget,
      renderTargetBlur,
      blurPlane
    } = this;
    blurPlane.visible = true;

    // blur horizontally and draw in the renderTargetBlur
    blurPlane.material = horizontalBlurMaterial;
    horizontalBlurMaterial.uniforms.h.value = 1 / this.renderTarget!.width;
    horizontalBlurMaterial.uniforms.tDiffuse.value = this.renderTarget!.texture;

    renderer.setRenderTarget(renderTargetBlur);
    renderer.render(blurPlane, camera);

    // blur vertically and draw in the main renderTarget
    blurPlane.material = verticalBlurMaterial;
    verticalBlurMaterial.uniforms.v.value = 1 / this.renderTarget!.height;
    verticalBlurMaterial.uniforms.tDiffuse.value =
        this.renderTargetBlur!.texture;

    renderer.setRenderTarget(renderTarget);
    renderer.render(blurPlane, camera);

    blurPlane.visible = false;
  }

  dispose() {
    if (this.renderTarget != null) {
      this.renderTarget.dispose();
    }
    if (this.renderTargetBlur != null) {
      this.renderTargetBlur.dispose();
    }
    this.depthMaterial.dispose();
    this.horizontalBlurMaterial.dispose();
    this.verticalBlurMaterial.dispose();
    (this.floor.material as Material).dispose();
    this.floor.geometry.dispose();
    this.blurPlane.geometry.dispose();
    this.removeFromParent();
  }
}