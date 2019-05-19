/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {Matrix4, Mesh, Object3D, SphereBufferGeometry, Vector3} from 'three';

import ModelViewerElementBase, {$canvas} from '../../model-viewer-base.js';
import ModelScene, {ROOM_PADDING_SCALE} from '../../three-components/ModelScene.js';
import Renderer from '../../three-components/Renderer.js';
import {assetPath} from '../helpers.js';


const expect = chai.expect;

suite('ModelScene', () => {
  let element: ModelViewerElementBase;
  let scene: ModelScene;
  let dummyRadius: number;
  let dummyMesh: Mesh;
  let renderer: Renderer;
  let ModelViewerElement = class extends ModelViewerElementBase {};

  customElements.define('model-viewer-modelscene', ModelViewerElement);

  suiteSetup(() => {
    renderer = new Renderer();
  });

  suiteTeardown(() => {
    renderer.dispose();
  });

  setup(() => {
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
      renderer,
    });
  });

  suite('setModelSource', () => {
    test('fires a model-load event when loaded', async function() {
      let fired = false;
      scene.addEventListener('model-load', () => fired = true);
      await scene.setModelSource(assetPath('Astronaut.glb'));
      expect(fired).to.be.ok;
    });
  });

  suite('setSize', () => {
    test('updates visual and buffer size', () => {
      scene.setSize(500, 200);
      expect(scene.width).to.be.equal(500);
      expect(scene.canvas.width).to.be.equal(500 * devicePixelRatio);
      expect(scene.canvas.style.width).to.be.equal('500px');
      expect(scene.height).to.be.equal(200);
      expect(scene.canvas.height).to.be.equal(200 * devicePixelRatio);
      expect(scene.canvas.style.height).to.be.equal('200px');
    });

    test('scales when X-bound', () => {
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(10, 3, 1));
      scene.model.setObject(dummyMesh);

      const width = 2000;
      const height = 1000;
      const aspect = width / height;
      scene.setSize(width, height);

      expect(scene.framedHeight).to.be.equal(ROOM_PADDING_SCALE * 10 / aspect);
    });

    test('scales when Z-bound', () => {
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(1, 3, 10));
      scene.model.setObject(dummyMesh);

      const width = 2000;
      const height = 1000;
      const aspect = width / height;
      scene.setSize(width, height);

      expect(scene.framedHeight).to.be.equal(ROOM_PADDING_SCALE * 10 / aspect);
    });

    test('scales when Y-bound', () => {
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(3, 10, 1));
      scene.model.setObject(dummyMesh);

      const width = 2000;
      const height = 1000;
      scene.setSize(width, height);

      expect(scene.framedHeight).to.be.equal(ROOM_PADDING_SCALE * 10);
    });

    test('model is not scaled', () => {
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(1, 3, 10));
      scene.model.setObject(dummyMesh);

      scene.setSize(1000, 500);
      expect(scene.model.scale).to.be.eql(new Vector3(1, 1, 1));
    });

    test('cannot set the canvas smaller than 1x1', () => {
      scene.setSize(0, 0);
      expect(scene.width).to.be.equal(1);
      expect(scene.height).to.be.equal(1);
    });
  });

  suite('alignModel', () => {
    test('does not throw if model has no volume', () => {
      scene.model.setObject(new Object3D());
      scene.alignModel();
    });

    test('does not throw if model not loaded', () => {
      scene.model.modelContainer.add(dummyMesh);
      scene.model.updateBoundingBox();
      scene.alignModel();
    });

    test('updates object position to center it on the floor', () => {
      scene.setSize(1000, 500);
      dummyMesh.geometry.applyMatrix(new Matrix4().makeTranslation(5, 10, 20));
      scene.model.setObject(dummyMesh);

      scene.alignModel();

      expect(scene.model.position)
          .to.be.eql(new Vector3(-5, dummyRadius - 10, -20));
    });
  });
});
