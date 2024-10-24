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

import {property} from 'lit/decorators.js';
import {CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture, VideoTexture} from 'three';
import {GLTFExporter, GLTFExporterOptions} from 'three/examples/jsm/exporters/GLTFExporter.js';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $progressTracker, $renderer, $scene} from '../model-viewer-base.js';
import {GLTF} from '../three-components/gltf-instance/gltf-defaulted.js';
import {ModelViewerGLTFInstance} from '../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import GLTFExporterMaterialsVariantsExtension from '../three-components/gltf-instance/VariantMaterialExporterPlugin.js';
import {Constructor} from '../utilities.js';

import {Image, PBRMetallicRoughness, Sampler, TextureInfo} from './scene-graph/api.js';
import {Material} from './scene-graph/material.js';
import {$availableVariants, $materialFromPoint, $prepareVariantsForExport, $switchVariant, Model} from './scene-graph/model.js';
import {Texture as ModelViewerTexture} from './scene-graph/texture.js';



export const $currentGLTF = Symbol('currentGLTF');
export const $originalGltfJson = Symbol('originalGltfJson');
export const $model = Symbol('model');
const $getOnUpdateMethod = Symbol('getOnUpdateMethod');
const $buildTexture = Symbol('buildTexture');

interface SceneExportOptions {
  binary?: boolean, trs?: boolean, onlyVisible?: boolean,
      maxTextureSize?: number, includeCustomExtensions?: boolean,
      forceIndices?: boolean
}

export interface SceneGraphInterface {
  readonly model?: Model;
  variantName: string|null;
  readonly availableVariants: string[];
  orientation: string;
  scale: string;
  readonly originalGltfJson: GLTF|null;
  exportScene(options?: SceneExportOptions): Promise<Blob>;
  createTexture(uri: string, type?: string): Promise<ModelViewerTexture|null>;
  createLottieTexture(uri: string, quality?: number):
      Promise<ModelViewerTexture|null>;
  createVideoTexture(uri: string): ModelViewerTexture;
  createCanvasTexture(): ModelViewerTexture;
  /**
   * Intersects a ray with the scene and returns a list of materials who's
   * objects were intersected.
   * @param pixelX X coordinate of the mouse.
   * @param pixelY Y coordinate of the mouse.
   * @returns a material, if no intersection is made then null is returned.
   */
  materialFromPoint(pixelX: number, pixelY: number): Material|null;
}

/**
 * SceneGraphMixin manages exposes a model API in order to support operations on
 * the <model-viewer> scene graph.
 */
