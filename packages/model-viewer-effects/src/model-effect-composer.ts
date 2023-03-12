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
import {Effect, EffectComposer, EffectPass, NormalPass, RenderPass, Selection, EffectAttribute, Pass} from 'postprocessing';
import {isConvolution} from './utilities.js';
import {ModelViewerElement} from '@google/model-viewer';
import {$requireNormals, $requireSeparatePass, IMVEffect, MVEffectBase} from './effects/effect-base.js';
import {ModelScene} from '@google/model-viewer/lib/three-components/ModelScene.js';
import { Camera, HalfFloatType, UnsignedByteType, WebGLRenderer } from 'three';
import { property } from 'lit/decorators.js';

export const $scene = Symbol('scene');

export const $effectOptions = Symbol('effectOptions');
export const $effectComposer = Symbol('effectComposer');
export const $renderPass = Symbol('renderPass');
export const $normalPass = Symbol('normalPass');
export const $effectPasses = Symbol('effectsPass');
export const $effects = Symbol('effects');
export const $selection = Symbol('selection');
export const $setSelection = Symbol('setSelection');
export const $resetEffectPasses = Symbol('resetEffectPasses');

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

    setMainCamera(camera: Camera): void {
      this.camera = camera;
      super.setMainCamera(camera);
    }

    setMainScene(scene: ModelScene): void {
      this.scene = scene;
      super.setMainScene(scene);
    }
}

export type RenderMode = 'performance' | 'quality';

export class MVEffectComposer extends ReactiveElement {
  static get is() {
    return 'mv-effect-composer';
  }

  /**
   * 'quality' | 'performance'. Changing this after the element was constructed has no effect.
   * @default 'quality'
   */
  @property({type: String, attribute: 'render-mode', noAccessor: true})
  readonly renderMode: RenderMode = 'quality';

  protected readonly [$effectComposer]: EffectRenderer;
  protected readonly [$renderPass]: RenderPass;
  protected readonly [$normalPass]: NormalPass;
  protected readonly [$selection]: Selection;
  protected[$effectPasses]: Pass[] = [];

  /**
   * Array to store user added {@link Effect}'s not made using the web-component API.
   */
  userEffects: IMVEffect[] = [];
  
  /**
   * Array to store user added {@link Pass}'s not made using the web-component API.
   */
  userPasses: Pass[] = [];

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
   */
  constructor() {
    super();
    // The modelViewer element sets the renderer on registering.
    this[$effectComposer] = new EffectRenderer(undefined, {
      frameBufferType: this.renderMode === 'quality' ? HalfFloatType : UnsignedByteType
    });
    this[$renderPass] = new RenderPass();
    // @ts-expect-error they are allowed to be undefined
    this[$normalPass] = new NormalPass();
    this[$selection] = new Selection();
  }

  connectedCallback(): void {
    if (this.modelViewerElement.nodeName.toLowerCase() !== 'model-viewer') {
      throw new Error('<mv-effect-composer> must be a child of a <model-viewer> component.');
    }
    this.modelViewerElement.registerEffectsComposer(this[$effectComposer]);
    this[$renderPass].mainScene = this[$effectComposer].scene;
    this[$renderPass].mainCamera = this[$effectComposer].camera;
    this[$normalPass].mainScene = this[$effectComposer].scene;
    this[$normalPass].mainCamera = this[$effectComposer].camera;
    this[$effectComposer].addPass(this[$renderPass], 0);
    this[$setSelection]();
    this.modelViewerElement.addEventListener('beforeRender', this[$setSelection]);
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();
    this.modelViewerElement.unregisterEffectsComposer();
    this.modelViewerElement.removeEventListener('beforeRender', this[$setSelection]);
    this[$effectComposer].dispose();
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
  }

  /**
   * Adds a custom Pass that extends the {@link Pass} class. All passes added through this method will be appended before all other passes, except the render pass.
   * @param {Pass} pass Custom Pass to add. The camera and scene are set automatically. 
   */
  addEffectPass(pass: Pass) {
    pass.mainCamera = this[$effectComposer].camera;
    pass.mainScene = this[$scene];
    this.userPasses.push(pass);
    this.updateEffects();
  }

