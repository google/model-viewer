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

import {ReactiveElement} from 'lit';
import {EffectComposer, EffectPass, NormalPass, RenderPass, Selection, Pass} from 'postprocessing';
import {disposeEffectPass, isConvolution} from './utilities.js';
import {ModelViewerElement} from '@beilinson/model-viewer';
import {$requireNormals, $requireSeparatePass, IMVEffect, MVEffectBase} from './effects/mixins/effect-base.js';
import {ModelScene} from '@beilinson/model-viewer/lib/three-components/ModelScene.js';
import { Camera, HalfFloatType, UnsignedByteType, WebGLRenderer } from 'three';
import { property } from 'lit/decorators.js';
import { OverrideMaterialManager } from "postprocessing";

OverrideMaterialManager.workaroundEnabled = true;

export const $scene = Symbol('scene');

export const $effectOptions = Symbol('effectOptions');
export const $effectComposer = Symbol('effectComposer');
export const $renderPass = Symbol('renderPass');
export const $normalPass = Symbol('normalPass');
export const $clearPass = Symbol('clearPass');
export const $removeClearPass = Symbol('removeClearPass');
export const $addClearPass = Symbol('addClearPass');
export const $effectPasses = Symbol('effectsPass');
export const $effects = Symbol('effects');
export const $selection = Symbol('selection');
export const $setSelection = Symbol('setSelection');
export const $resetEffectPasses = Symbol('resetEffectPasses');
export const $userEffectCount = Symbol('userEffectCount');

/**
 * Light wrapper around {@link EffectComposer} for storing the `scene` and `camera
 * at a top level, and setting them for every {@link Pass} added.
 */
export class EffectRenderer extends EffectComposer {
  public camera!: Camera;
  public scene!: ModelScene;

  constructor(
    renderer?: WebGLRenderer,
    options?: {
      depthBuffer?: boolean;
      stencilBuffer?: boolean;
      alpha?: boolean;
      multisampling?: number;
      frameBufferType?: number;
    }) {
      super(renderer, options);
    }

    /**
     * Adds a pass, optionally at a specific index.
     * Additionally sets `scene` and `camera`.
     * @param pass A new pass.
     * @param index An index at which the pass should be inserted.
     */
    override addPass(pass: Pass, index?: number): void {
      pass.mainScene = this.scene;
      pass.mainCamera = this.camera;
      super.addPass(pass, index);
    }

    override setMainCamera(camera: Camera): void {
      this.camera = camera;
      super.setMainCamera(camera);
    }

    override setMainScene(scene: ModelScene): void {
      this.scene = scene;
      super.setMainScene(scene);
    }

    /**
     * Materials that use effects need to be manually updated whenever the camera settings update.
     */
    updateCameraSettings(): void {
      super.setMainCamera(this.camera);
    }
}

export type RenderMode = 'performance' | 'quality';

export class MVEffectComposer extends ReactiveElement {
  static get is() {
    return 'effect-composer';
  }

  /**
   * `quality` | `performance`. Changing this after the element was constructed has no effect.
   * 
   * Using `quality` improves banding on certain effects, at a memory cost. Use in HDR scenarios.
   * 
   * `performance` should be sufficient for most use-cases.
   * @default 'performance'
   */
  @property({type: String, attribute: 'render-mode'})
  renderMode: RenderMode = 'performance';

  protected [$effectComposer]!: EffectRenderer;
  protected [$renderPass]: RenderPass;
  protected [$normalPass]: NormalPass;
  protected [$clearPass]: EffectPass;
  protected [$selection]: Selection;
  protected[$userEffectCount]: number = 0;
  
  /**
   * Array of custom {@link Pass}'s added with {@link addEffectPass}.
   */
  get userPasses(): Pass[] {
    return this[$effectComposer].passes.slice(2, 2 + this[$userEffectCount]);
  }

  get modelViewerElement() {
    return this.parentNode as ModelViewerElement;
  }

  /**
   * The Texture buffer of the inbuilt {@link NormalPass}.
   */
  get normalBuffer() {
    return this[$normalPass].texture;
  }

  /**
   * A selection of all {@link Mesh}'s in the ModelScene.
   */
  get selection() {
    return this[$selection];
  }

  /**
   * Creates a new MVEffectComposer element.
   * The EffectComposer instance is created only on connection with the dom so that 
   */
  constructor() {
    super();
    this[$renderPass] = new RenderPass();
    // @ts-expect-error they are allowed to be undefined
    this[$normalPass] = new NormalPass();
    // @ts-expect-error they are allowed to be undefined
    this[$clearPass] = new EffectPass(undefined);
    this[$clearPass].name = 'ClearPass';
    this[$normalPass].enabled = false;
    this[$selection] = new Selection();
    console.log(this.renderMode);
  }

  connectedCallback(): void {
    console.log(this.renderMode);
    super.connectedCallback && super.connectedCallback();
    this[$effectComposer] = new EffectRenderer(undefined, {
      frameBufferType: this.renderMode === 'quality' ? HalfFloatType : UnsignedByteType,
    });
    if (this.modelViewerElement.nodeName.toLowerCase() !== 'model-viewer') {
      throw new Error('<effect-composer> must be a child of a <model-viewer> component.');
    }
    this.modelViewerElement.registerEffectsComposer(this[$effectComposer]);
    this[$effectComposer].addPass(this[$renderPass], 0);
    this[$effectComposer].addPass(this[$normalPass], 1);
    this[$setSelection]();
    this.modelViewerElement.addEventListener('beforeRender', this[$setSelection]);
    this.updateEffects();
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();
    this.modelViewerElement.unregisterEffectsComposer();
    this.modelViewerElement.removeEventListener('beforeRender', this[$setSelection]);
    this[$effectComposer].dispose();
  }