export const SceneGraphMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<SceneGraphInterface>&T => {
  class SceneGraphModelViewerElement extends ModelViewerElement {
    protected[$model]: Model|undefined = undefined;
    protected[$currentGLTF]: ModelViewerGLTFInstance|null = null;
    private[$originalGltfJson]: GLTF|null = null;

    @property({type: String, attribute: 'variant-name'})
    variantName: string|null = null;

    @property({type: String, attribute: 'orientation'})
    orientation: string = '0 0 0';

    @property({type: String, attribute: 'scale'}) scale: string = '1 1 1';

    // Scene-graph API:
    /** @export */
    get model() {
      return this[$model];
    }

    get availableVariants() {
      return this.model ? this.model[$availableVariants]() : [] as string[];
    }

    /**
     * Returns a deep copy of the gltf JSON as loaded. It will not reflect
     * changes to the scene-graph, nor will editing it have any effect.
     */
    get originalGltfJson() {
      return this[$originalGltfJson];
    }

    /**
     * References to each element constructor. Supports instanceof checks; these
     * classes are not directly constructable.
     */
    static Model: Constructor<Model>;
    static Material: Constructor<Material>;
    static PBRMetallicRoughness: Constructor<PBRMetallicRoughness>;
    static Sampler: Constructor<Sampler>;
    static TextureInfo: Constructor<TextureInfo>;
    static Texture: Constructor<Texture>;
    static Image: Constructor<Image>;

    private[$getOnUpdateMethod]() {
      return () => {
        this[$needsRender]();
      };
    }

    private[$buildTexture](texture: Texture): ModelViewerTexture {
      // Applies glTF default settings.
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      return new ModelViewerTexture(this[$getOnUpdateMethod](), texture);
    }

    async createTexture(uri: string, type: string = 'image/png'):
        Promise<ModelViewerTexture> {
      const {textureUtils} = this[$renderer];
      const texture = await textureUtils!.loadImage(uri, this.withCredentials);

      texture.userData.mimeType = type;

      return this[$buildTexture](texture);
    }

    async createLottieTexture(uri: string, quality = 1):
        Promise<ModelViewerTexture> {
      const {textureUtils} = this[$renderer];
      const texture =
          await textureUtils!.loadLottie(uri, quality, this.withCredentials);

      return this[$buildTexture](texture);
    }

    createVideoTexture(uri: string): ModelViewerTexture {
      const video = document.createElement('video');
      video.crossOrigin =
          this.withCredentials ? 'use-credentials' : 'anonymous';
      video.src = uri;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.play();
      const texture = new VideoTexture(video);

      return this[$buildTexture](texture);
    }

    createCanvasTexture(): ModelViewerTexture {
      const canvas = document.createElement('canvas');
      const texture = new CanvasTexture(canvas);

      return this[$buildTexture](texture);
    }

    async updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('variantName')) {
        const updateVariantProgress =
            this[$progressTracker].beginActivity('variant-update');
        updateVariantProgress(0.1);
        const model = this[$model];
        const {variantName} = this;

        if (model != null) {
          await model[$switchVariant](variantName!);
          this[$needsRender]();
          this.dispatchEvent(new CustomEvent('variant-applied'));
        }
        updateVariantProgress(1.0);
      }

      if (changedProperties.has('orientation') ||
          changedProperties.has('scale')) {
        if (!this.loaded) {
          return;
        }
        const scene = this[$scene];
        scene.applyTransform();
        scene.updateBoundingBox();
        scene.updateShadow();
        this[$renderer].arRenderer.onUpdateScene();
        this[$needsRender]();
      }
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      const {currentGLTF} = this[$scene];

      if (currentGLTF != null) {
        const {correlatedSceneGraph} = currentGLTF;

        if (correlatedSceneGraph != null &&
            currentGLTF !== this[$currentGLTF]) {
          this[$model] =
              new Model(correlatedSceneGraph, this[$getOnUpdateMethod]());
          this[$originalGltfJson] =
              JSON.parse(JSON.stringify(correlatedSceneGraph.gltf));
        }

        // KHR_materials_variants extension spec:
        // https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants

        if ('variants' in currentGLTF.userData) {
          this.requestUpdate('variantName');
        }
      }

      this[$currentGLTF] = currentGLTF;
    }

    /** @export */
    async exportScene(options?: SceneExportOptions): Promise<Blob> {
      const scene = this[$scene];
      return new Promise<Blob>(async (resolve, reject) => {
        // Defaults
        const opts = {
          binary: true,
          onlyVisible: true,
          maxTextureSize: Infinity,
          includeCustomExtensions: false,
          forceIndices: false
        } as GLTFExporterOptions;

        Object.assign(opts, options);
        // Not configurable
        opts.animations = scene.animations;
        opts.truncateDrawRange = true;

        const shadow = scene.shadow;
        let visible = false;
        // Remove shadow from export
        if (shadow != null) {
          visible = shadow.visible;
          shadow.visible = false;
        }

        await this[$model]![$prepareVariantsForExport]();

        const exporter =
            (new GLTFExporter() as any)
                .register(
                    (writer: any) =>
                        new GLTFExporterMaterialsVariantsExtension(writer));
        exporter.parse(
            scene.model,
            (gltf: object) => {
              return resolve(new Blob(
                  [opts.binary ? gltf as Blob : JSON.stringify(gltf)], {
                    type: opts.binary ? 'application/octet-stream' :
                                        'application/json'
                  }));
            },
            () => {
              return reject('glTF export failed');
            },
            opts);

        if (shadow != null) {
          shadow.visible = visible;
        }
      });
    }

    materialFromPoint(pixelX: number, pixelY: number): Material|null {
      const model = this[$model];
      if (model == null) {
        return null;
      }
      const scene = this[$scene];
      const ndcCoords = scene.getNDC(pixelX, pixelY);
      const hit = scene.hitFromPoint(ndcCoords);
      if (hit == null || hit.face == null) {
        return null;
      }

      return model[$materialFromPoint](hit);
    }
  }

  return SceneGraphModelViewerElement;
};
