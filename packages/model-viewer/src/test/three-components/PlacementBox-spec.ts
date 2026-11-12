/* @license
 * Copyright 2026 Google LLC. All Rights Reserved.
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

import '../renderer-gate.js';

import {expect} from 'chai';
import {Box3, BoxGeometry, Mesh, PlaneGeometry, Vector3} from 'three';

import {$scene} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {PlacementBox} from '../../three-components/PlacementBox.js';
import {Side} from '../../three-components/Shadow.js';

const EPSILON = 1e-6;

suite('PlacementBox', () => {
  let element: ModelViewerElement;
  let scene: ModelScene;
  let box: PlacementBox|null;

  const setModelSize = (x: number, y: number, z: number) => {
    scene.boundingBox.set(
        new Vector3(-x / 2, 0, -z / 2), new Vector3(x / 2, y, z / 2));
    scene.boundingBox.getSize(scene.size);
  };

  const createBox = (side: Side = 'bottom') => {
    box = new PlacementBox(scene, side);
    return box;
  };

  const hitPlaneOf = (box: PlacementBox) =>
      ((box as any).hitPlane as Mesh).geometry as PlaneGeometry;

  const hitBoxOf = (box: PlacementBox) => (box as any).hitBox as Mesh;

  setup(() => {
    element = new ModelViewerElement();
    scene = element[$scene];
    document.body.insertBefore(element, document.body.firstChild);
    box = null;
  });

  teardown(() => {
    box?.dispose();
    document.body.removeChild(element);
  });

  test('keeps the hit plane close to a 10 cm model', () => {
    setModelSize(0.1, 0.1, 0.1);
    const {width, height} = hitPlaneOf(createBox()).parameters;
    expect(width).to.be.closeTo(0.15, EPSILON);
    expect(height).to.be.closeTo(0.15, EPSILON);
  });

  test('draws the ring at the same padding as the hit plane', () => {
    setModelSize(0.1, 0.1, 0.1);
    const {geometry} = createBox();
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x).to.be.closeTo(0.075, EPSILON);
    expect(geometry.boundingBox!.max.y).to.be.closeTo(0.075, EPSILON);
  });

  test('keeps a minimum touch target for a 2 cm model', () => {
    setModelSize(0.02, 0.02, 0.02);
    const placementBox = createBox();
    const {width, height} = hitPlaneOf(placementBox).parameters;
    expect(width).to.be.closeTo(0.1, EPSILON);
    expect(height).to.be.closeTo(0.1, EPSILON);

    // The first vertex is the inner edge of the first corner arc, which must
    // stay outside the footprint corner for the ring to render correctly.
    const corner = placementBox.getSize().x / 2;
    const innerEdge = placementBox.geometry.getAttribute('position').getX(0);
    expect(innerEdge).to.be.greaterThan(corner);
  });

  test('keeps a minimum padding for a thin wall model', () => {
    setModelSize(0.3, 0.01, 0.05);
    const {width, height} = hitPlaneOf(createBox('back')).parameters;
    expect(width).to.be.closeTo(0.35, EPSILON);
    expect(height).to.be.closeTo(0.06, EPSILON);
  });

  test('controller hit box covers the full height of a small model', () => {
    setModelSize(0.1, 0.1, 0.1);
    const hitBox = hitBoxOf(createBox());
    hitBox.updateWorldMatrix(true, false);
    const bounds = new Box3().setFromObject(hitBox);
    expect(bounds.min.y).to.be.at.most(scene.boundingBox.min.y + EPSILON);
    expect(bounds.max.y).to.be.at.least(scene.boundingBox.max.y - EPSILON);
    expect((hitBox.geometry as BoxGeometry).parameters.width)
        .to.be.closeTo(0.15, EPSILON);
  });

  test('keeps the existing padding for a 50 cm model', () => {
    setModelSize(0.5, 0.5, 0.5);
    const {width, height} = hitPlaneOf(createBox()).parameters;
    expect(width).to.be.closeTo(0.71, EPSILON);
    expect(height).to.be.closeTo(0.71, EPSILON);
  });

  test('keeps the existing padding for a 2 m model', () => {
    setModelSize(2, 2, 2);
    const {width, height} = hitPlaneOf(createBox()).parameters;
    expect(width).to.be.closeTo(2.4, EPSILON);
    expect(height).to.be.closeTo(2.4, EPSILON);
  });

  test('updates the padding when the model size changes', () => {
    setModelSize(2, 2, 2);
    const placementBox = createBox();
    setModelSize(0.1, 0.1, 0.1);
    placementBox.updateFromModelChanges();
    const {width, height} = hitPlaneOf(placementBox).parameters;
    expect(width).to.be.closeTo(0.15, EPSILON);
    expect(height).to.be.closeTo(0.15, EPSILON);
  });
});
