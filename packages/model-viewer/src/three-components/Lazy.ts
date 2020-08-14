/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {ACESFilmicToneMapping, GammaEncoding, PCFSoftShadowMap, WebGL1Renderer} from 'three';
import {RoughnessMipmapper} from 'three/examples/jsm/utils/RoughnessMipmapper';

import {CachingGLTFLoader} from './CachingGLTFLoader';
import {ModelViewerGLTFInstance} from './gltf-instance/ModelViewerGLTFInstance';
import {RendererOptions} from './Renderer';
import {LoadingStatusAnnouncer} from './StatusAnnouncer';
import TextureUtils from './TextureUtils';

/**
 * This class is meant to encapsulate the singleton three.js objects to
 * facilitate lazy loading by dynamically importing this module. This
 * lazy-loaded bundle will contain all of the three.js library as well as
 * anthing that does not depend on the model-viewer element. Per-element
 * three.js functionality is confined to the ModelScene, while global three.js
 * functionality is accessed here.
 */
export class Lazy {
  public threeRenderer: WebGL1Renderer;
  public textureUtils: TextureUtils;
  public roughnessMipmapper: RoughnessMipmapper;
  public loader: CachingGLTFLoader;
  public loadingStatusAnnouncer: LoadingStatusAnnouncer;

  constructor(
      canvas3D: HTMLCanvasElement|OffscreenCanvas, options: RendererOptions) {
    this.threeRenderer = new WebGL1Renderer({
      canvas: canvas3D,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
      preserveDrawingBuffer: true
    });
    this.threeRenderer.autoClear = true;
    this.threeRenderer.outputEncoding = GammaEncoding;
    this.threeRenderer.gammaFactor = 2.2;
    this.threeRenderer.physicallyCorrectLights = true;
    this.threeRenderer.setPixelRatio(1);  // handle pixel ratio externally
    this.threeRenderer.shadowMap.enabled = true;
    this.threeRenderer.shadowMap.type = PCFSoftShadowMap;
    this.threeRenderer.shadowMap.autoUpdate = false;
    this.threeRenderer.debug = {checkShaderErrors: options.debug};

    // ACESFilmicToneMapping appears to be the most "saturated",
    // and similar to Filament's gltf-viewer.
    this.threeRenderer.toneMapping = ACESFilmicToneMapping;

    this.textureUtils = new TextureUtils(this.threeRenderer);
    this.roughnessMipmapper = new RoughnessMipmapper(this.threeRenderer);
    this.loader =
        new CachingGLTFLoader(ModelViewerGLTFInstance, this.roughnessMipmapper);
    this.loadingStatusAnnouncer = new LoadingStatusAnnouncer();
  }

  dispose() {
    this.textureUtils.dispose();
    this.threeRenderer.dispose();
  }
};