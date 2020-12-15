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
import {MeshStandardMaterial} from 'three';
import {GLTFExporter, GLTFExporterOptions} from 'three/examples/jsm/exporters/GLTFExporter';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $scene} from '../model-viewer-base.js';
import {Variants} from '../three-components/gltf-instance/gltf-2.0.js';
import {ModelViewerGLTFInstance} from '../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {Constructor} from '../utilities.js';

import {Image, PBRMetallicRoughness, Sampler, Texture, TextureInfo} from './scene-graph/api.js';
import {Material} from './scene-graph/material.js';
import {Model} from './scene-graph/model.js';

const $currentGLTF = Symbol('currentGLTF');
const $model = Symbol('model');
const $variants = Symbol('variants');

interface SceneExportOptions {
  binary?: boolean, trs?: boolean, onlyVisible?: boolean, embedImages?: boolean,
      maxTextureSize?: number, forcePowerOfTwoTextures?: boolean,
      includeCustomExtensions?: boolean,
}

export interface SceneGraphInterface {
  readonly model?: Model;
  variantName: string|undefined;
  readonly availableVariants: Array<string>;
  exportScene(options?: SceneExportOptions): Promise<Blob>;
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

    @property({type: String, attribute: 'variant-name'})
    variantName: string|undefined = undefined;

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

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('variantName')) {
        const variants = this[$variants];
        const threeGLTF = this[$currentGLTF];
        const {variantName} = this;

        const variantIndex = variants.findIndex((v) => v === variantName);
        if (threeGLTF == null || variantIndex < 0) {
          return;
        }

        const onUpdate = () => {
          this[$needsRender]();
        };

        const updatedMaterials =
            threeGLTF.correlatedSceneGraph.loadVariant(variantIndex, onUpdate);
        const {gltf, gltfElementMap} = threeGLTF.correlatedSceneGraph;

        for (const index of updatedMaterials) {
          const material = gltf.materials![index];
          this[$model]!.materials[index] = new Material(
              onUpdate,
              gltf,
              material,
              gltfElementMap.get(material) as Set<MeshStandardMaterial>);
        }
      }
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      this[$variants] = [];

      const {currentGLTF} = this[$scene].model;

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

        const {gltfExtensions} = currentGLTF.userData;
        if (gltfExtensions != null) {
          const extension = gltfExtensions['KHR_materials_variants'];

          if (extension != null) {
            this[$variants] =
                (extension.variants as Variants).map(variant => variant.name);
          }
        }
      }

      this[$currentGLTF] = currentGLTF;
      // TODO: remove this event, as it is synonymous with the load event.
      this.dispatchEvent(new CustomEvent('scene-graph-ready'));
    }

    /** @export */
    async exportScene(options?: SceneExportOptions): Promise<Blob> {
      const {model} = this[$scene];
      return new Promise<Blob>(async (resolve, reject) => {
        if (model == null) {
          return reject('Model missing or not yet loaded');
        }

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
        opts.animations = model.animations;
        opts.truncateDrawRange = true;

        const shadow = model.shadow;
        let visible = false;
        // Remove shadow from export
        if (shadow != null) {
          visible = shadow.visible;
          shadow.visible = false;
        }

        const exporter = new GLTFExporter();
        exporter.parse(model.modelContainer, (gltf) => {
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
