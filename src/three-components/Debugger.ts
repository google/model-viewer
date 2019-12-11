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

import {Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, Texture, WebGLRenderTarget} from 'three';

import {Constructor} from '../utilities.js';

import {ModelScene} from './ModelScene.js';
import {Renderer} from './Renderer.js';

export interface ModelViewerRendererDebugDetails {
  renderer: Renderer;
  THREE: {
    ShaderMaterial: Constructor<ShaderMaterial>;
    PlaneBufferGeometry: Constructor<PlaneBufferGeometry>;
    OrthographicCamera: Constructor<OrthographicCamera>;
    WebGLRenderTarget: Constructor<WebGLRenderTarget>;
    Texture: Constructor<Texture>;
    Scene: Constructor<Scene>;
    Mesh: Constructor<Mesh>;
  };
}

export interface ModelViewerSceneDetails {
  scene: ModelScene
}

/**
 * This Debugger exposes internal details of the <model-viewer> rendering
 * substructure so that external tools can more easily inspect and operate on
 * them.
 *
 * It also activates shader debugging on the associated GL context. Shader
 * debugging trades performance for useful error information, so it is not
 * recommended to activate this unless needed.
 */
export class Debugger {
  constructor(renderer: Renderer) {
    // Force WebGL shader debugging on:
    renderer.threeRenderer.debug = {checkShaderErrors: true};
    // Announce debug details at microtask timing to give the `Renderer`
    // constructor time to complete its initialization, just to be on the safe
    // side:
    Promise.resolve().then(() => {
      self.dispatchEvent(new CustomEvent<ModelViewerRendererDebugDetails>(
          'model-viewer-renderer-debug', {
            detail: {
              renderer,
              THREE: {
                ShaderMaterial,
                Texture,
                Mesh,
                Scene,
                PlaneBufferGeometry,
                OrthographicCamera,
                WebGLRenderTarget
              }
            }
          }));
    });
  }

  addScene(scene: ModelScene) {
    self.dispatchEvent(new CustomEvent<ModelViewerSceneDetails>(
        'model-viewer-scene-added-debug', {detail: {scene}}));
  }

  removeScene(scene: ModelScene) {
    self.dispatchEvent(new CustomEvent<ModelViewerSceneDetails>(
        'model-viewer-scene-removed-debug', {detail: {scene}}));
  }
}
