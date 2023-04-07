/* @license
 * Copyright 2023 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ReactiveElement } from 'lit';
import { EffectComposer as PPEffectComposer, EffectPass, NormalPass, RenderPass, Selection, Pass } from 'postprocessing';
import { disposeEffectPass, isConvolution, validateLiteralType } from './utilities.js';
import { ModelViewerElement } from '@google/model-viewer';
import { IMVEffect, IntegrationOptions, MVEffectBase } from './effects/mixins/effect-base.js';
import { ModelScene } from '@google/model-viewer/lib/three-components/ModelScene.js';
import { ACESFilmicToneMapping, Camera, HalfFloatType, ToneMapping, UnsignedByteType, WebGLRenderer } from 'three';
import { property } from 'lit/decorators.js';

export const $scene = Symbol('scene');
export const $composer = Symbol('composer');
export const $modelViewerElement = Symbol('modelViewerElement');
export const $effectComposer = Symbol('effectComposer');
export const $renderPass = Symbol('renderPass');
export const $normalPass = Symbol('normalPass');
export const $effectPasses = Symbol('effectsPass');
export const $requires = Symbol('requires');
export const $effects = Symbol('effects');
export const $selection = Symbol('selection');
export const $onSceneLoad = Symbol('onSceneLoad');
export const $resetEffectPasses = Symbol('resetEffectPasses');
export const $userEffectCount = Symbol('userEffectCount');
export const $tonemapping = Symbol('tonemapping');
const $updateProperties = Symbol('updateProperties');

/**
 * Light wrapper around {@link EffectComposer} for storing the `scene` and `camera
 * at a top level, and setting them for every {@link Pass} added.
 */
export class EffectComposer extends PPEffectComposer {
  public camera?: Camera;
  public scene?: ModelScene;
  public dirtyRender?: boolean;

  [$tonemapping]: ToneMapping = ACESFilmicToneMapping;

  constructor(
    renderer?: WebGLRenderer,
    options?: {
      depthBuffer?: boolean;
      stencilBuffer?: boolean;
      alpha?: boolean;
      multisampling?: number;
      frameBufferType?: number;
    }
  ) {
    super(renderer, options);
  }

  private preRender() {
    // the EffectComposer expects autoClear to be false so that buffers aren't cleared between renders
    // while the threeRenderer should be true so that the frames are cleared each render. 
    const renderer = this.getRenderer();
    renderer.autoClear = false;
    renderer.toneMapping = this[$tonemapping];
  }

  private postRender() {
    const renderer = this.getRenderer();
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.autoClear = true;
  }

  override render(deltaTime?: number | undefined): void {
    this.preRender();
    super.render(deltaTime);
    this.postRender();
  }

  /**
   * Adds a pass, optionally at a specific index.
   * Additionally sets `scene` and `camera`.
   * @param pass A new pass.
   * @param index An index at which the pass should be inserted.
   */
  override addPass(pass: Pass, index?: number): void {
    super.addPass(pass, index);
    this.refresh();
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
   * Effect Materials that use the camera need to be manually updated whenever the camera settings update.
   */
  refresh(): void {
    if (this.camera && this.scene) {
      super.setMainCamera(this.camera);
      super.setMainScene(this.scene);
    }
  }

  beforeRender(_time: DOMHighResTimeStamp, _delta: DOMHighResTimeStamp): void {
    if (this.dirtyRender) {
      this.scene?.queueRender();
    }
  }
}

export type MVPass = Pass & IntegrationOptions;

export const RENDER_MODES = ['performance', 'quality'] as const;
export type RenderMode = typeof RENDER_MODES[number]; 

const N_DEFAULT_PASSES = 2; // RenderPass, NormalPass

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
  @property({ type: String, attribute: 'render-mode' })
  renderMode: RenderMode = 'performance';

  /**
   * Anti-Aliasing using the MSAA algorithm. Doesn't work well with depth-based effects.
   *
   * Recommended to use with a factor of 2.
   * @default 0
   */
  @property({ type: Number, attribute: 'msaa' })
  msaa: number = 0;

