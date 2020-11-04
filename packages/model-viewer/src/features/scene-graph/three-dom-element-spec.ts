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


import {Material} from 'three';
import {Object3D} from 'three/src/core/Object3D.js';

import {CorrelatedSceneGraph} from '../../three-components/gltf-instance/correlated-scene-graph.js';
import {ModelGraft} from './model-graft.js';
import {createFakeThreeGLTF} from './test-helpers.js';
import {ThreeDOMElement} from './three-dom-element.js';

const expect = chai.expect;

suite('facade/three-js/three-dom-element', () => {
  suite('ThreeDOMElement', () => {
    test('has a reference to a Model', () => {
      const graft =
          new ModelGraft(CorrelatedSceneGraph.from(createFakeThreeGLTF()));
      const object3D = new Object3D();
      const element = new ThreeDOMElement(graft, {}, new Set([object3D]));
      expect(element.ownerModel).to.be.equal(graft.model);
    });

    suite('names', () => {
      test('ignores a Three.js-generated name', () => {
        const graft =
            new ModelGraft(CorrelatedSceneGraph.from(createFakeThreeGLTF()));
        const object3D = new Object3D();

        object3D.name = 'generated';

        const element = new ThreeDOMElement(graft, {}, new Set([object3D]));
        expect(element.name).to.be.equal(null);
      });

      test('expresses a name for a Three.js Material', () => {
        const graft =
            new ModelGraft(CorrelatedSceneGraph.from(createFakeThreeGLTF()));
        const material = new Material();
        const name = 'original';

        material.name = name;

        const element = new ThreeDOMElement(graft, {name}, new Set([material]));
        expect(element.name).to.be.equal(name);
      });
    });
  });
});
