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

import {GLTFExporter, GLTFExporterOptions} from 'three/examples/jsm/exporters/GLTFExporter';

import ModelViewerElementBase, {$onModelLoad, $scene} from '../model-viewer-base.js';
import {ModelViewerGLTFInstance} from '../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {$shadow} from '../three-components/Model.js';
import {Constructor} from '../utilities.js';

import {Image, Material, PBRMetallicRoughness, Sampler, Texture, TextureInfo} from './scene-graph/api.js';
import {Model} from './scene-graph/model.js';

const $currentGLTF = Symbol('currentGLTF');
const $model = Symbol('model');

interface SceneExportOptions {
  binary?: boolean, trs?: boolean, onlyVisible?: boolean, embedImages?: boolean,
      maxTextureSize?: number, forcePowerOfTwoTextures?: boolean,
      includeCustomExtensions?: boolean,
}

export interface SceneGraphInterface {
  readonly model?: Model;
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

    // Scene-graph API:
    /** @export */
    get model() {
      return this[$model];
    }

    /**
     * References to each 3DOM constructor. Supports instanceof checks; these
     * classes are not directly constructable.
     */
    static Model: Constructor<Model>;
    static Material: Constructor<Material>;
    static PBRMetallicRoughness: Constructor<PBRMetallicRoughness>;
    static Sampler: Constructor<Sampler>;
    static TextureInfo: Constructor<TextureInfo>;
    static Texture: Constructor<Texture>;
    static Image: Constructor<Image>;

    [$onModelLoad]() {
      super[$onModelLoad]();

      const {currentGLTF} = this[$scene].model;

      if (currentGLTF != null) {
        const {correlatedSceneGraph} = currentGLTF;

        if (correlatedSceneGraph != null &&
            currentGLTF !== this[$currentGLTF]) {
          this[$model] = new Model(correlatedSceneGraph);
        }
      }

      this[$currentGLTF] = currentGLTF;
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

        const shadow = model[$shadow];
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
