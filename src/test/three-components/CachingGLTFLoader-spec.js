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
import {CachingGLTFLoader} from '../../three-components/CachingGLTFLoader.js';

suite('CachingGLTFLoader', () => {
  suite('when loading a gltf', () => {
    let loader;

    setup(() => {
      loader = new CachingGLTFLoader();
    });

    test('synchronously populates the cache', () => {
      loader.load('./examples/assets/Astronaut.glb');
      expect(CachingGLTFLoader.has('./examples/assets/Astronaut.glb'))
          .to.be.equal(true);
    });

    test('yields a promise that resolves a scene', async () => {
      const scene = await loader.load('./examples/assets/Astronaut.glb');
      expect(scene).to.be.ok;
      expect(scene.type).to.be.equal('Scene');
    });
  });
});
