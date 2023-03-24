import { property } from 'lit/decorators.js';
import { BlendFunction, OutlineEffect } from 'postprocessing';
import { Color } from 'three';
import { $selection, $setSelection } from '../effect-composer.js';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';
import { getKernelSize, TEMP_CAMERA } from './utilities.js';

export class MVOutlineEffect extends MVEffectBase {
  static get is() {
    return 'outline-effect';
  }

  /**
   * String or RGB Color #-hexadecimal.
   * @default 'white'
   */
  @property({ type: String || Number, attribute: 'color', reflect: true })
  color: string | number = 'white';

  /**
   * A larger value denotes a thicker edge.
   */
  @property({ type: Number, attribute: 'strength', reflect: true })
  strength = 2;

  /**
   * Value in the range of (0, 6). Controls the edge blur strength.
   * @default 1
   */
  @property({ type: Number, attribute: 'smoothing', reflect: true })
  smoothing = 1;

  constructor() {
    super();
    // @ts-expect-error scene and camera are optional as of `postprocessing@6.30.2`
    this.effects = [new OutlineEffect(undefined, TEMP_CAMERA, this[$effectOptions])];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$setSelection]();
    this[$updateProperties]();
    this.effectComposer.addEventListener('updatedSelection', this[$setSelection]);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback && super.disconnectedCallback();
    this.effectComposer.removeEventListener('updatedSelection', this[$setSelection]);
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

  [$setSelection] = () => {
    (this.effects[0] as OutlineEffect).selection.set(this.effectComposer[$selection].values());
  };

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
    } as ConstructorParameters<typeof OutlineEffect>[2];
  }
}
