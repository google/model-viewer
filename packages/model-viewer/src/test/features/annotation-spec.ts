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

import {Vector3} from 'three';

import {AnnotationInterface, AnnotationMixin, Hotspot} from '../../features/annotation';
import ModelViewerElementBase, {$scene} from '../../model-viewer-base';
import {ModelScene} from '../../three-components/ModelScene';
import {timePasses} from '../helpers';
import {BasicSpecTemplate} from '../templates';

const expect = chai.expect;

const sceneContainsHotspot =
    (scene: ModelScene, element: HTMLElement): boolean => {
      const {children} = scene.pivot;
      for (let i = 0, l = children.length; i < l; i++) {
        const hotspot = children[i];
        if (hotspot instanceof Hotspot &&
            (hotspot.element.children[0] as HTMLSlotElement).name ===
                element.slot) {
          // expect it has been changed from default
          expect(hotspot.position).to.not.eql(new Vector3());
          expect(hotspot.normal).to.not.eql(new Vector3(0, 1, 0));
          return true;
        }
      }
      return false;
    };

suite('ModelViewerElementBase with AnnotationMixin', () => {
  let nextId = 0;
  let tagName: string;
  let ModelViewerElement:
      Constructor<ModelViewerElementBase&AnnotationInterface>;
  let element: ModelViewerElementBase&AnnotationInterface;
  let scene: ModelScene;

  setup(() => {
    tagName = `model-viewer-annotation-${nextId++}`;
    ModelViewerElement = class extends AnnotationMixin
    (ModelViewerElementBase) {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);
    element = new ModelViewerElement();
    document.body.appendChild(element);
    scene = element[$scene];
  });

  BasicSpecTemplate(() => ModelViewerElement, () => tagName);

  suite('a model-viewer element with a hotspot', () => {
    let hotspot: HTMLElement;
    let numSlots: number;

    setup(async () => {
      hotspot = document.createElement('div');
      hotspot.setAttribute('slot', 'hotspot-1');
      hotspot.setAttribute('data-position', '1m 1m 1m');
      hotspot.setAttribute('data-normal', '1m 0m 0m');
      element.appendChild(hotspot);
      await timePasses();
      numSlots = scene.pivot.children.length;
    });

    test('creates a corresponding slot', () => {
      expect(sceneContainsHotspot(scene, hotspot)).to.be.true;
    });

    suite('adding a second hotspot with the same name', () => {
      let hotspot2: HTMLElement;

      setup(async () => {
        hotspot2 = document.createElement('div');
        hotspot2.setAttribute('slot', 'hotspot-1');
        hotspot2.setAttribute('data-position', '1m 1m 1m');
        hotspot2.setAttribute('data-normal', '1m 0m 0m');
        element.appendChild(hotspot2);
        await timePasses();
      });

      test('does not change the slot', () => {
        expect(scene.pivot.children.length).to.be.equal(numSlots);
      });

      test('and removing it does not remove the slot', async () => {
        hotspot.remove();
        await timePasses();

        expect(scene.pivot.children.length).to.be.equal(numSlots);
      });

      test('but removing both does remove the slot', async () => {
        hotspot.remove();
        hotspot2.remove();
        await timePasses();

        expect(scene.pivot.children.length).to.be.equal(numSlots - 1);
      });
    });
  });
});