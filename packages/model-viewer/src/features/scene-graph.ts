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

import {Image, Material, Model, PBRMetallicRoughness, Sampler, Texture, TextureInfo, ThreeDOM} from '@google/3dom/lib/api.js';
import {ModelKernel} from '@google/3dom/lib/api/model-kernel.js';
import {ModelGraft} from '@google/3dom/lib/facade/three-js/model-graft.js';
import {ModelGraftManipulator} from '@google/3dom/lib/model-graft-manipulator.js';
import {SerializedModel, ThreeDOMMessageType} from '@google/3dom/lib/protocol';
import {property} from 'lit-element';
import {GLTFExporter, GLTFExporterOptions} from 'three/examples/jsm/exporters/GLTFExporter';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $scene} from '../model-viewer-base.js';
import {ModelViewerGLTFInstance} from '../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {Constructor} from '../utilities.js';

const $updateThreeSide = Symbol('updateThreeSide');
const $currentGLTF = Symbol('currentGLTF');
const $modelGraft = Symbol('modelGraft');
const $mainPort = Symbol('mainPort');
const $threePort = Symbol('threePort');
const $graftPort = Symbol('graftPort');
const $kernelPort = Symbol('kernelPort');
const $manipulator = Symbol('manipulator');
const $modelKernel = Symbol('modelKernel');
const $onModelChange = Symbol('onModelChange');
const $onModelGraftMutation = Symbol('onModelGraftMutation');

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
 * SceneGraphMixin manages a `<model-viewer>` integration with the 3DOM library
 * in order to support operations on the <model-viewer> scene graph.
 */
export const SceneGraphMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<SceneGraphInterface>&T => {
  class SceneGraphModelViewerElement extends ModelViewerElement implements
      ThreeDOM {
    @property({type: Object}) protected[$modelGraft]: ModelGraft|null = null;

    protected[$currentGLTF]: ModelViewerGLTFInstance|null = null;
    protected[$mainPort]: MessagePort|null = null;
    protected[$threePort]: MessagePort|null = null;
    protected[$graftPort]: MessagePort|null = null;
    protected[$kernelPort]: MessagePort|null = null;
    protected[$manipulator]: ModelGraftManipulator|null = null;
    protected[$modelKernel]: ModelKernel|null = null;

    // ThreeDOM implementation:
    /** @export */
    get model() {
      const kernel = this[$modelKernel];
      return kernel ? kernel.model : undefined;
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

    connectedCallback() {
      super.connectedCallback();

      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();
      this[$mainPort] = port1;
      this[$threePort] = port2;
      this[$mainPort]!.onmessage = this[$onModelChange];
      const channel = new MessageChannel();
      this[$graftPort] = channel.port1;
      this[$kernelPort] = channel.port2;
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$mainPort]!.close();
      this[$threePort]!.close();
      this[$mainPort] = null;
      this[$threePort] = null;
      if (this[$manipulator] != null) {
        this[$manipulator]!.dispose();
      }
      if (this[$modelKernel] != null) {
        this[$modelKernel]!.deactivate();
      }
      this[$graftPort] = null;
      this[$kernelPort] = null;
    }

    updated(changedProperties: Map<string|symbol, unknown>): void {
      super.updated(changedProperties);
      if (changedProperties.has($modelGraft)) {
        const oldModelGraft =
            changedProperties.get($modelGraft) as ModelGraft | null;
        if (oldModelGraft != null) {
          oldModelGraft.removeEventListener(
              'mutation', this[$onModelGraftMutation]);
        }

        const modelGraft = this[$modelGraft];

        if (modelGraft != null) {
          modelGraft.addEventListener('mutation', this[$onModelGraftMutation]);
        }
      }
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      this[$updateThreeSide]();
    }

    [$updateThreeSide]() {
      // Three.js side (will eventually move to worker)
      const scene = this[$scene];
      const {model} = scene;
      const {currentGLTF} = model;
      let modelGraft: ModelGraft|null = null;
      let manipulator: ModelGraftManipulator|null = null;

      if (currentGLTF != null) {
        const {correlatedSceneGraph} = currentGLTF;
        const currentModelGraft = this[$modelGraft];
        const currentManipulator = this[$manipulator];

        if (correlatedSceneGraph != null) {
          if (currentManipulator != null) {
            currentManipulator.dispose();
          }

          if (currentModelGraft != null && currentGLTF === this[$currentGLTF]) {
            return;
          }

          modelGraft = new ModelGraft(model.url || '', correlatedSceneGraph);

          if (modelGraft != null) {
            manipulator =
                new ModelGraftManipulator(modelGraft, this[$graftPort]!);
          }

          this[$threePort]!.postMessage({
            type: ThreeDOMMessageType.MODEL_CHANGE,
            model: modelGraft != null && modelGraft.model != null ?
                modelGraft.model.toJSON() :
                null
          });
        }
      }

      this[$modelGraft] = modelGraft;
      this[$manipulator] = manipulator;
      this[$currentGLTF] = currentGLTF;
    }

    [$onModelChange] = (event: MessageEvent) => {
      const {data} = event;
      if (data && data.type === ThreeDOMMessageType.MODEL_CHANGE) {
        const serialized: SerializedModel|null = data.model;
        const currentKernel = this[$modelKernel];

        if (currentKernel != null) {
          currentKernel.deactivate();
        } else if (serialized == null) {
          // Do not proceed if transitioning from null to null
          return;
        }

        if (serialized != null) {
          this[$modelKernel] = new ModelKernel(this[$kernelPort]!, serialized);
        } else {
          this[$modelKernel] = null;
        }

        this.dispatchEvent(new CustomEvent(
            'scene-graph-ready',
            {detail: {url: serialized ? serialized.modelUri : null}}));
      }
    };

    [$onModelGraftMutation] = (_event: Event) => {
      this[$needsRender]();
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

        const exporter = new GLTFExporter();
        exporter.parse(model, (gltf) => {
          return resolve(
              new Blob([opts.binary ? gltf as Blob : JSON.stringify(gltf)], {
                type: opts.binary ? 'application/octet-stream' :
                                    'application/json'
              }));
        }, opts);
      });
    }
  }

  return SceneGraphModelViewerElement;
};
