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

import {expect} from '@esm-bundle/chai';
import {ModelViewerElement} from '@google/model-viewer';
import {DotScreenEffect, Effect, EffectPass, GridEffect} from 'postprocessing';
import {Camera} from 'three';

import {$effectComposer, $normalPass, $renderPass, $scene} from '../effect-composer.js';
import {EffectComposer} from '../model-viewer-effects.js';

import {assetPath, createModelViewerElement, waitForEvent} from './utilities.js';

suite('MVEffectComposer', () => {
  let element: ModelViewerElement;
  let composer: EffectComposer;

  setup(async () => {
    element = createModelViewerElement(assetPath('models/Astronaut.glb'));
    composer = new EffectComposer();
    element.insertBefore(composer, element.firstChild);
    await waitForEvent(element, 'before-render');
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
    suite('passes, selection', () => {
      test('renderPass + normalPass added successfuly', () => {
        expect(composer[$renderPass]).to.be.ok;
        expect(composer[$normalPass]).to.be.ok;
        expect(composer[$effectComposer].passes.length).to.eq(2);
        expect(composer[$effectComposer].passes[0])
            .to.eq(composer[$renderPass]);
        expect(composer[$effectComposer].passes[1])
            .to.eq(composer[$normalPass]);
        expect(composer[$normalPass].enabled).to.be.false;
        expect(composer[$normalPass].renderToScreen).to.be.false;
        expect((composer[$renderPass] as any).scene).to.eq(composer[$scene]);
      });

      test('selection finds Meshes', () => {
        expect(composer.selection.size).to.be.greaterThan(0);
      });
    });
  });

  suite('userEffects', () => {
    let pass: EffectPass;
    let effects: Effect[] = [];
    test('adds grid effect', () => {
      const effect = new GridEffect();
      effects.push(effect);
      pass = new EffectPass(composer[$scene]?.camera as Camera, ...effects);
      composer.addPass(pass);
      expect(composer[$effectComposer].passes.length).to.eq(3);
      expect(composer[$effectComposer].passes[2]).to.eq(pass);
      expect((composer[$effectComposer].passes[2] as any).effects)
          .to.contain(effect);

      composer.removePass(pass, false);
    });

    test('multiple effects all on one layer', async () => {
      const effect = new DotScreenEffect();
      effects.push(effect);
      pass = new EffectPass(composer[$scene]?.camera as Camera, ...effects);
      composer.addPass(pass);
      expect(composer[$effectComposer].passes.length).to.eq(3);
      expect(composer[$effectComposer].passes[2]).to.eq(pass);
      expect((composer[$effectComposer].passes[2] as any).effects.length)
          .to.eq(2);
      expect((composer[$effectComposer].passes[2] as any).effects)
          .to.contain(effect);

      composer.removePass(pass, false);
    });
  });
});
