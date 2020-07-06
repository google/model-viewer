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

import {ThreeDOMCapability} from '@google/3dom/lib/api.js';
import {ThreeDOMExecutionContext} from '@google/3dom/lib/context.js';
import {ModelGraft} from '@google/3dom/lib/facade/three-js/model-graft.js';
import {property} from 'lit-element';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $scene} from '../model-viewer-base.js';
import {ModelViewerGLTFInstance} from '../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {Constructor} from '../utilities.js';

const SCENE_GRAPH_SCRIPT_TYPE = 'experimental-scene-graph-worklet';
const VALID_CAPABILITIES: Set<ThreeDOMCapability> =
    new Set(['messaging', 'fetch', 'material-properties', 'textures']);

const $onChildListMutation = Symbol('onChildListMutation');
const $childListMutationHandler = Symbol('childListMutationHandler');
const $mutationObserver = Symbol('mutationObserver');
const $createExecutionContext = Symbol('createExecutionContext');
const $onScriptElementAdded = Symbol('onScriptElementAdded');
const $executionContext = Symbol('executionContext');
const $updateExecutionContextModel = Symbol('updateExecutionContextModel');
const $currentGLTF = Symbol('currentGLTF');
const $modelGraft = Symbol('modelGraft');
const $onModelGraftMutation = Symbol('onModelGraftMutation');
const $modelGraftMutationHandler = Symbol('modelGraftMutationHandler');
const $isValid3DOMScript = Symbol('isValid3DOMScript');

interface SceneExportOptions {
  binary?: boolean, trs?: boolean, onlyVisible?: boolean, embedImages?: boolean,
      maxTextureSize?: number, forcePowerOfTwoTextures?: boolean,
      includeCustomExtensions?: boolean,
}

export interface SceneGraphInterface {
  worklet: Worker|null;
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
  class SceneGraphModelViewerElement extends ModelViewerElement {
    @property({type: Object}) protected[$modelGraft]: ModelGraft|null = null;

    protected[$childListMutationHandler] = (records: Array<MutationRecord>) =>
        this[$onChildListMutation](records);

    protected[$modelGraftMutationHandler] = (event: Event) =>
        this[$onModelGraftMutation](event);

    protected[$mutationObserver] =
        new MutationObserver(this[$childListMutationHandler]);

    protected[$executionContext]: ThreeDOMExecutionContext|null = null;

    protected[$currentGLTF]: ModelViewerGLTFInstance|null = null;

    /**
     * A reference to the active worklet if one exists, or else `null`. A
     * worklet is not created until a scene graph worklet script has been
     * detected as a child of this `<model-viewer>`.
     */
    get worklet() {
      const executionContext = this[$executionContext];
      return executionContext != null ? executionContext.worker : null;
    }

    connectedCallback() {
      super.connectedCallback();

      this[$mutationObserver].observe(this, {childList: true});

      const script = this.querySelector<HTMLScriptElement>(
          `script[type="${SCENE_GRAPH_SCRIPT_TYPE}"]:last-of-type`);

      if (script != null && this[$isValid3DOMScript](script)) {
        this[$onScriptElementAdded](script);
      }
    }

    async disconnectedCallback() {
      super.disconnectedCallback();

      this[$mutationObserver].disconnect();

      const executionContext = this[$executionContext];

      if (executionContext != null) {
        await executionContext.terminate();
        this[$executionContext] = null;
      }
    }

    updated(changedProperties: Map<string|symbol, unknown>): void {
      super.updated(changedProperties);
      if (changedProperties.has($modelGraft)) {
        const oldModelGraft =
            changedProperties.get($modelGraft) as ModelGraft | null;
        if (oldModelGraft != null) {
          oldModelGraft.removeEventListener(
              'mutation', this[$modelGraftMutationHandler]);
        }

        const modelGraft = this[$modelGraft];

        if (modelGraft != null) {
          modelGraft.addEventListener(
              'mutation', this[$modelGraftMutationHandler]);
        }
      }
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      this[$updateExecutionContextModel]();
    }

