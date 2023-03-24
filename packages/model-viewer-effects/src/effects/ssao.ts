import { SSAOEffect } from 'postprocessing';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';
import { property } from 'lit/decorators.js';
import { TEMP_CAMERA } from './utilities.js';

export class MVSSAOEffect extends MVEffectBase {
  static get is() {
    return 'ssao-effect';
  }

  /**
   * The strength of the shadow occlusions. Higher value means darker shadows.
   */
  @property({ type: Number, attribute: 'strength', reflect: true })
  strength: number = 2;

  constructor() {
    super();
    // @ts-expect-error scene and camera are optional as of `postprocessing@6.30.2`
    this.effects = [new SSAOEffect(TEMP_CAMERA, undefined, this[$effectOptions])];
    this.effects[0].requireNormals = true;
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this['setDefaultProperties']();
    this[$updateProperties]();
  }

  update(changedProperties: Map<string | number | symbol, any>): void {
    super.update && super.update(changedProperties);
    if (changedProperties.has('strength')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties](): void {
    (this.effects[0] as SSAOEffect).intensity = this.strength;
    this.effectComposer.queueRender();
  }

  setDefaultProperties() {
    (this.effects[0] as SSAOEffect).ssaoMaterial.normalBuffer = this.effectComposer.normalBuffer;
    (this.effects[0] as any).depthDownsamplingPass.fullscreenMaterial.normalBuffer = this.effectComposer.normalBuffer;
  }

  get [$effectOptions]() {
    return {
      worldDistanceThreshold: 1000,
      worldDistanceFalloff: 1000,
      worldProximityThreshold: 1000,
      worldProximityFalloff: 1000,
      luminanceInfluence: 0.7,
      samples: 16,
      fade: 0.05,
      radius: 0.05,
      intensity: this.strength,
    } as ConstructorParameters<typeof SSAOEffect>[2];
  }
}
