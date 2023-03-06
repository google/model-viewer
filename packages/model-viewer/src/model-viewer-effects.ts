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
import {property} from 'lit/decorators.js';
import { Effect, EffectComposer, EffectPass, PixelationEffect, RenderPass } from 'postprocessing';
import { $needsRender, $scene } from './model-viewer-base.js';
import { ModelViewerElement } from './model-viewer.js';
import {ModelScene} from './three-components/ModelScene.js';
import { Renderer } from './three-components/Renderer.js';

export const $modelViewerElement = Symbol('modelViewerElement')
export const $effectComposer = Symbol('effectComposer');
export const $renderPass = Symbol('renderPass');
export const $effectsPass = Symbol('effectsPass');
export const $effects = Symbol('effects');
export const $effect = Symbol('effect');

export class ModelViewerEffectComposer extends ReactiveElement {
  static get is() {
    return 'mv-effect-composer';
  }

  protected[$effectComposer]: EffectComposer;
  protected[$renderPass]: RenderPass;
  protected[$effectsPass]: EffectPass;

  /**
   * Creates a new ModelViewerElement.
   */
  constructor() {
    super();

    this.attachShadow({mode: 'open'});

    if (this[$modelViewerElement].nodeName.toLowerCase() !== 'model-viewer' || !this[$scene]) throw new Error('<mv-effect-composer> must be a child of a <model-viewer> component.')

    this[$effectComposer] = new EffectComposer(Renderer.singleton.threeRenderer);
    this[$renderPass] = new RenderPass(this[$scene], this[$scene].getCamera());
    this[$effectComposer].addPass(this[$renderPass]);
    this[$effectsPass] = new EffectPass(this[$scene].getCamera());
  }

  connectedCallback(): void {
    this[$modelViewerElement].registerEffectsComposer(this[$effectComposer]);
  }

  disconnectedCallback() {
    this[$modelViewerElement].unregisterEffectsComposer();
    this[$effectComposer].dispose();
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('effect')) {
      this.addEffect(changedProperties.get('effect'))
    }
  }

  addEffect(effect: Effect): void {
    this[$effectComposer].removePass(this[$effectsPass]);
    this[$effectsPass] = new EffectPass(this[$scene].getCamera(), ...this[$effects], effect)
    this[$effectComposer].addPass(this[$effectsPass]);
  }

  updateEffects(): void {
    this[$effectComposer].removePass(this[$effectsPass]);
    this[$effectsPass] = new EffectPass(this[$scene].getCamera(), ...this[$effects])
    this[$effectComposer].addPass(this[$effectsPass]);
    this[$modelViewerElement][$needsRender]();
  }

  get[$scene](): ModelScene {
    return this[$modelViewerElement][$scene];
  }

  get[$modelViewerElement](): ModelViewerElement {
    return (this.parentNode as ModelViewerElement);
  }

  get[$effects](): Effect[] { 
      const effects: Effect[] = [];
      for (let i = 0; i < this.children.length; i++) {
          const effect: Effect | undefined = (this.children.item(i) as any | null)[$effect];
          if (effect) {
              effects.push(effect);
          }
      }
      return effects;
  }
}
  

export class ModelViewerPixelateEffect extends ReactiveElement {
  static get is() {
    return 'mv-pixelate-effect';
  }

  @property({type: Number, attribute: 'granularity'})
  granularity: number = 30.0;

  protected[$effect]: PixelationEffect;

  /**
   * Creates a new ModelViewerElement.
   */
  constructor() {
    super();

    this[$effect] = new PixelationEffect(this.granularity);
  }

  disconnectedCallback() {
    this[$effect].dispose();
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('granularity')) {
      this[$effect].dispose();
      this[$effect] = new PixelationEffect(this.granularity);
      (this.parentNode as ModelViewerEffectComposer).updateEffects();
    }
  }
}