import {property} from 'lit/decorators.js';
import {SMAAEffect, SMAAPreset} from 'postprocessing';
import {$effects, $effectOptions} from '../model-effect-composer.js';
import {$mvEffectComposer, $updateProperties, MVEffectBase} from './mixins/effect-base.js';

export type SMAAQuality = 'low' | 'medium' | 'high' | 'ultra';
export type SMAAPresetQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export class MVSMAAEffect extends MVEffectBase {
  static get is() {
    return 'mv-smaa-effect';
  }

  @property({type: String, attribute: 'quality', reflect: true})
  quality: SMAAQuality = 'medium';

  constructor() {
    super();

    this[$effects] = [new SMAAEffect(this[$effectOptions])];
  }
 
  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('quality')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties]() {
    (this[$effects][0] as SMAAEffect).applyPreset(SMAAPreset[this.quality.toUpperCase() as SMAAPresetQuality] ?? SMAAPreset.MEDIUM);
    this[$mvEffectComposer].queueRender();
  }

  get[$effectOptions]() {
    return {
      preset: SMAAPreset[this.quality.toUpperCase() as SMAAPresetQuality] ?? SMAAPreset.MEDIUM,
    };
  }
}
