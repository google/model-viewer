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

import {property} from 'lit-element';
import {Euler, MeshStandardMaterial, RepeatWrapping, sRGBEncoding, Texture, TextureLoader} from 'three';
import {GLTFExporter, GLTFExporterOptions} from 'three/examples/jsm/exporters/GLTFExporter';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $renderer, $scene} from '../model-viewer-base.js';
import {normalizeUnit} from '../styles/conversions.js';
import {NumberNode, parseExpressions} from '../styles/parsers.js';
import {ModelViewerGLTFInstance} from '../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import GLTFExporterMaterialsVariantsExtension from '../three-components/gltf-instance/VariantMaterialExporterPlugin';
import {Constructor} from '../utilities.js';

import {Image, PBRMetallicRoughness, Sampler, TextureInfo} from './scene-graph/api.js';
import {Material} from './scene-graph/material.js';
import {Model} from './scene-graph/model.js';
import {Texture as ModelViewerTexture} from './scene-graph/texture';
import {$createFromTexture, TextureInfo as SceneGraphTextureInfo} from './scene-graph/texture-info.js';



const $currentGLTF = Symbol('currentGLTF');
const $model = Symbol('model');
const $variants = Symbol('variants');
const $onUpdate = Symbol('onUpdate');
const $textureLoader = Symbol('textureLoader');

interface SceneExportOptions {
  binary?: boolean, trs?: boolean, onlyVisible?: boolean, embedImages?: boolean,
      maxTextureSize?: number, forcePowerOfTwoTextures?: boolean,
      includeCustomExtensions?: boolean,
}

export interface SceneGraphInterface {
  readonly model?: Model;
  variantName: string|undefined;
  readonly availableVariants: Array<string>;
  orientation: string;
  scale: string;
  exportScene(options?: SceneExportOptions): Promise<Blob>;
  createTexture(uri: string): Promise<ModelViewerTexture|null>;
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
    protected[$variants]: Array<string> = [];
    private[$textureLoader] = new TextureLoader();

    @property({type: String, attribute: 'variant-name'})
    variantName: string|undefined = undefined;

    @property({type: String, attribute: 'orientation'})
    orientation: string = '0 0 0';

    @property({type: String, attribute: 'scale'}) scale: string = '1 1 1';

    // Scene-graph API:
    /** @export */
    get model() {
      return this[$model];
    }

    get availableVariants() {
      return this[$variants];
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

    private[$onUpdate]() {
      this[$needsRender]();
    }

    async createTexture(uri: string): Promise<ModelViewerTexture|null> {
      const currentGLTF = this[$currentGLTF];
      const texture: Texture = await new Promise<Texture>(
          (resolve) => this[$textureLoader].load(uri, resolve));
      if (!currentGLTF || !texture) {
        return null;
      }
      // Applies default settings.
      texture.encoding = sRGBEncoding;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.flipY = false;

      return new ModelViewerTexture(
          SceneGraphTextureInfo[$createFromTexture](texture));
    }


    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('variantName')) {
        const threeGLTF = this[$currentGLTF];
        const {variantName} = this;

        if (threeGLTF == null) {
          return;
        }

        const updatedMaterialsPromise =
            threeGLTF.correlatedSceneGraph.loadVariant(
                variantName!, this[$onUpdate]);
        const {gltf, gltfElementMap} = threeGLTF.correlatedSceneGraph;

        updatedMaterialsPromise.then(updatedMaterials => {
          for (const index of updatedMaterials) {
            const material = gltf.materials![index];
            this[$model]!.materials[index] = new Material(
                this[$onUpdate],
                gltf,
                material,
                gltfElementMap.get(material) as Set<MeshStandardMaterial>);
          }
        });
      }

      if (changedProperties.has('orientation') ||
          changedProperties.has('scale')) {
        const {modelContainer} = this[$scene];

        const orientation = parseExpressions(this.orientation)[0]
                                .terms as [NumberNode, NumberNode, NumberNode];

        const roll = normalizeUnit(orientation[0]).number;
        const pitch = normalizeUnit(orientation[1]).number;
        const yaw = normalizeUnit(orientation[2]).number;

        modelContainer.quaternion.setFromEuler(
            new Euler(pitch, yaw, roll, 'YXZ'));

        const scale = parseExpressions(this.scale)[0]
                          .terms as [NumberNode, NumberNode, NumberNode];

        modelContainer.scale.set(
            scale[0].number, scale[1].number, scale[2].number);

        this[$scene].updateBoundingBox();
        this[$scene].updateShadow();
        this[$renderer].arRenderer.onUpdateScene();
        this[$needsRender]();
      }
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      this[$variants] = [];

      const {currentGLTF} = this[$scene];

      if (currentGLTF != null) {
        const {correlatedSceneGraph} = currentGLTF;

        if (correlatedSceneGraph != null &&
            currentGLTF !== this[$currentGLTF]) {
          this[$model] = new Model(correlatedSceneGraph, () => {
            this[$needsRender]();
          });
        }

        // KHR_materials_variants extension spec:
        // https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants

        if ('variants' in currentGLTF.userData) {
          this[$variants] = currentGLTF.userData.variants.slice();
          this.requestUpdate('variantName');
        }
      }

      this[$currentGLTF] = currentGLTF;
      // TODO: remove this event, as it is synonymous with the load event.
      this.dispatchEvent(new CustomEvent('scene-graph-ready'));
    }

    /** @export */
    async exportScene(options?: SceneExportOptions): Promise<Blob> {
      const scene = this[$scene];
      return new Promise<Blob>(async (resolve) => {
        // Defaults
        const opts = {
          binary: true,
          onlyVisible: true,
          maxTextureSize: Infinity,
          forcePowerOfTwoTextures: false,
          includeCustomExtensions: false,
          embedImages: true
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

        const currentGLTF = this[$currentGLTF];

        if (currentGLTF != null && 'functions' in currentGLTF.userData &&
            'ensureLoadVariants' in currentGLTF.userData.functions) {
          // Ensure all variant materials are loaded because some of them may
          // not be loaded yet.
          await currentGLTF.userData.functions.ensureLoadVariants(scene);
        }

        const exporter =
            (new GLTFExporter() as any)
                .register(
                    (writer: any) =>
                        new GLTFExporterMaterialsVariantsExtension(writer));
        exporter.parse(scene.modelContainer, (gltf: object) => {
          return resolve(
              new Blob([opts.binary ? gltf as Blob : JSON.stringify(gltf)], {
                type: opts.binary ? 'application/octet-stream' :
                                    'application/json'
              }));
        }, opts);

        if (shadow != null) {
          shadow.visible = visible;
        }
      });
    }
  }

  return SceneGraphModelViewerElement;
};
