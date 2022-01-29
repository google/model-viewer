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

import {BackSide, Box3, CameraHelper, Mesh, MeshBasicMaterial, MeshDepthMaterial, Object3D, OrthographicCamera, PlaneBufferGeometry, RGBAFormat, Scene, ShaderMaterial, Vector3, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetOptions} from 'three';
import {HorizontalBlurShader} from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import {VerticalBlurShader} from 'three/examples/jsm/shaders/VerticalBlurShader.js';

import {ModelScene} from './ModelScene';

export type Side = 'back'|'bottom';

// Nothing within Offset of the bottom of the scene casts a shadow
// (this is to avoid having a baked-in shadow plane cast its own shadow).
const OFFSET = 0.002;
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
  public camera = new OrthographicCamera();
  public cameraHelper = new CameraHelper(this.camera);
  private renderTarget: WebGLRenderTarget|null = null;
  private renderTargetBlur: WebGLRenderTarget|null = null;
  private depthMaterial = new MeshDepthMaterial();
  private horizontalBlurMaterial = new ShaderMaterial(HorizontalBlurShader);
  private verticalBlurMaterial = new ShaderMaterial(VerticalBlurShader);
  private intensity = 0;
  private floor: Mesh;
  private blurPlane: Mesh;
  private boundingBox = new Box3;
  private size = new Vector3;
  private isAnimated = false;
  private side: Side = 'bottom';
  public needsUpdate = false;

  constructor(scene: ModelScene, softness: number, side: Side) {
    super();

    const {camera} = this;
    camera.rotateX(Math.PI / 2);
    camera.left = -0.5;
    camera.right = 0.5;
    camera.bottom = -0.5;
    camera.top = 0.5;
    this.add(camera);

    this.add(this.cameraHelper);
    this.cameraHelper.updateMatrixWorld = function() {
      this.matrixWorld = this.camera.matrixWorld;
    };

    const plane = new PlaneBufferGeometry();
    const shadowMaterial = new MeshBasicMaterial({
      opacity: 1,
      transparent: true,
      side: BackSide,
    });
    this.floor = new Mesh(plane, shadowMaterial);
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
    this.side = side;
    this.isAnimated = scene.animationNames.length > 0;
    this.boundingBox.copy(scene.boundingBox);
    this.size.copy(scene.size);
    if (this.side === 'back') {
      const {min, max} = this.boundingBox;
      [min.y, min.z] = [min.z, min.y];
      [max.y, max.z] = [max.z, max.y];
      [this.size.y, this.size.z] = [this.size.z, this.size.y];
      this.rotation.x = Math.PI / 2;
      this.rotation.y = Math.PI;
    } else {
      this.rotation.x = 0;
      this.rotation.y = 0;
    }
    const {boundingBox, size} = this;

    if (this.isAnimated) {
      const minY = boundingBox.min.y;
      const maxY = boundingBox.max.y;
      const maxDimension = Math.max(size.x, size.y, size.z) * ANIMATION_SCALING;
      size.y = maxDimension;
      boundingBox.expandByVector(
          size.subScalar(maxDimension).multiplyScalar(-0.5));
      boundingBox.min.y = minY;
      boundingBox.max.y = maxY;
      size.set(maxDimension, maxY - minY, maxDimension);
    }

    boundingBox.getCenter(this.position);
    const shadowOffset = boundingBox.min.y + size.y * OFFSET;
    if (side === 'bottom') {
      this.position.y = shadowOffset;
    } else {
      this.position.z = shadowOffset;
    }

    this.setSoftness(softness);
  }

  /**
   * Update the shadow's resolution based on softness (between 0 and 1). Should
   * not be called frequently, as this results in reallocation.
   */
  setSoftness(softness: number) {
    const resolution = (this.isAnimated ? ANIMATION_SCALING : 1) *
        Math.pow(
            2,
            LOG_MAX_RESOLUTION -
                softness * (LOG_MAX_RESOLUTION - LOG_MIN_RESOLUTION));
    this.setMapSize(resolution);
  }

  /**
   * Lower-level version of the above function.
   */
  setMapSize(maxMapSize: number) {
    const {size, camera} = this;

    if (this.isAnimated) {
      maxMapSize *= ANIMATION_SCALING;
    }

    const width =
        Math.floor(size.x > size.z ? maxMapSize : maxMapSize * size.x / size.z);
    const height =
        Math.floor(size.x > size.z ? maxMapSize * size.z / size.x : maxMapSize);

    if (this.renderTarget != null &&
        (this.renderTarget.width !== width ||
         this.renderTarget.height !== height)) {
      this.renderTarget.dispose();
      this.renderTarget = null;
      this.renderTargetBlur!.dispose();
      this.renderTargetBlur = null;
    }

    if (this.renderTarget == null) {
      const params: WebGLRenderTargetOptions = {format: RGBAFormat};
      this.renderTarget = new WebGLRenderTarget(width, height, params);
      this.renderTargetBlur = new WebGLRenderTarget(width, height, params);

      (this.floor.material as MeshBasicMaterial).map =
          this.renderTarget.texture;
    }
    // These pads account for the softening radius around the shadow.
    const widthPad = 2.5 * size.x / width;
    const heightPad = 2.5 * size.z / height;

    camera.near = 0;
    camera.far = size.y / 2;
    camera.updateProjectionMatrix();
    this.cameraHelper.update();

    this.setOffset(0);

    this.camera.scale.set(size.x + 2 * widthPad, size.z + 2 * heightPad, 1);
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
      (this.floor.material as MeshBasicMaterial).opacity = intensity;
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
   * values are generally negative.
   */
  setOffset(offset: number) {
    this.floor.position.z = -offset;
  }

  render(renderer: WebGLRenderer, scene: Scene) {
    // force the depthMaterial to everything
    this.cameraHelper.visible = false;
    scene.overrideMaterial = this.depthMaterial;

    // set renderer clear alpha
    const initialClearAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    this.floor.visible = false;

    // render to the render target to get the depths
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, this.camera);

    // and reset the override material
    scene.overrideMaterial = null;
    this.cameraHelper.visible = true;
    this.floor.visible = true;

    this.blurShadow(renderer);

    // reset and render the normal scene
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(initialClearAlpha);
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
}