import { MVBloomEffect } from './effects/bloom.js';
import { MVColorGradeEffect } from './effects/color-grade.js';
import { MVFXAAEffect } from './effects/fxaa.js';
import { MVGlitchEffect } from './effects/glitch.js';
import { MVOutlineEffect } from './effects/outline.js';
import { MVPixelateEffect } from './effects/pixelate.js';
import { MVSMAAEffect } from './effects/smaa.js';
import { MVSSAOEffect } from './effects/ssao.js';
import { MVEffectComposer } from './effect-composer.js';
import { MVEffectBase } from './effects/mixins/effect-base.js';

customElements.define('effect-composer', MVEffectComposer);
customElements.define('pixelate-effect', MVPixelateEffect);
customElements.define('bloom-effect', MVBloomEffect);
customElements.define('color-grade-effect', MVColorGradeEffect);
customElements.define('outline-effect', MVOutlineEffect);
customElements.define('smaa-effect', MVSMAAEffect);
customElements.define('fxaa-effect', MVFXAAEffect);
customElements.define('ssao-effect', MVSSAOEffect);
customElements.define('glitch-effect', MVGlitchEffect);

declare global {
  interface HTMLElementTagNameMap {
    'effect-composer': MVEffectComposer;
    'pixelate-effect': MVPixelateEffect;
    'bloom-effect': MVBloomEffect;
    'color-grade-effect': MVColorGradeEffect;
    'outline-effect': MVOutlineEffect;
    'smaa-effect': MVSMAAEffect;
    'fxaa-effect': MVFXAAEffect;
    'ssao-effect': MVSSAOEffect;
    'glitch-effect': MVGlitchEffect;
  }
}

export {
  MVEffectComposer,
  MVPixelateEffect,
  MVBloomEffect,
  MVColorGradeEffect,
  MVOutlineEffect,
  MVSMAAEffect,
  MVFXAAEffect,
  MVSSAOEffect,
  MVGlitchEffect,
  MVEffectBase,
};
