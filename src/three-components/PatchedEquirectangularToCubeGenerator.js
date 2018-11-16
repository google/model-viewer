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

import {Cache, EventDispatcher, GammaEncoding, TextureLoader} from 'three';
import ParentGenerator from '../third_party/three/EquirectangularToCubeGenerator.js';

let resourceCache = {};

/**
 * Each instance of EquirectangularToCubeGenerator creates a new camera,
 * scene and render target. Every time a scene/camera duo is rendered,
 * a new three.js WebGLRenderState is cached in the renderer, with no way
 * of draining, causing a memory leak. The render target isn't shareable
 * between textures either, as the caller of this function is responsible
 * for disposing the texture. To get around these constraints, create
 * new generators, but reuse the same camera and scene as to not generate
 * extra WebGLRenderStates in cache.
 *
 * Memory leaks in three.js generators issue:
 * @see https://github.com/mrdoob/three.js/issues/15288
 */
export default class PatchedEquirectangularToCubeGenerator extends
    ParentGenerator {
  constructor(texture, config) {
    super(texture, config);

    if (resourceCache.scene) {
      this.scene = resourceCache.scene;
      this.camera = resourceCache.camera;
      this.boxMesh = resourceCache.boxMesh;
    } else {
      resourceCache.scene = this.scene;
      resourceCache.camera = this.camera;
      resourceCache.boxMesh = this.boxMesh;
    }
  }

  update(renderer) {
    this.boxMesh.material.uniforms.equirectangularMap.value = this.sourceTexture;
    return super.update(renderer);
  }

  // If this is the first generator, stub out the getShader method
  // so we don't create unnecessary shaders; we're continuing to
  // reuse the same camera and scene after all. Necessary to overwrite
  // the prototype since this is called in the parent class constructor.
  getShader() {
    if (!resourceCache.shader) {
      resourceCache.shader = super.getShader();
    }
    return resourceCache.shader;
  }
}
