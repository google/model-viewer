/* @license
 * Copyright 2026 Google LLC. All Rights Reserved.
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

import {ModelViewerElement} from '@google/model-viewer';
import {expect} from 'chai';
import {GlitchEffect as PPGlitchEffect, GlitchMode as PPGlitchMode} from 'postprocessing';

import type {GlitchMode} from '../../effects/glitch.js';
import {EffectComposer, GlitchEffect} from '../../model-viewer-effects.js';

suite('Glitch Effect', () => {
  let element: ModelViewerElement;
  let composer: EffectComposer;
  let glitch: GlitchEffect;
  let originalConsoleError: typeof console.error;
  let errorLogs: string[];

  setup(async () => {
    errorLogs = [];
    originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      errorLogs.push(args.map(String).join(' '));
    };

    element = new ModelViewerElement();
    composer = new EffectComposer();
    glitch = new GlitchEffect();
    composer.appendChild(glitch);
    element.appendChild(composer);
    document.body.appendChild(element);
    await glitch.updateComplete;
  });

  teardown(() => {
    console.error = originalConsoleError;
    document.body.removeChild(element);
  });

  test('logs fallback hint and resets mode to sporadic when invalid', async () => {
    glitch.mode = 'INVALID' as GlitchMode;
    await glitch.updateComplete;
    await glitch.updateComplete;

    expect(errorLogs).to.deep.equal([
      'Validation Error: invalid is not a valid value. Expected sporadic | constant\nmode defaulting to \'sporadic\'',
    ]);
    expect(glitch.mode).to.equal('sporadic');
    expect(glitch.getAttribute('mode')).to.equal('sporadic');
    expect((glitch.effects[0] as PPGlitchEffect).mode)
        .to.equal(PPGlitchMode.SPORADIC);

    glitch.strength = 0.25;
    await glitch.updateComplete;
    expect(errorLogs).to.have.lengthOf(1);
  });

  test(
      'applies valid modes case-insensitively without logging errors',
      async () => {
        glitch.mode = 'CONSTANT' as GlitchMode;
        await glitch.updateComplete;
        await glitch.updateComplete;

        expect(errorLogs).to.be.empty;
        expect(glitch.mode).to.equal('constant');
        expect((glitch.effects[0] as PPGlitchEffect).mode)
            .to.equal(PPGlitchMode.CONSTANT_WILD);

        glitch.strength = 0;
        await glitch.updateComplete;
        expect((glitch.effects[0] as PPGlitchEffect).mode)
            .to.equal(PPGlitchMode.CONSTANT_MILD);
      });
});