  /**
   * Adds a custom Pass that extends the {@link Pass} class. All passes added through this method will be prepended before all other web-component effects.
   * 
   * This method automatically sets the `scene` and `camera` of the pass.
   * @param {Pass} pass Custom Pass to add. The camera and scene are set automatically. 
   * @param {boolean} requireNormals Whether any effect in this pass uses the {@link normalBuffer}
   */
  addEffectPass(pass: Pass, requireNormals?: boolean) {
    if (requireNormals) this[$normalPass].enabled = true;
    (pass as any).requireNormals = requireNormals;
    const index = this[$userEffectCount] + 2;   // Including the renderPass and normalPas
    this[$effectComposer].addPass(pass, index); // push after current userPasses, before any web-component effects.
    this[$userEffectCount]++;
    this[$removeClearPass]();
  }

  /**
   * Removes and optionally disposes of a previously added Pass.
   * @param pass Custom Pass to remove
   * @param {Boolean} dispose Disposes of the Pass properties and effects. Default is `true`.
   */
  removeEffectPass(pass: Pass, dispose: boolean = true) {
    if (!this[$effectComposer].passes.includes(pass)) throw new Error(`Pass ${pass.name} not found.`);
    this[$effectComposer].removePass(pass);
    if (dispose) pass.dispose();
    this[$normalPass].enabled = this[$requireNormals](this[$effects]);
    this[$userEffectCount]--;
    this[$addClearPass]();
  }

  /**
   * Updates all existing EffectPasses, adding any new `<model-viewer-effects>` Effects 
   * in the order they were added, after any custom Passes added with {@link addEffectPass}.
   */
  updateEffects(): void {
    this[$resetEffectPasses]();

    const effects = this[$effects];
    // Enable the normalPass if used by any effect.
    this[$normalPass].enabled = this[$requireNormals](effects);
  
    // Iterate over all effects (web-component), and combines as many as possible. 
    // Convolution effects must sit on their own EffectPass. In order to preserve the correct effect order, 
    // the convolution effects separate all effects before and after into separate EffectPasses.
    const scene = this[$scene];
    let i = 0;
    while (i < effects.length) {
      const separateIndex = effects.slice(i).findIndex((effect) => effect[$requireSeparatePass] || isConvolution(effect));
      if (separateIndex != 0) {
        const effectPass = new EffectPass(scene.getCamera(), ...effects.slice(i, separateIndex == -1 ? effects.length : separateIndex))
        this[$effectComposer].addPass(effectPass);
      }
      
      if (separateIndex != -1) {
        const convolutionPass = new EffectPass(scene.getCamera(), effects[i + separateIndex]);
        this[$effectComposer].addPass(convolutionPass);
        i += separateIndex + 1;
      } else {
        break; // A convolution was not found, the first Effect pass contains all effects from i to effects.length
      }
    }
    // If there is no pass after the normal pass, then nothing will render on the screen.
    if (effects.length === 0 && this[$userEffectCount] === 0) {
      this[$addClearPass]();
    } else {
      this[$removeClearPass]();
    }
    scene.queueRender();
  }

  /**
   * Request a render-frame manually.
   */
  queueRender(): void {
    this[$scene].queueRender();
  }

  [$setSelection] = () => {
    // Place all meshes in the selection
    this[$effectComposer].updateCameraSettings();
    const scene = this[$scene];
    scene.traverse((obj) => {
      if (obj.type === 'Mesh') this[$selection].add(obj);
    });
    this.dispatchEvent(new CustomEvent('updatedSelection'));
  }

  [$requireNormals](effects: IMVEffect[]) {
    return effects.some((effect) => effect[$requireNormals]) || this.userPasses.some((pass) => (pass as any).requireNormals);
  }

  [$resetEffectPasses]() {
    this[$effectPasses].forEach((pass) => {
      this[$effectComposer].removePass(pass);
      disposeEffectPass(pass);
    });
  }

  [$removeClearPass]() {
    if (this[$effectComposer].passes.length > 2) {
      this[$effectComposer].removePass(this[$clearPass]);
    }
  }

  [$addClearPass]() {
    if (this[$effectComposer].passes.length === 2) {
      this[$effectComposer].addPass(this[$clearPass]);
    }
  }

  get[$scene]() {
    return this[$effectComposer].scene;
  }

  /**
   * Gets child effects
   */
  get[$effects](): IMVEffect[] {
    // iterate over all web-component children effects
    const effects: IMVEffect[] = [];
    for (let i = 0; i < this.children.length; i++) {
      const childEffect = this.children.item(i) as MVEffectBase;
      if (!childEffect[$effects]) continue;
      const childEffects = childEffect[$effects];
      if (childEffects) {
        effects.push(...childEffects.filter((effect) => !effect.disabled));
      }
    }
    return effects;
  }

  /**
   * Gets effectPasses of child effects
   */
  get[$effectPasses]() {
    return this[$effectComposer].passes.slice(2 + this[$userEffectCount]) as EffectPass[];
  }
}
