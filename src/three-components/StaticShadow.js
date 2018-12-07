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

import {Color, Mesh, MeshBasicMaterial, MultiplyBlending, OrthographicCamera, PlaneGeometry, RGBAFormat, ShaderMaterial, UniformsUtils, Vector3, WebGLRenderTarget} from 'three';

const $camera = Symbol('camera');
const $renderTarget = Symbol('renderTarget');
const $preservedRenderTarget = Symbol('preservedRenderTarget');

const scale = new Vector3();

const DEFAULT_CONFIG = {
  near: 0.01,
  far: 100,
  textureWidth: 512,
  textureHeight: 512,
};

const shadowGeneratorMaterial = new MeshBasicMaterial({
  color: 0x000000,
});

const shadowTextureMaterial = new MeshBasicMaterial({
  transparent: true,
  opacity: 0.1,
});

/**
 * Creates a mesh that can receive and render pseudo-shadows
 * only updated when calling its render method. This is different
 * from non-auto-updating shadows because the resulting material
 * applied to the mesh is disconnected from the renderer's shadow map
 * and can be freely rotated and positioned like a regular texture.
 */
export default class StaticShadow extends Mesh {
  /**
   * Create a shadow mesh.
   */
  constructor() {
    const geometry = new PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);

    super(geometry, shadowTextureMaterial.clone());
    this.name = 'StaticShadow';

    this[$renderTarget] = new WebGLRenderTarget(
        DEFAULT_CONFIG.textureWidth, DEFAULT_CONFIG.textureHeight, {
          format: RGBAFormat,
        });
    this.material.map = this[$renderTarget].texture;
    this.material.needsUpdate = true;

    this[$camera] = new OrthographicCamera();
  }

  /**
   * In WebXR AR, the default framebuffer used by three is one provided by
   * the WebXR Device API -- `renderer.setFramebuffer()` handles that
   * for three's shadows, but for our own render targets, we have to
   * manually handle.
   *
   * @see https://github.com/mrdoob/three.js/pull/14132
   */
  onBeforeRender(renderer) {
    this[$preservedRenderTarget] = renderer.getRenderTarget();
    renderer.setRenderTarget(this[$renderTarget]);
  }

  onAfterRender(renderer) {
    if (this[$preservedRenderTarget]) {
      renderer.setRenderTarget(this[$preservedRenderTarget]);
    }
  }

  /**
   * Updates the generated static shadow. The size of the camera is dependent
   * on the current scale of the StaticShadow that will host the texture.
   * It's expected for the StaticShadow to be facing the light source.
   *
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.DirectionalLight} light
   * @param {Object} config
   * @param {number} config.near
   * @param {number} config.far
   * @param {number} config.textureWidth
   * @param {number} config.textureHeight
   */
  render(renderer, scene, light, config = {}) {
    const userSceneOverrideMaterial = scene.overrideMaterial;
    const userClearAlpha = renderer.getClearAlpha();
    const userRenderTarget = renderer.getRenderTarget();
    const shadowParent = this.parent;

    config = Object.assign({}, config, DEFAULT_CONFIG);

    renderer.setClearAlpha(0);
    scene.overrideMaterial = shadowGeneratorMaterial;

    // Update render target size if necessary
    if (this[$renderTarget].width !== config.textureWidth ||
        this[$renderTarget].height !== config.textureHeight) {
      this[$renderTarget].setSize(config.textureWidth, config.textureHeight);
    }

    // Set the camera to where the light source is,
    // and facing its target.
    light.updateMatrixWorld(true);
    light.target.updateMatrixWorld(true);

    this[$camera].position.setFromMatrixPosition(light.matrixWorld);
    this[$camera].updateMatrixWorld(true);
    this[$camera].lookAt(light.target.position);

    // Update the camera's frustum to fully engulf the StaticShadow
    // mesh that will be rendering the generated texture.
    this.updateMatrixWorld(true);
    scale.setFromMatrixScale(this.matrixWorld);

    this[$camera].top = scale.z / 2;
    this[$camera].bottom = scale.z / -2;
    this[$camera].left = scale.x / -2;
    this[$camera].right = scale.x / 2;
    this[$camera].near = config.near;
    this[$camera].far = config.far;
    this[$camera].updateProjectionMatrix();

    // There's a chance the shadow will be in the scene that's being rerendered;
    // temporarily remove it incase.
    if (shadowParent) {
      shadowParent.remove(this);
    }

    renderer.render(scene, this[$camera], this[$renderTarget], true);

    if (shadowParent) {
      shadowParent.add(this);
    }

    this.material.needsUpdate = true;

    // Reset the values on the renderer and scene
    scene.overrideMaterial = userSceneOverrideMaterial;
    renderer.setClearAlpha(userClearAlpha);
    renderer.setRenderTarget(userRenderTarget);
  }
}
