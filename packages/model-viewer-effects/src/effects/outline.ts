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

import { property } from 'lit/decorators.js';
import { BlendFunction, OutlineEffect } from 'postprocessing';
import { Color, ColorRepresentation } from 'three';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';
import { SelectiveMixin } from './mixins/selective.js';
import { getKernelSize, TEMP_CAMERA } from './utilities.js';

export class MVOutlineEffect extends SelectiveMixin(MVEffectBase) {
  static get is() {
    return 'outline-effect';
  }

  /**
   * String or RGB #-hexadecimal Color.
   * @default 'white'
   */
  @property({ type: String || Number, attribute: 'color', reflect: true })
  color: ColorRepresentation = 'white';

  /**
   * A larger value denotes a thicker edge.
   * @default 1
   */
  @property({ type: Number, attribute: 'strength', reflect: true })
  strength = 1;

  /**
   * Value in the range of (0, 6). Controls the edge blur strength.
   * @default 1
   */
  @property({ type: Number, attribute: 'smoothing', reflect: true })
  smoothing = 1;

  constructor() {
    super();
    this.effects = [new OutlineEffect(undefined, TEMP_CAMERA, this[$effectOptions])];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('color') || changedProperties.has('smoothing') || changedProperties.has('strength')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties]() {
    (this.effects[0] as OutlineEffect).edgeStrength = this.strength;
    (this.effects[0] as OutlineEffect).visibleEdgeColor = new Color(this.color);
    (this.effects[0] as OutlineEffect).hiddenEdgeColor = new Color(this.color);
    (this.effects[0] as OutlineEffect).blurPass.enabled = Math.round(this.smoothing) > 0;
    (this.effects[0] as OutlineEffect).blurPass.kernelSize = getKernelSize(this.smoothing);
    this.effectComposer.queueRender();
  }

  get [$effectOptions]() {
    return {
      blendFunction: BlendFunction.SCREEN,
      edgeStrength: this.strength,
      pulseSpeed: 0.0,
      visibleEdgeColor: new Color(this.color).getHex(),
      hiddenEdgeColor: new Color(this.color).getHex(),
      blur: Math.round(this.smoothing) > 0,
      kernelSize: getKernelSize(this.smoothing),
      xRay: true,
      resolutionScale: 1,
    } as ConstructorParameters<typeof OutlineEffect>[2];
  }
}
