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

import {BoxBufferGeometry, Mesh, Box3, Vector3} from 'three';

import {deserializeUrl, fitWithinBox} from '../utils.js';

const expect = chai.expect;

const timePasses = (ms) => new Promise(resolve => setTimeout(resolve, ms));

suite('utils', () => {
  suite('deserializeUrl', () => {
    test('returns a string given a string', () => {
      expect(deserializeUrl('foo')).to.be.a('string');
    });

    test('returns null given a null-ish value', () => {
      expect(deserializeUrl(null)).to.be.equal(null);
    });

    test('yields a url on the same origin for relative paths', () => {
      const {origin} = window.location;

      expect(deserializeUrl('foo').indexOf(origin)).to.be.equal(0);
    });
  });

  suite('fitWithinBox', () => {
    test('increases the scale of a small object to fill the limit', () => {
      const room = new Box3().set(new Vector3(-5, 0, -5), new Vector3(5, 10, 5));
      const object = new Mesh(new BoxBufferGeometry(1, 1, 1));

      fitWithinBox(room, object);

      expect(object.scale).to.be.eql(new Vector3(10, 10, 10));
    });

    test('decreases the scale of a large object to fit the limit', () => {
      const room = new Box3().set(new Vector3(-5, 0, -5), new Vector3(5, 10, 5));
      const object = new Mesh(new BoxBufferGeometry(100, 100, 100));

      fitWithinBox(room, object);

      expect(object.scale).to.be.eql(new Vector3(0.1, 0.1, 0.1));
    });
    
    test('updates object position to center its volume within box', () => {
      const room = new Box3().set(new Vector3(-5, 0, -5), new Vector3(5, 10, 5));
      const object = new Mesh(new BoxBufferGeometry(1, 2, 1));

      fitWithinBox(room, object);

      expect(object.scale).to.be.eql(new Vector3(5, 5, 5));
      expect(object.position).to.be.eql(new Vector3(0, 5, 0));
    });
  });
});
