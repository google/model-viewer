/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {Texture} from 'three';

import {Sampler as GLTFSampler} from '../../gltf-2.0.js';
import {createFakeThreeGLTF} from '../../test-helpers.js';

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';
import {ModelGraft} from './model-graft.js';
import {Sampler} from './sampler.js';

suite('facade/three-js/sampler', () => {
  suite('Sampler', () => {
    test('expresses Three.js texture wrap mode', () => {
      const texture = new Texture();
      texture.wrapS = 10497;
      texture.wrapT = 33071;

      const graft =
          new ModelGraft('', CorrelatedSceneGraph.from(createFakeThreeGLTF()));

      const gltfSampler: GLTFSampler = {
        wrapS: 10497,
        wrapT: 33071,
      };

      const sampler = new Sampler(graft, gltfSampler, new Set([texture]));

      const {wrapS, wrapT} = sampler.toJSON();

      expect(wrapS).to.be.undefined;
      expect(wrapT).to.be.equal(33071);
    });

    test('expresses Three.js texture filter', () => {
      const texture = new Texture();
      texture.minFilter = 9987;
      texture.magFilter = 9728;

      const graft =
          new ModelGraft('', CorrelatedSceneGraph.from(createFakeThreeGLTF()));

      const gltfSampler: GLTFSampler = {
        minFilter: 9987,
        magFilter: 9728,
      };

      const sampler = new Sampler(graft, gltfSampler, new Set([texture]));

      const {minFilter, magFilter} = sampler.toJSON();

      expect(minFilter).to.be.equal(9987);
      expect(magFilter).to.be.equal(9728);
    });
  });
});
