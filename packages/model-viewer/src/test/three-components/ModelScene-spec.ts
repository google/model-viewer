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

import {Matrix4, Mesh, SphereBufferGeometry, Vector3} from 'three';

import ModelViewerElementBase, {$canvas} from '../../model-viewer-base.js';
import {DEFAULT_FOV_DEG, ModelScene} from '../../three-components/ModelScene.js';
import {assetPath} from '../helpers.js';


const expect = chai.expect;

suite('ModelScene', () => {
  let nextId = 0;
  let tagName: string;
  let ModelViewerElement: Constructor<ModelViewerElementBase>;

  let element: ModelViewerElementBase;
  let scene: ModelScene;
  let dummyRadius: number;
  let dummyMesh: Mesh;

  setup(() => {
    tagName = `model-viewer-modelscene-${nextId++}`;
    ModelViewerElement = class extends ModelViewerElementBase {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);
    // Set the radius of the sphere to 0.5 so that it's size is 1
    // for testing scaling.
    dummyRadius = 0.5;
    dummyMesh = new Mesh(new SphereBufferGeometry(dummyRadius, 32, 32));
    element = new ModelViewerElement();
    scene = new ModelScene({
      element: element,
      canvas: element[$canvas],
      width: 200,
      height: 100,
    });
  });

  suite('setModelSource', () => {
    test('fires a model-load event when loaded', async function() {
      let fired = false;
      scene.addEventListener('model-load', () => fired = true);
      await scene.setSource(assetPath('models/Astronaut.glb'));
      expect(fired).to.be.ok;
    });
  });

  suite('with a model', () => {
    setup(async () => {
      await scene.setSource(assetPath('models/Astronaut.glb'));
    });

    suite('setShadowIntensity', () => {
      test('can increase intensity and reset it to zero', () => {
        scene.setShadowIntensity(1);
        const shadow = scene.shadow!;
        expect(shadow).to.be.ok;
        expect(shadow.getIntensity()).to.be.equal(1);
        scene.setShadowIntensity(0);
        expect(shadow.getIntensity()).to.be.equal(0);
      });

      test('shadow is only created when intensity is greater than zero', () => {
        expect(scene.shadow).to.be.not.ok;
        scene.setShadowIntensity(1);
        expect(scene.shadow).to.be.ok;
      });
    });
  });

  suite('setSize', () => {
    test('updates visual and buffer size', () => {
      scene.setSize(500, 200);
      expect(scene.width).to.be.equal(500);
      expect(scene.height).to.be.equal(200);
    });

    test('model is not scaled', async () => {
      dummyMesh.geometry.applyMatrix4(new Matrix4().makeScale(1, 3, 10));
      await scene.setObject(dummyMesh);

      scene.setSize(1000, 500);
      expect(scene.scale).to.be.eql(new Vector3(1, 1, 1));
    });

    test('idealCameraDistance is set correctly', async () => {
      await scene.setObject(dummyMesh);

      const halfFov = (DEFAULT_FOV_DEG / 2) * Math.PI / 180;
      const expectedDistance = dummyRadius / Math.sin(halfFov);
      expect(scene.idealCameraDistance())
          .to.be.closeTo(expectedDistance, 0.0001);
    });

    test('idealAspect is set correctly', async () => {
      await scene.setObject(dummyMesh);

      expect(scene.idealAspect).to.be.closeTo(1, 0.0001);
    });

    test('cannot set the canvas smaller than 1x1', () => {
      scene.setSize(0, 0);
      expect(scene.width).to.be.equal(1);
      expect(scene.height).to.be.equal(1);
    });
  });
});
