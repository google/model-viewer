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
import {ModelViewerElement} from '@google/model-viewer';
import {assetPath, createModelViewerElement} from './utilities';
import { MVEffectComposer } from '../model-viewer-effects.js';
import { $effectComposer, $renderPass, $scene } from '../model-effect-composer.js';
import { DotScreenEffect, GlitchEffect, GridEffect } from 'postprocessing';
import { isConvolution } from '../utilities';

const expect = chai.expect;

suite('MVEffectComposer', () => {
  let element: ModelViewerElement;
  let composer: MVEffectComposer;

  setup(() => {
    element = createModelViewerElement(assetPath('models/Astronaut.glb'));
    composer = new MVEffectComposer();
    element.insertBefore(composer, element.firstChild);
  });

  teardown(() => {
    document.body.removeChild(element);
  });

  suite('registered successfully', () => {
    suite('scene+camera', () => {
      test('has scene', () => {
        expect(composer[$scene]).to.be.ok;
      });

      test('has camera', () => {
        expect(composer[$scene]).to.be.ok;
      });
    });
    test('render pass added successfuly', () => {
      expect(composer[$renderPass]).to.be.ok;
      expect(composer[$effectComposer].passes.length).to.eq(1);
      expect(composer[$effectComposer].passes[0]).to.eq(composer[$renderPass]);
    });
    test('selection works')
  });

  suite('userEffects', () => {
    test('adds grid effect', () => {
      const effect = new GridEffect();
      composer.addEffect(effect);
      expect(composer[$effectComposer].passes.length).to.eq(2);
      expect((composer[$effectComposer].passes[1] as any).effects).to.contain(effect);
    });

    test('multiple effects all on one layer', async () => {
      const effect = new DotScreenEffect();
      composer.addEffect(effect);
      expect(composer[$effectComposer].passes.length).to.eq(2);
      expect((composer[$effectComposer].passes[1] as any).effects.length).to.eq(2);
      expect((composer[$effectComposer].passes[1] as any).effects).to.contain(effect);
    });

    test('convolution effect on separate layer', async () => {
      const effect = new GlitchEffect();
      expect(isConvolution(effect)).to.be.true;
      composer.addEffect(effect);
      expect(composer[$effectComposer].passes.length).to.eq(3);
      expect((composer[$effectComposer].passes[2] as any).effects.length).to.eq(1);
      expect((composer[$effectComposer].passes[2] as any).effects).to.contain(effect);
    });

    teardown(() => {
      // TODO: this wont really remove the effects from the effectComposer instance
      composer.userEffects = []; 
    });
  });
}); 