  protected [$composer]?: EffectComposer;
  protected [$modelViewerElement]?: ModelViewerElement;
  protected [$renderPass]: RenderPass;
  protected [$normalPass]: NormalPass;
  protected [$selection]: Selection;
  protected [$userEffectCount]: number = 0;

  get [$effectComposer]() {
    if (!this[$composer]) throw new Error('The EffectComposer has not been instantiated yet. Please make sure the component is properly mounted on the Document within a <model-viewer> element.');
    return this[$composer];
  }

  /**
   * Array of custom {@link MVPass}'s added with {@link addPass}.
   */
  get userPasses(): MVPass[] {
    return this[$effectComposer].passes.slice(N_DEFAULT_PASSES, N_DEFAULT_PASSES + this[$userEffectCount]);
  }

  get modelViewerElement() {
    if (!this[$modelViewerElement]) throw new Error('<effect-composer> must be a child of a <model-viewer> component.');
    return this[$modelViewerElement];
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
   *
   * @warning The EffectComposer instance is created only on connection with the DOM,
   * so that the renderMode is properly taken into account. Do not interact with this class if it is not
   * mounted to the DOM.
   */
  constructor() {
    super();
    this[$renderPass] = new RenderPass();
    this[$normalPass] = new NormalPass();
    this[$selection] = new Selection();
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    if (this.parentNode?.nodeName.toLowerCase() === 'model-viewer') {
      this[$modelViewerElement] = this.parentNode as ModelViewerElement;
    }

    try {
      validateLiteralType(RENDER_MODES, this.renderMode);
    } catch(e) {
      console.error((e as Error).message + "\nrenderMode defaulting to: performance");
    }
    this[$composer] = new EffectComposer(undefined, {
      stencilBuffer: true,
      multisampling: this.msaa,
      frameBufferType: this.renderMode === 'quality' ? HalfFloatType : UnsignedByteType,
    });
    this.modelViewerElement.registerEffectComposer(this[$effectComposer]);
    this[$effectComposer].addPass(this[$renderPass], 0);
    this[$effectComposer].addPass(this[$normalPass], 1);
    
    this[$onSceneLoad]();
    this.modelViewerElement.addEventListener('before-render', this[$onSceneLoad]);
    this.updateEffects();
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();
    this.modelViewerElement.unregisterEffectComposer();
    this.modelViewerElement.removeEventListener('before-render', this[$onSceneLoad]);
    this[$effectComposer].dispose();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('msaa')) {
      this[$effectComposer].multisampling = this.msaa;
    }
    if (changedProperties.has('renderMode') && changedProperties.get('renderMode') !== undefined) {
      throw new Error('renderMode cannot be changed after startup.');
    }
  }

  /**
   * Adds a custom Pass that extends the {@link Pass} class.
   * All passes added through this method will be prepended before all other web-component effects.
   *
   * This method automatically sets the `mainScene` and `mainCamera` of the pass.
   * @param {Pass} pass Custom Pass to add. The camera and scene are set automatically.
   * @param {boolean} requireNormals Whether any effect in this pass uses the {@link normalBuffer}
   * @param {boolean} requireDirtyRender Enable this if the effect requires a render frame every frame. Significant performance impact from enabling this.
   */
  addPass(pass: Pass, requireNormals?: boolean, requireDirtyRender?: boolean): void {
    (pass as MVPass).requireNormals = requireNormals;
    (pass as MVPass).requireDirtyRender = requireDirtyRender;
    this[$effectComposer].addPass(pass, this[$userEffectCount] + N_DEFAULT_PASSES); // push after current userPasses, before any web-component effects.
    this[$userEffectCount]++;
    // Enable the normalPass and dirtyRendering if required by any effect.
    this[$updateProperties]();
  }

