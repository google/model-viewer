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

import {Texture as ThreeTexture} from 'three';

import {Texture as GLTFTexture} from '../../gltf-2.0.js';
import {createFakeThreeGLTF} from '../../test-helpers.js';

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';
import {ModelGraft} from './model-graft.js';
import {Texture} from './texture.js';

suite('facade/three-js/texture', () => {
  suite('Texture', () => {
    test('can be realized from a Three.js texture', () => {
      const texture = new ThreeTexture();

      const graft =
          new ModelGraft('', CorrelatedSceneGraph.from(createFakeThreeGLTF()));

      const gltfTexture: GLTFTexture = {};

      expect(new Texture(graft, gltfTexture, new Set([texture]))).to.be.ok;
    });
  });
});