  /**
   * Adds a custom effect that extends the {@link Effect} class. All effects added through this method will be appended after all web-component effects and {@link userPasses}.
   * @param {Effect} effect The effect instance to add. The camera and scene are set automatically.
   * @param {Boolean} requireNormals Set this to true if your Effect uses the {@link normalBuffer} provided by this component.
   * @param {Boolean} requireSeparatePass Whether to place the effect on a separate pass. This is automatically enabled for effects with {@link EffectAttribute.CONVOLUTION}
   */
  addEffect(effect: Effect, requireNormals: boolean = false, requireSeparatePass: boolean = false): void {
    effect.mainCamera = this[$scene].getCamera();
    effect.mainScene = this[$scene];
    this.userEffects.push({
      [$effects]: [effect],
      [$requireNormals]: requireNormals,
      [$requireSeparatePass]: isConvolution(effect) ?? requireSeparatePass,
    })
    this.updateEffects();
  }

  /**
   * Updates all existing EffectPasses, adding any new web-component or user-added effects and passes.
   * The order is:
   * 1. All {@link userPasses} in the order they were added.
   * 2. All web-component effects in the order they were added.
   * 3. All {@link userEffects} in the order they were added.
   */
  updateEffects(): void {
    this[$resetEffectPasses]();

    const effects = this[$effects];
    // Insert the NormalPass directly after the render pass, but only if required.
    if (this[$requireNormals](effects)) this[$effectComposer].addPass(this[$normalPass], 1);
    
    // Add any new userPasses
    this.userPasses.forEach((pass) => {
      if (!this[$effectComposer].passes.includes(pass)) this[$effectComposer].addPass(pass);
    })
    
    // Iterate over all effects (both web-component and userEffects), and combines as many as possible. 
    // Convolution effects must sit on their own EffectPass. In order to preserve the correct effect order, 
    // the convolution effects separate all effects before and after into separate EffectPasses.
    const scene = this[$scene];
    let i = 0;
    const effectsArr = effects.flatMap((effect) => effect[$effects])
    while (i < effects.length) {
      const separateIndex = effects.slice(i).findIndex((effect) => effect[$requireSeparatePass] || isConvolution(effect[$effects][0]));
      if (separateIndex != 0) {
        const effectPass = new EffectPass(scene.getCamera(), ...effectsArr.slice(i, separateIndex == -1 ? effects.length : separateIndex))
        this[$effectPasses].push(effectPass);
        this[$effectComposer].addPass(effectPass);
      }
      
      if (separateIndex != -1) {
        const convolutionPass = new EffectPass(scene.getCamera(), effectsArr[i + separateIndex]);
        this[$effectPasses].push(convolutionPass);
        this[$effectComposer].addPass(convolutionPass);
        i += separateIndex + 1;
      } else {
        break; // A convolution was not found, the first Effect pass contains all effects from i to effects.length
      }
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
    const scene = this[$scene];
    scene.traverse((obj) => {
      if (obj.type === 'Mesh') this[$selection].add(obj);
    });
    this.dispatchEvent(new CustomEvent('updatedSelection'));
  }

  [$requireNormals](effects: IMVEffect[]) {
    return effects.some((effect) => effect[$requireNormals]);
  }

  [$resetEffectPasses]() {
    this[$effectPasses].forEach((pass) => {
      this[$effectComposer].removePass(pass);
      pass.dispose();
    });
    this[$effectPasses] = [];
    this[$effectComposer].removePass(this[$normalPass]);
  }

  get[$scene]() {
    return this[$effectComposer].scene;
  }

  get[$effects](): IMVEffect[] {
    // iterate over all web-component children effects
    const effects: IMVEffect[] = [];
    for (let i = 0; i < this.children.length; i++) {
      const childEffect = this.children.item(i) as MVEffectBase|null;
      if (!childEffect || !childEffect.enabled) continue;
      const childEffects = childEffect[$effects];
      if (childEffects) {
        effects.push(...childEffects.map((effect): IMVEffect => {
          return {
            [$effects]: [effect],
            [$requireNormals]: childEffect[$requireNormals],
            [$requireSeparatePass]: childEffect[$requireSeparatePass],
          }
        }));
      }
    }
    // add all userEffects
    effects.push(...this.userEffects);
    return effects;
  }
}