  /**
   * Removes and optionally disposes of a previously added Pass.
   * @param pass Custom Pass to remove
   * @param {Boolean} dispose Disposes of the Pass properties and effects. Default is `true`.
   */
  removePass(pass: Pass, dispose: boolean = true): void {
    if (!this[$effectComposer].passes.includes(pass)) throw new Error(`Pass ${pass.name} not found.`);
    this[$effectComposer].removePass(pass);
    if (dispose) pass.dispose();
    // Enable the normalPass and dirtyRendering if required by any effect.
    this[$updateProperties]();
    this[$userEffectCount]--;
  }

  /**
   * Updates all existing EffectPasses, adding any new `<model-viewer-effects>` Effects
   * in the order they were added, after any custom Passes added with {@link addPass}.
   *
   * Runs automatically whenever a new Effect is added.
   */
  updateEffects(): void {
    this[$resetEffectPasses]();

    // Iterate over all effects (web-component), and combines as many as possible.
    // Convolution effects must sit on their own EffectPass. In order to preserve the correct effect order,
    // the convolution effects separate all effects before and after into separate EffectPasses.
    const effects = this[$effects];
    let i = 0;
    while (i < effects.length) {
      const separateIndex = effects.slice(i).findIndex((effect) => effect.requireSeparatePass || isConvolution(effect));
      if (separateIndex != 0) {
        const effectPass = new EffectPass(undefined, ...effects.slice(i, separateIndex == -1 ? effects.length : separateIndex));
        this[$effectComposer].addPass(effectPass);
      }

      if (separateIndex != -1) {
        const convolutionPass = new EffectPass(undefined, effects[i + separateIndex]);
        this[$effectComposer].addPass(convolutionPass);
        i += separateIndex + 1;
      } else {
        break; // A convolution was not found, the first Effect pass contains all effects from i to effects.length
      }
    }

    // Enable the normalPass and dirtyRendering if required by any effect.
    this[$updateProperties]();

    this.queueRender();
  }

  /**
   * Request a render-frame manually.
   */
  queueRender(): void {
    this[$scene]?.queueRender();
  }

  get [$scene]() {
    return this[$effectComposer].scene;
  }

  /**
   * Gets child effects
   */
  get [$effects](): IMVEffect[] {
    // iterate over all web-component children effects
    const effects: IMVEffect[] = [];
    for (let i = 0; i < this.children.length; i++) {
      const childEffect = this.children.item(i) as MVEffectBase;
      if (!childEffect.effects) continue;
      const childEffects = childEffect.effects;
      if (childEffects) {
        effects.push(...childEffects.filter((effect) => !effect.disabled));
      }
    }
    return effects;
  }

  /**
   * Gets effectPasses of child effects
   */
  get [$effectPasses]() {
    return this[$effectComposer].passes.slice(N_DEFAULT_PASSES + this[$userEffectCount]) as EffectPass[];
  }

  [$onSceneLoad] = (): void => {
    this[$effectComposer].refresh();
    // Place all Geometries in the selection
    this[$selection].clear();
    this[$scene]?.traverse((obj) => obj.hasOwnProperty('geometry') && this[$selection].add(obj));
    this.dispatchEvent(new CustomEvent('updated-selection'));
  };

  [$updateProperties]() {
    this[$normalPass].enabled = this[$requires]('requireNormals');
    this[$normalPass].renderToScreen = false;
    this[$effectComposer].dirtyRender = this[$requires]('requireDirtyRender');
    this[$renderPass].renderToScreen = this[$effectComposer].passes.length === N_DEFAULT_PASSES;
  }

  [$requires](property: 'requireNormals' | 'requireSeparatePass' | 'requireDirtyRender'): boolean {
    return this[$effectComposer].passes.some(
      (pass: any) => pass[property] || (pass.effects && pass.effects.some((effect: IMVEffect) => effect[property]))
    );
  }

  [$resetEffectPasses](): void {
    this[$effectPasses].forEach((pass) => {
      this[$effectComposer].removePass(pass);
      disposeEffectPass(pass);
    });
  }
}
