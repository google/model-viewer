import {property} from 'lit/decorators.js';
import {BlendFunction, OutlineEffect} from 'postprocessing';
import { Color } from 'three';
import {$effects, $effectOptions, $selection, $setSelection} from '../effect-composer.js';
import {$mvEffectComposer, $updateProperties, MVEffectBase} from './mixins/effect-base.js';
import { getKernelSize } from './utilities.js';

export class MVOutlineEffect extends MVEffectBase {
  static get is() {
    return 'outline-effect';
  }

  @property({type: String || Number, attribute: 'color', reflect: true})
  color: string | number = 'white';

  @property({type: Number, attribute: 'edge-strength', reflect: true})
  edgeStrength = 2;

  /**
   * 0-6
   */
  @property({type: Number, attribute: 'blur-strength', reflect: true})
  blurStrength = 0;

  constructor() {
    super();
    // @ts-expect-error scene and camera are optional as of `postprocessing@6.30.2`
    const outline = new OutlineEffect(undefined, undefined, this[$effectOptions]);
    this[$effects] = [outline];
  }
  
  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$setSelection]();
    this[$updateProperties]();
    this[$mvEffectComposer].addEventListener('updatedSelection', this[$setSelection]);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback && super.disconnectedCallback();
    this[$mvEffectComposer].removeEventListener('updatedSelection', this[$setSelection]);
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('color') || changedProperties.has('edge-strength') || changedProperties.has('blur-strength')) {
      this[$updateProperties]();
    }
  }
  
  [$updateProperties]() {
    (this[$effects][0] as OutlineEffect).edgeStrength = this.edgeStrength;
    (this[$effects][0] as OutlineEffect).visibleEdgeColor = new Color(this.color);
    (this[$effects][0] as OutlineEffect).hiddenEdgeColor = new Color(this.color);
    (this[$effects][0] as OutlineEffect).blurPass.enabled = Math.round(this.blurStrength) > 0;
    (this[$effects][0] as OutlineEffect).blurPass.kernelSize = getKernelSize(this.blurStrength);
    this[$mvEffectComposer].queueRender();
  }

  [$setSelection] = () => {
    (this[$effects][0] as OutlineEffect).selection.set(this[$mvEffectComposer][$selection].values());
  }

  get[$effectOptions]() {
    return {
      blendFunction: BlendFunction.SCREEN,
      edgeStrength: this.edgeStrength,
      pulseSpeed: 0.0,
      visibleEdgeColor: new Color(this.color).getHex(),
      hiddenEdgeColor: new Color(this.color).getHex(),
      blur: Math.round(this.blurStrength) > 0,
      kernelSize: getKernelSize(this.blurStrength),
      xRay: true,
    };
  }
}
