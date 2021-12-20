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

import {AnnotationInterface, AnnotationMixin} from '../../features/annotation';
import ModelViewerElementBase, {$needsRender, $scene, Vector2D, Vector3D} from '../../model-viewer-base';
import {Hotspot} from '../../three-components/Hotspot.js';
import {ModelScene} from '../../three-components/ModelScene';
import {timePasses, waitForEvent} from '../../utilities';
import {assetPath, rafPasses} from '../helpers';
import {BasicSpecTemplate} from '../templates';

const expect = chai.expect;

const sceneContainsHotspot =
    (scene: ModelScene, element: HTMLElement): boolean => {
      const {children} = scene.target;
      for (let i = 0, l = children.length; i < l; i++) {
        const hotspot = children[i];
        if (hotspot instanceof Hotspot &&
            (hotspot.element.children[0].children[0] as HTMLSlotElement)
                    .name === element.slot) {
          // expect it has been changed from default
          expect(hotspot.position).to.not.eql(new Vector3());
          expect(hotspot.normal).to.not.eql(new Vector3(0, 1, 0));
          return true;
        }
      }
      return false;
    };

const closeToVector3 = (a: Vector3D, b: Vector3) => {
  const delta = 0.001;
  expect(a.x).to.be.closeTo(b.x, delta);
  expect(a.y).to.be.closeTo(b.y, delta);
  expect(a.z).to.be.closeTo(b.z, delta);
};

const withinRange = (a: Vector2D, start: number, finish: number) => {
  expect(a.u).to.be.within(start, finish);
  expect(a.v).to.be.within(start, finish);
}

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
    document.body.insertBefore(element, document.body.firstChild);
    scene = element[$scene];
  });

  teardown(() => {
    if (element.parentNode != null) {
      element.parentNode.removeChild(element);
    }
  });

  BasicSpecTemplate(() => ModelViewerElement, () => tagName);

  suite('a model-viewer element with a hotspot', () => {
    let hotspot: HTMLElement;
    let numSlots: number;

    setup(async () => {
      hotspot = document.createElement('div');
      hotspot.setAttribute('slot', 'hotspot-1');
      hotspot.setAttribute('data-position', '1m 1m 1m');
      hotspot.setAttribute('data-normal', '0m 0m -1m');
      element.appendChild(hotspot);
      await timePasses();
      numSlots = scene.target.children.length;
    });

    test('creates a corresponding slot', () => {
      expect(sceneContainsHotspot(scene, hotspot)).to.be.true;
    });

    suite('adding a second hotspot with the same name', () => {
      let hotspot2: HTMLElement;

      setup(async () => {
        hotspot2 = document.createElement('div');
        hotspot2.setAttribute('slot', 'hotspot-1');
        hotspot2.setAttribute('data-position', '0m 1m 2m');
        hotspot2.setAttribute('data-normal', '1m 0m 0m');
        element.appendChild(hotspot2);
        await timePasses();
      });

      test('does not change the slot', () => {
        expect(scene.target.children.length).to.be.equal(numSlots);
      });

      test('does not change the data', () => {
        const {position, normal} =
            (scene.target.children[numSlots - 1] as Hotspot);
        expect(position).to.be.deep.equal(new Vector3(1, 1, 1));
        expect(normal).to.be.deep.equal(new Vector3(0, 0, -1));
      });

      test('updateHotspot does change the data', () => {
        element.updateHotspot(
            {name: 'hotspot-1', position: '0m 1m 2m', normal: '1m 0m 0m'});
        const {position, normal} =
            (scene.target.children[numSlots - 1] as Hotspot);
        expect(position).to.be.deep.equal(new Vector3(0, 1, 2));
        expect(normal).to.be.deep.equal(new Vector3(1, 0, 0));
      });

      suite('with a camera', () => {
        let wrapper: HTMLElement;

        setup(async () => {
          // This is to wait for the hotspots to be added to their slots, as
          // this triggers their visibility to "show". Otherwise, sometimes the
          // following hide() call will happen first, then when the camera
          // moves, we never get a hotspot-visibility event because they were
          // already visible.
          await rafPasses();

          const hotspotObject2D =
              scene.target.children[numSlots - 1] as Hotspot;

          const camera = element[$scene].camera;
          camera.position.z = 2;
          camera.updateMatrixWorld();
          element[$needsRender]();

          await waitForEvent(hotspot2, 'hotspot-visibility');

          wrapper = hotspotObject2D.element;
        });

        test('the hotspot is hidden', async () => {
          expect(wrapper.classList.contains('hide')).to.be.true;
        });

        test('the hotspot is visible after turning', async () => {
          element[$scene].yaw = Math.PI;
          element[$scene].updateMatrixWorld();
          element[$needsRender]();

          await waitForEvent(hotspot2, 'hotspot-visibility');

          expect(!!wrapper.classList.contains('hide')).to.be.false;
        });
      });

      test('and removing it does not remove the slot', async () => {
        element.removeChild(hotspot);
        await timePasses();

        expect(scene.target.children.length).to.be.equal(numSlots);
      });

      test('but removing both does remove the slot', async () => {
        element.removeChild(hotspot);
        element.removeChild(hotspot2);
        await timePasses();

        expect(scene.target.children.length).to.be.equal(numSlots - 1);
      });
    });
  });

  suite('a model-viewer element with a loaded cube', () => {
    let width = 0;
    let height = 0;

    setup(async () => {
      width = 200;
      height = 300;
      element.setAttribute('style', `width: ${width}px; height: ${height}px`);
      element.src = assetPath('models/cube.gltf');

      const camera = element[$scene].camera;
      camera.position.z = 2;
      camera.updateMatrixWorld();
      await waitForEvent(element, 'load');
    });

    test('gets expected hit result', () => {
      const hitResult =
          element.positionAndNormalFromPoint(width / 2, height / 2);
      expect(hitResult).to.be.ok;
      const {position, normal, uv} = hitResult!;
      closeToVector3(position, new Vector3(0, 0, 0.5));
      closeToVector3(normal, new Vector3(0, 0, 1));
      if(uv != null){
        withinRange(uv, 0, 1);
      }
    });

    test('gets expected hit result when turned', () => {
      element[$scene].yaw = -Math.PI / 2;
      element[$scene].updateMatrixWorld();
      const hitResult =
          element.positionAndNormalFromPoint(width / 2, height / 2);
      expect(hitResult).to.be.ok;
      const {position, normal, uv} = hitResult!;
      closeToVector3(position, new Vector3(0.5, 0, 0));
      closeToVector3(normal, new Vector3(1, 0, 0));
      if(uv != null){
        withinRange(uv, 0, 1);
      }
    });
  });
});