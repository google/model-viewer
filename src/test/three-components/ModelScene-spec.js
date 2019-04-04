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
import ModelScene, {FRAMED_HEIGHT, ROOM_PADDING_SCALE} from '../../three-components/ModelScene.js';
import Renderer from '../../three-components/Renderer.js';
import {assetPath} from '../helpers.js';

const expect = chai.expect;

function invertPad(vec3) {
  return vec3.clone().multiplyScalar(ROOM_PADDING_SCALE);
}

function ensureRoomFitsAspect(roomBox, aspect) {
  expect(roomBox.max.x).to.be.equal(aspect * FRAMED_HEIGHT / 2);
  expect(roomBox.min.x).to.be.equal(aspect * FRAMED_HEIGHT / -2);
  expect(roomBox.max.y).to.be.equal(FRAMED_HEIGHT);
  expect(roomBox.min.y).to.be.equal(0);
}

function ensureWidthAndDepthEqual(roomBox) {
  expect(roomBox.max.x).to.be.equal(roomBox.max.z);
  expect(roomBox.min.x).to.be.equal(roomBox.min.z);
}


suite('ModelScene', () => {
  let element;
  let scene;
  let dummyMesh;
  let renderer;
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
    dummyMesh = new Mesh(new SphereBufferGeometry(0.5, 32, 32));
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
      const {width, height} = scene;
      expect(scene.width).to.be.equal(500);
      expect(scene.canvas.width).to.be.equal(500 * devicePixelRatio);
      expect(scene.canvas.style.width).to.be.equal('500px');
      expect(scene.height).to.be.equal(200);
      expect(scene.canvas.height).to.be.equal(200 * devicePixelRatio);
      expect(scene.canvas.style.height).to.be.equal('200px');
    });

    test('updates roombox from size', () => {
      const width = 1000;
      const height = 500;
      const aspect = width / height;
      scene.setSize(width, height);

      ensureRoomFitsAspect(scene.roomBox, aspect);
      ensureWidthAndDepthEqual(scene.roomBox);
    });

    test('increases depth of room for Y-rotation', () => {
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(10, 5, 1));
      scene.model.setObject(dummyMesh);

      const width = 2000;
      const height = 1000;
      const aspect = width / height;
      scene.setSize(width, height);

      ensureRoomFitsAspect(scene.roomBox, aspect);
      ensureWidthAndDepthEqual(scene.roomBox);
    });

    test('increases width of room for Y-rotation', () => {
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(1, 2, 10));
      scene.model.setObject(dummyMesh);

      const width = 2000;
      const height = 1000;
      const aspect = width / height;
      scene.setSize(width, height);

      ensureRoomFitsAspect(scene.roomBox, aspect);
      ensureWidthAndDepthEqual(scene.roomBox);
    });

    test('reduce depth of room if Y-axis-bound', () => {
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(3, 10, 1));
      scene.model.setObject(dummyMesh);

      const width = 2000;
      const height = 1000;
      const aspect = width / height;
      scene.setSize(width, height);

      ensureRoomFitsAspect(scene.roomBox, aspect);

      // Should be a total depth of "3" to accomodate the
      // width of the model
      expect(scene.roomBox.max.z).to.be.equal(1.5);
      expect(scene.roomBox.min.z).to.be.equal(-1.5);
    });

    test('cannot set the canvas smaller than 1x1', () => {
      scene.setSize(0, 0);
      expect(scene.width).to.be.equal(1);
      expect(scene.height).to.be.equal(1);
    });
  });

  suite('scaleModelToFitRoom', () => {
    test('does not throw if model has no volume', () => {
      scene.model.setObject(new Object3D());
      scene.scaleModelToFitRoom();
    });

    test('does not throw if model not loaded', () => {
      scene.model.modelContainer.add(dummyMesh);
      scene.model.updateBoundingBox();
      scene.scaleModelToFitRoom();
    });

    test('increases the scale of a small object to fill the limit', () => {
      scene.setSize(1000, 500);
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(2, 1, 2));
      scene.model.setObject(dummyMesh);

      scene.scaleModelToFitRoom();
      expect(invertPad(scene.model.scale)).to.be.eql(new Vector3(10, 10, 10));
    });

    test('scales when Z-bound', () => {
      scene.setSize(1000, 500);
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(2, 1, 10));
      scene.model.setObject(dummyMesh);

      scene.scaleModelToFitRoom();
      expect(invertPad(scene.model.scale)).to.be.eql(new Vector3(2, 2, 2));
    });

    test('scales when X-bound', () => {
      scene.setSize(1000, 500);
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(40, 3, 3));
      scene.model.setObject(dummyMesh);

      scene.scaleModelToFitRoom();
      expect(invertPad(scene.model.scale))
          .to.be.eql(new Vector3(0.5, 0.5, 0.5));
    });

    test('scales when Y-bound', () => {
      scene.setSize(1000, 500);
      dummyMesh.geometry.applyMatrix(new Matrix4().makeScale(10, 20, 10));
      scene.model.setObject(dummyMesh);

      scene.scaleModelToFitRoom();
      expect(invertPad(scene.model.scale))
          .to.be.eql(new Vector3(0.5, 0.5, 0.5));
    });

    test('updates object position to center its volume within box', () => {
      scene.setSize(1000, 500);
      dummyMesh.geometry.applyMatrix(new Matrix4().makeTranslation(10, 10, 10));
      scene.model.setObject(dummyMesh);

      scene.scaleModelToFitRoom();
      expect(invertPad(scene.model.scale)).to.be.eql(new Vector3(10, 10, 10));

      // Roundabout way of specifying the expected position
      // without the scale :(
      const expectedPosition = new Vector3(-100, -95, -100);
      expectedPosition.sub(new Vector3(0, FRAMED_HEIGHT / 2, 0));
      expectedPosition.divideScalar(ROOM_PADDING_SCALE);
      expectedPosition.add(new Vector3(0, FRAMED_HEIGHT / 2, 0));

      expect(scene.model.position).to.be.eql(expectedPosition);
    });
  });
});
