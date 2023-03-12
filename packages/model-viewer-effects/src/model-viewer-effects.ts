import { MVBloomEffect } from './effects/bloom.js';
import { MVColorGradeEffect } from './effects/color-grade.js';
import { MVFXAAEffect } from './effects/fxaa.js';
import { MVGlitchEffect } from './effects/glitch.js';
import { MVOutlineEffect } from './effects/outline.js';
import { MVPixelateEffect } from './effects/pixelate.js';
import { MVSMAAEffect } from './effects/smaa.js';
import { MVSSAOEffect } from './effects/ssao.js';
import { MVEffectComposer } from './model-effect-composer.js';

customElements.define('mv-effects-composer', MVEffectComposer);
customElements.define('mv-pixelate-effect', MVPixelateEffect);
customElements.define('mv-bloom-effect', MVBloomEffect);
customElements.define('mv-color-grade-effect', MVColorGradeEffect);
customElements.define('mv-outline-effect', MVOutlineEffect);
customElements.define('mv-smaa-effect', MVSMAAEffect);
customElements.define('mv-fxaa-effect', MVFXAAEffect);
customElements.define('mv-ssao-effect', MVSSAOEffect);
customElements.define('mv-glitch-effect', MVGlitchEffect);

declare global {
  interface HTMLElementTagNameMap {
    'mv-effects-composer': MVEffectComposer;
    'mv-pixelate-effect': MVPixelateEffect;
    'mv-bloom-effect': MVBloomEffect;
    'mv-color-grade-effect': MVColorGradeEffect;
    'mv-outline-effect': MVOutlineEffect;
    'mv-smaa-effect': MVSMAAEffect;
    'mv-fxaa-effect': MVFXAAEffect;
    'mv-ssao-effect': MVSSAOEffect;
    'mv-glitch-effect': MVGlitchEffect;
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
};