    [$isValid3DOMScript](node: Node) {
      return node instanceof HTMLScriptElement &&
          (node.textContent || node.src) &&
          node.getAttribute('type') === SCENE_GRAPH_SCRIPT_TYPE
    }

    [$onChildListMutation](records: Array<MutationRecord>) {
      if (this.parentNode == null) {
        // Ignore a lazily reported list of mutations if we are detached
        // from the document...
        return;
      }

      let lastScriptElement: HTMLScriptElement|null = null;

      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (this[$isValid3DOMScript](node)) {
            lastScriptElement = node as HTMLScriptElement;
          }
        }
      }

      if (lastScriptElement != null) {
        this[$onScriptElementAdded](lastScriptElement);
      }
    }

    [$onScriptElementAdded](script: HTMLScriptElement) {
      if (!this[$isValid3DOMScript](script)) {
        return;
      }

      const allowString = script.getAttribute('allow') || '';
      const allowList =
          allowString.split(';')
              .map((fragment) => fragment.trim())
              .filter<ThreeDOMCapability>(
                  (capability): capability is ThreeDOMCapability =>
                      VALID_CAPABILITIES.has(capability as ThreeDOMCapability));

      if (script.src) {
        this[$createExecutionContext](script.src, allowList);
      } else {
        this[$createExecutionContext](
            script.textContent!, allowList, {eval: true});
      }
    }

    async[$createExecutionContext](
        scriptSource: string, capabilities: Array<ThreeDOMCapability>,
        options = {eval: false}) {
      let executionContext = this[$executionContext];

      if (executionContext != null) {
        await executionContext.terminate();
      }

      this[$executionContext] = executionContext =
          new ThreeDOMExecutionContext(capabilities);

      this.dispatchEvent(new CustomEvent(
          'worklet-created', {detail: {worklet: this.worklet}}));

      if (options.eval) {
        await executionContext.eval(scriptSource);
      } else {
        await executionContext.import(scriptSource);
      }

      this[$updateExecutionContextModel]();
    }

    [$updateExecutionContextModel]() {
      const executionContext = this[$executionContext];

      if (executionContext == null || this.parentNode == null) {
        // Ignore if we don't have a 3DOM script to run, or if we are
        // currently detached from the document
        return;
      }

      const scene = this[$scene];
      const {model} = scene;
      const {currentGLTF} = model;
      let modelGraft: ModelGraft|null = null;

      if (currentGLTF != null) {
        const {correlatedSceneGraph} = currentGLTF;
        const currentModelGraft = this[$modelGraft];

        if (correlatedSceneGraph != null) {
          if (currentModelGraft != null && currentGLTF === this[$currentGLTF]) {
            return;
          }

          modelGraft = new ModelGraft(model.url || '', correlatedSceneGraph);
        }
      }

      executionContext.changeModel(modelGraft);

      this[$modelGraft] = modelGraft;
      this[$currentGLTF] = currentGLTF;
    }

    [$onModelGraftMutation](_event: Event) {
      this[$needsRender]();
    }

    /** @export */
    async exportScene(options?: SceneExportOptions): Promise<Blob> {
      const {model} = this[$scene];
      return new Promise<Blob>(async (resolve, reject) => {
        if (model == null) {
          return reject('Model missing or not yet loaded');
        }

        const opts = {
          // NOTE: automatically include all animations to be exported
          animations: model.animations,
          binary: options?.binary || false,
          trs: options?.trs || true,
          onlyVisible: options?.onlyVisible || true,
          maxTextureSize: options?.maxTextureSize || Infinity,
          forcePowerOfTwoTextures: options?.forcePowerOfTwoTextures || false,
          includeCustomExtensions: options?.includeCustomExtensions || false,
          embedImages: options?.embedImages || true,
          // NOTE: automatically set truncate draw range to true since
          // we don't expose those parameters
          truncateDrawRange: true
        };

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
