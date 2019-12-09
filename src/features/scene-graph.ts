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

import {ThreeDOMCapability} from '../3dom/api.js';
import {ThreeDOMExecutionContext} from '../3dom/context.js';
import {ModelGraft} from '../3dom/three/model-graft.js';
import ModelViewerElementBase, {$onModelLoad, $scene} from '../model-viewer-base.js';
import {Constructor} from '../utilities.js';

const SCENE_GRAPH_SCRIPT_TYPE = 'scene-graph-worklet';
const DEFAULT_CAPABILITIES: Array<ThreeDOMCapability> =
    ['messaging', 'material-properties'];

const $onChildListMutation = Symbol('onChildListMutation');
const $childListMutationHandler = Symbol('childListMutationHandler');
const $mutationObserver = Symbol('mutationObserver');
const $onSceneGraphScriptAdded = Symbol('onSceneGraphScriptAdded');
const $executionContext = Symbol('executionContext');
const $updateExecutionContextModel = Symbol('updateExecutionContextModel');

export interface SceneGraphInterface {}

export const SceneGraphMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<SceneGraphInterface>&T => {
  class SceneGraphModelViewerElement extends ModelViewerElement {
    protected[$childListMutationHandler] = (records: Array<MutationRecord>) =>
        this[$onChildListMutation](records);
    protected[$mutationObserver] =
        new MutationObserver(this[$childListMutationHandler]);

    protected[$executionContext]: ThreeDOMExecutionContext|null = null;

    connectedCallback() {
      super.connectedCallback();

      this[$mutationObserver].observe(this, {childList: true});

      const script = this.querySelector(
          `script[type="${SCENE_GRAPH_SCRIPT_TYPE}"]:last-of-type`);

      if (script != null && script.textContent) {
        this[$onSceneGraphScriptAdded](
            script.textContent, DEFAULT_CAPABILITIES);
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$mutationObserver].disconnect();

      if (this[$executionContext] != null) {
        this[$executionContext]!.terminate();
        this[$executionContext] = null;
      }
    }

    [$onModelLoad](event: any) {
      super[$onModelLoad](event);

      this[$updateExecutionContextModel]();
    }

    [$onChildListMutation](records: Array<MutationRecord>) {
      let lastScriptElement: HTMLScriptElement|null = null;
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLScriptElement &&
              node.getAttribute('type') === SCENE_GRAPH_SCRIPT_TYPE) {
            lastScriptElement = node;
          }
        }
      }

      if (lastScriptElement != null && lastScriptElement.textContent) {
        this[$onSceneGraphScriptAdded](
            lastScriptElement.textContent, DEFAULT_CAPABILITIES);
      }
    }

    [$onSceneGraphScriptAdded](
        scriptSource: string, capabilities: Array<ThreeDOMCapability>) {
      if (this[$executionContext] != null) {
        this[$executionContext]!.terminate();
      }

      this[$executionContext] = new ThreeDOMExecutionContext(capabilities);
      this[$executionContext]!.eval(scriptSource);

      this[$updateExecutionContextModel]();
    }

    [$updateExecutionContextModel]() {
      if (this[$executionContext] == null) {
        return;
      }

      const scene = this[$scene];
      const modelGraft: ModelGraft|null = this.loaded ?
          new ModelGraft(scene.model.url!, {
            scene: scene,
            scenes: [scene],
            animations: [],
            cameras: [],
            asset: {}
          }) :
          null;

      this[$executionContext]!.changeModel(modelGraft);
    }
  }

  return SceneGraphModelViewerElement;
};