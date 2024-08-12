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

import {expect} from '@esm-bundle/chai';
import {Vector3} from 'three';

import {$needsRender, $scene, toVector3D, Vector2D, Vector3D} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {Hotspot} from '../../three-components/Hotspot.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, rafPasses} from '../helpers.js';

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
};

suite('Annotation', () => {
  let element: ModelViewerElement;
  let scene: ModelScene;

  setup(async () => {
    element = new ModelViewerElement();
    document.body.insertBefore(element, document.body.firstChild);
    scene = element[$scene];

    element.src = assetPath('models/cube.gltf');
    await waitForEvent(element, 'poster-dismissed');
  });

  teardown(() => {
    if (element.parentNode != null) {
      element.parentNode.removeChild(element);
    }
  });

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

    teardown(() => {
      if (hotspot.parentElement === element) {
        element.removeChild(hotspot);
      }
    });

    test('creates a corresponding slot', () => {
      expect(sceneContainsHotspot(scene, hotspot)).to.be.true;
    });

    test.skip('querying it returns valid data', () => {
      // to test querying, place hotspot in the center and verify the screen
      // position is half the default width and height (300 x 150) with a depth
      // value of ~1.
      const defaultDimensions = {width: 300, height: 150};
      element.updateHotspot({name: 'hotspot-1', position: `0m 0m 0m`});

      const hotspotData = element.queryHotspot('hotspot-1');

      expect(hotspotData?.canvasPosition.x)
          .to.be.closeTo(defaultDimensions.width / 2, 0.0001);
      expect(hotspotData?.canvasPosition.y)
          .to.be.closeTo(defaultDimensions.height / 2, 0.0001);
      expect(hotspotData?.position.toString())
          .to.equal(toVector3D(new Vector3(0, 0, 0)).toString());
      expect(hotspotData?.normal.toString())
          .to.equal(toVector3D(new Vector3(0, 0, -1)).toString());
      expect(hotspotData?.facingCamera).to.be.true;
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

      teardown(() => {
        if (hotspot2.parentElement === element) {
          element.removeChild(hotspot2);
        }
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

      test('updateHotspot does change the surface', () => {
        const hotspot = scene.target.children[numSlots - 1] as Hotspot;
        const {x} = hotspot.position;
        const surface = '0 0 1 2 3 0.217 0.341 0.442';
        element.updateHotspot({name: 'hotspot-1', surface});
        expect(x).to.not.be.equal(hotspot.position.x);
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

      suite('with a camera', () => {
        let wrapper: HTMLElement;

        setup(async () => {
          // This is to wait for the hotspots to be added to their slots, as
          // this triggers their visibility to "show". Otherwise, sometimes the
          // following hide() call will happen first, then when the camera
          // moves, we never get a hotspot-visibility event because they were
          // already visible.
          await rafPasses();

          wrapper = (scene.target.children[numSlots - 1] as Hotspot).element;
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
    });
  });

  suite('a model-viewer element with a loaded cube', () => {
    let rect: DOMRect;

    setup(async () => {
      element.setAttribute('style', `width: 200px; height: 300px`);
      rect = element.getBoundingClientRect();
      element.cameraOrbit = '0deg 90deg 2m';
      element.jumpCameraToGoal();
      await rafPasses();
    });

    test('gets expected hit result', async () => {
      await rafPasses();
      const hitResult = element.positionAndNormalFromPoint(
          rect.width / 2 + rect.x, rect.height / 2 + rect.y);
      expect(hitResult).to.be.ok;
      const {position, normal, uv} = hitResult!;
      closeToVector3(position, new Vector3(0, 0, 0.5));
      closeToVector3(normal, new Vector3(0, 0, 1));

      if (uv != null) {
        withinRange(uv, 0, 1);
      }
    });

    test('gets expected hit result when turned', async () => {
      element.resetTurntableRotation(-Math.PI / 2);
      await rafPasses();
      const hitResult = element.positionAndNormalFromPoint(
          rect.width / 2 + rect.x, rect.height / 2 + rect.y);
      expect(hitResult).to.be.ok;
      const {position, normal, uv} = hitResult!;
      closeToVector3(position, new Vector3(0.5, 0, 0));
      closeToVector3(normal, new Vector3(1, 0, 0));
      if (uv != null) {
        withinRange(uv, 0, 1);
      }
    });

    test('returns a surface that shows and hides appropriately', async () => {
      await rafPasses();
      const surface = element.surfaceFromPoint(
          rect.width / 2 + rect.x, rect.height / 2 + rect.y);
      expect(surface).to.be.ok;

      const hotspot = document.createElement('div');
      hotspot.setAttribute('slot', 'hotspot-1');
      hotspot.setAttribute('data-surface', surface!);
      element.appendChild(hotspot);

      await rafPasses();

      expect(sceneContainsHotspot(scene, hotspot)).to.be.true;

      const numSlots = scene.target.children.length;
      const wrapper = (scene.target.children[numSlots - 1] as Hotspot).element;

      expect(wrapper.classList.contains('hide')).to.be.false;

      element[$scene].yaw = Math.PI;
      element[$scene].updateMatrixWorld();
      element[$needsRender]();

      await waitForEvent(hotspot, 'hotspot-visibility');

      expect(wrapper.classList.contains('hide')).to.be.true;
    });
  });
});
