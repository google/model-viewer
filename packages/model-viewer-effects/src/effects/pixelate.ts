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
import { PixelationEffect } from 'postprocessing';
import { $updateProperties, MVEffectBase } from './mixins/effect-base.js';

export class MVPixelateEffect extends MVEffectBase {
  static get is() {
    return 'pixelate-effect';
  }

  /**
   * The pixel granularity. Higher value = lower resolution.
   * @default 10
   */
  @property({ type: Number, attribute: 'granularity', reflect: true })
  granularity = 10.0;

  constructor() {
    super();

    this.effects = [new PixelationEffect(this.granularity)];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('granularity')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties]() {
    (this.effects[0] as PixelationEffect).granularity = this.granularity;
    this.effectComposer.queueRender();
  }
}
