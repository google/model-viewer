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

import {ThreeDOM} from '@google/3dom/lib/api.js';
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
const $manipulator = Symbol('manipulator');
const $modelKernel = Symbol('modelKernel');
const $setUpMainSide = Symbol('setUpMainSide');
const $onModelGraftMutation = Symbol('onModelGraftMutation');

interface SceneExportOptions {
  binary?: boolean, trs?: boolean, onlyVisible?: boolean, embedImages?: boolean,
      maxTextureSize?: number, forcePowerOfTwoTextures?: boolean,
      includeCustomExtensions?: boolean,
}

export interface SceneGraphInterface {
  exportScene(options?: SceneExportOptions): Promise<Blob>;
}

/**
 * SceneGraphMixin manages a `<model-viewer>` integration with the 3DOM library
 * in order to support custom scripts that operate on the <model-viewer> scene
 * graph.
 *
 * When applied, users can specify a special `<script>` type that can be added
 * as a child of `<model-viewer>`. The script will be invoked in a special
 * Web Worker, conventionally referred to as a "scene graph worklet."
 *
 * Script on the browser main thread can communicate with the scene graph
 * worklet via `modelViewer.worklet` using `postMessage`, much like they would
 * with any other Web Worker.
 *
 * Scene graph worklet scripts must be bestowed capabilities by the author of
 * the `<model-viewer>` markup. The three capabilities currently available
 * include:
 *
 *  - `messaging`: The ability to communicate with other contexts via
 *    `postMessage` and `MessageChannel`
 *  - `fetch`: Access to the global `fetch` method for network operations
 *  - `material-properties`: The ability to manipulate the basic properties of
 *    a Material and its associated constructs in the scene graph
 *
 * A trivial example of creating a scene graph worklet that can manipulate
 * material properties looks like this:
 *
 * ```html
 * <model-viewer>
 *   <script type="experimental-scene-graph-worklet"
 *       allow="material-properties">
 *
 *     console.log('Hello from the scene graph worklet!');
 *
 *     self.addEventListener('model-change', () => {
 *       model.materials[0].pbrMetallicRoughness
 *         .setBaseColorFactor([1, 0, 0, 1]);
 *     });
 *
 *   </script>
 * </model-viewer>
 * ```
 *
 * Only one worklet is allowed per `<model-viewer>` at a time. If a new worklet
 * script is appended to a `<model-viewer>` with a running worklet, a new
 * worklet will be created and the previous one will be terminated. If there
 * is more than one worklet script at HTML parse time, the last one in tree
 * order will be used.
 *
 * When a worklet is created, `<model-viewer>` will dispatch a 'worklet-created'
 * event. At the time that this event is dispatched, the worklet will be created
 * but the model is not guaranteed to have been made available to the worklet.
 */
export const SceneGraphMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<SceneGraphInterface>&T => {
  class SceneGraphModelViewerElement extends ModelViewerElement implements
      ThreeDOM {
    @property({type: Object}) protected[$modelGraft]: ModelGraft|null = null;

    protected[$currentGLTF]: ModelViewerGLTFInstance|null = null;
    protected[$mainPort]: MessagePort|null = null;
    protected[$threePort]: MessagePort|null = null;
    protected[$manipulator]: ModelGraftManipulator|null = null;
    protected[$modelKernel]: ModelKernel|null = null;

    // ThreeDOM implementation is currently just .model.
    /** @export */
    get model() {
      const kernel = this[$modelKernel];
      return kernel ? kernel.model : undefined;
    }

    connectedCallback() {
      super.connectedCallback();

      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();
      this[$mainPort] = port1;
      this[$threePort] = port2;
      this[$setUpMainSide]();
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$mainPort]!.close();
      this[$threePort]!.close();
      this[$mainPort] = null;
      this[$threePort] = null;
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
                new ModelGraftManipulator(modelGraft, this[$threePort]!);
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

    [$setUpMainSide]() {
      this[$mainPort]!.addEventListener('message', (event: MessageEvent) => {
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
            this[$modelKernel] = new ModelKernel(this[$mainPort]!, serialized);
          } else {
            this[$modelKernel] = null;
          }
        }
      });
    }

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
