/* @license
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

import {expect} from 'chai';

import {$controls} from '../../features/controls.js';
import {$canvas, $scene, $updateSize} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {Renderer} from '../../three-components/Renderer.js';
import type {SmoothControls} from '../../three-components/SmoothControls.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {NativeModelFixture} from '../fixtures/native-model.js';
import {assetPath, rafPasses} from '../helpers.js';

suite('Native <model> rendering', () => {
  let element: ModelViewerElement&{[$controls]: SmoothControls};
  let fixture: NativeModelFixture;

  setup(() => {
    fixture = new NativeModelFixture();
    element = new ModelViewerElement() as typeof element;
    element.loading = 'eager';
    element.cameraControls = true;
    element.cameraOrbit = '0deg 90deg 105%';
  });

  teardown(async () => {
    element.remove();
    await timePasses(20);
    fixture.restore();
  });

  const load = async (src: string = 'native.glb') => {
    const loaded = waitForEvent(element, 'load');
    element.src = src;
    document.body.appendChild(element);
    await loaded;
    return fixture.models[fixture.models.length - 1];
  };

  const renderAfterUpdate = async () => {
    element.jumpCameraToGoal();
    await element.updateComplete;
    await rafPasses();
    Renderer.singleton.render(performance.now());
  };

  test('uses Three.js when the created element has no native API', () => {
    fixture.supported = false;
    delete (self as any).HTMLModelElement;
    element = new ModelViewerElement() as typeof element;
    expect(element[$scene].nativeRenderer).to.equal(null);
    expect(fixture.models).to.have.length(0);
  });

  test(
      'uses native rendering without a global HTMLModelElement constructor',
      async () => {
        delete (self as any).HTMLModelElement;
        element = new ModelViewerElement() as typeof element;
        element.loading = 'eager';
        const mock = await load();
        expect(element[$scene].nativeRenderer!.isActive).to.equal(true);
        expect(mock.idleReadyReads).to.equal(0);
      });

  test('loads a native model without parsing it with Three.js', async () => {
    const loader = Renderer.singleton.loader;
    const originalLoad = loader.load;
    let loads = 0;
    loader.load = (...args) => {
      ++loads;
      return originalLoad.apply(loader, args);
    };
    try {
      const mock = await load();
      expect(element.loaded).to.equal(true);
      expect(mock.element.isConnected).to.equal(true);
      expect(mock.element.getAttribute('src')).to.equal(element.src);
      expect(mock.element.getAttribute('part')).to.equal('model');
      expect(element[$scene].nativeRenderer!.isActive).to.equal(true);
      expect(loads).to.equal(0);
      expect(element.shadowRoot!.querySelectorAll('model')).to.have.length(1);
    } finally {
      loader.load = originalLoad;
    }
  });

  test('waits for native readiness before dismissing the poster', async () => {
    fixture.autoResolve = false;
    const loaded = load();
    await element.updateComplete;
    const input = element.shadowRoot!.querySelector('.userInput')!;
    // Safari needs a layout box to create the renderer that settles ready.
    expect(getComputedStyle(input).display).to.equal('block');
    expect(input.getBoundingClientRect().width).to.be.greaterThan(0);
    expect(input.getBoundingClientRect().height).to.be.greaterThan(0);
    expect(getComputedStyle(input).visibility).to.equal('hidden');
    expect(element.loaded).to.equal(false);
    expect(element.shadowRoot!.querySelector('.poster')!.classList.contains(
               'show'))
        .to.equal(true);
    fixture.models[0].resolve();
    await loaded;
    expect(element.shadowRoot!.querySelector('.poster')!.classList.contains(
               'show'))
        .to.equal(false);
    expect(getComputedStyle(input).visibility).to.equal('visible');
  });

  test(
      'preserves native layout when the poster is shown manually', async () => {
        element.reveal = 'manual';
        await load();
        const input = element.shadowRoot!.querySelector('.userInput')!;
        expect(getComputedStyle(input).display).to.equal('block');
        expect(getComputedStyle(input).visibility).to.equal('hidden');
        expect(element.modelIsVisible).to.equal(false);
        element.dismissPoster();
        expect(getComputedStyle(input).visibility).to.equal('visible');
        element.showPoster();
        expect(getComputedStyle(input).display).to.equal('block');
        expect(getComputedStyle(input).visibility).to.equal('hidden');
      });

  test('has no canvas layer while rendering a native model', async () => {
    await load();
    expect(element.shadowRoot!.querySelector('canvas')).to.equal(null);
    expect(element[$canvas].isConnected).to.equal(false);
    Renderer.singleton.render(performance.now());
    expect(element.shadowRoot!.querySelector('canvas')).to.equal(null);
  });

  test(
      'removes the previous WebGL canvas when switching to native rendering',
      async () => {
        element.disableNative = true;
        await load(assetPath('models/cube.gltf'));
        const slot = element[$canvas].parentElement!;
        // The shared canvas is attached here when Three.js displays a single
        // scene.
        slot.appendChild(Renderer.singleton.canvas3D);
        const loaded = waitForEvent(element, 'load');
        element.disableNative = false;
        await loaded;
        expect(element.shadowRoot!.querySelector('model')).not.to.equal(null);
        expect(element.shadowRoot!.querySelector('canvas')).to.equal(null);
        expect(Renderer.singleton.canvas3D.parentElement).to.equal(null);
      });

  test(
      'restores the fallback canvas when switching from native to Three.js',
      async () => {
        await load(assetPath('models/cube.gltf'));
        expect(element[$canvas].parentElement).to.equal(null);
        const loaded = waitForEvent(element, 'load');
        element.disableNative = true;
        await loaded;
        expect(element[$canvas].isConnected).to.equal(true);
        expect(element.shadowRoot!.querySelector('model')).to.equal(null);
        expect(element[$scene].currentGLTF).not.to.equal(null);
      });

  test('cancels a pending Three.js load when switching to native', async () => {
    const loader = Renderer.singleton.loader;
    const originalLoad = loader.load;
    let release = () => {};
    let reached = () => {};
    let dispose = () => {};
    const gate = new Promise<void>(resolve => release = resolve);
    const pending = new Promise<void>(resolve => reached = resolve);
    loader.load = async (...args) => {
      const gltf = await originalLoad.apply(loader, args);
      dispose = () => gltf.dispose();
      reached();
      await gate;
      return gltf;
    };
    try {
      element.disableNative = true;
      element.src = assetPath('models/cube.gltf');
      document.body.appendChild(element);
      await pending;
      const loaded = waitForEvent(element, 'load');
      element.disableNative = false;
      element.src = 'native.glb';
      await loaded;
      release();
      await rafPasses();
      expect(element[$scene].url).to.equal('native.glb');
      expect(element[$scene].nativeRenderer!.isActive).to.equal(true);
      expect(fixture.models[0].element.isConnected).to.equal(true);
      expect(element[$scene].currentGLTF).to.equal(null);
    } finally {
      release();
      loader.load = originalLoad;
      dispose();
    }
  });

  test(
      'does not request Safari\'s idle ready promise before selecting src',
      async () => {
        const mock = await load();
        expect(mock.idleReadyReads).to.equal(0);
        expect(element.loaded).to.equal(true);
      });

  test(
      'loads with default lighting without awaiting an idle environment promise',
      async () => {
        const mock = await load();
        expect(mock.idleEnvironmentReads).to.equal(0);
        expect(mock.environmentMaps).to.have.length(0);
        expect(element[$scene].nativeRenderer!.isActive).to.equal(true);
      });

  test('forwards alt text, credentials, and autoplay', async () => {
    element.alt = 'A native teapot';
    element.withCredentials = true;
    element.autoplay = true;
    const mock = await load();
    expect(mock.element.getAttribute('aria-label')).to.equal(element.alt);
    expect(mock.element.getAttribute('crossorigin'))
        .to.equal('use-credentials');
    expect(mock.element.hasAttribute('autoplay')).to.equal(true);
    element.alt = 'Updated description';
    element.autoplay = false;
    await element.updateComplete;
    expect(mock.element.getAttribute('aria-label')).to.equal(element.alt);
    expect(mock.element.hasAttribute('autoplay')).to.equal(false);
  });

  test('uses native bounds and centers an off-origin model', async () => {
    const mock = await load();
    expect(element.getDimensions()).to.include({x: 4, y: 2, z: 6});
    expect(element.getBoundingBoxCenter()).to.include({x: 2, y: 3, z: 4});
    await renderAfterUpdate();
    const center =
        mock.element.entityTransform!.transformPoint(new DOMPoint(2, 3, 4));
    expect(center.x).to.be.closeTo(0, 1e-8);
    expect(center.y).to.be.closeTo(0, 1e-8);
    expect(center.z).to.be.lessThan(0);
  });

  test('retains model-viewer orbit and zoom controls', async () => {
    const mock = await load();
    await renderAfterUpdate();
    const initial = mock.element.entityTransform!;
    expect(element[$controls].interactionEnabled).to.equal(true);
    expect(mock.element.getAttribute('stagemode')).to.equal('none');
    element.maxCameraOrbit = 'auto auto 300%';
    element.cameraOrbit = '90deg 90deg 200%';
    await renderAfterUpdate();
    const rotated = mock.element.entityTransform!;
    expect(rotated.m11).to.be.closeTo(0, 1e-8);
    expect(Math.abs(rotated.m13)).to.be.greaterThan(0);
    const initialScale = Math.hypot(initial.m11, initial.m12, initial.m13);
    const rotatedScale = Math.hypot(rotated.m11, rotated.m12, rotated.m13);
    expect(rotatedScale).to.be.lessThan(initialScale);
  });

  test(
      'scales with CSS layout dimensions rather than device pixels',
      async () => {
        const mock = await load();
        await renderAfterUpdate();
        const initialScale = mock.element.entityTransform!.m11;
        element.style.width = '600px';
        element.style.height = '300px';
        element[$updateSize]({width: 600, height: 300});
        await renderAfterUpdate();
        expect(mock.element.entityTransform!.m11)
            .to.be.closeTo(initialScale * 2, 1e-8);
        const descriptor =
            Object.getOwnPropertyDescriptor(self, 'devicePixelRatio')!;
        try {
          Object.defineProperty(
              self, 'devicePixelRatio', {configurable: true, value: 3});
          Renderer.singleton.render(performance.now());
          await renderAfterUpdate();
          expect(mock.element.entityTransform!.m11)
              .to.be.closeTo(initialScale * 2, 1e-8);
        } finally {
          Object.defineProperty(self, 'devicePixelRatio', descriptor);
        }
      });

  test(
      'delegates orbit to the browser when script transforms are rejected',
      async () => {
        fixture.rejectTransforms = true;
        const mock = await load();
        expect(mock.element.getAttribute('stagemode')).to.equal('orbit');
        expect(mock.element.style.pointerEvents).to.equal('auto');
        expect(mock.element.tabIndex).to.equal(0);
        expect(element[$controls].interactionEnabled).to.equal(false);
        element.cameraControls = false;
        await element.updateComplete;
        expect(mock.element.getAttribute('stagemode')).to.equal('none');
        expect(mock.element.style.pointerEvents).to.equal('none');
      });

  test('uses native fitting when bounds are unavailable', async () => {
    fixture.exposeBounds = false;
    const mock = await load();
    expect(element[$scene].nativeRenderer!.usesNativeControls).to.equal(true);
    expect(mock.element.getAttribute('stagemode')).to.equal('orbit');
  });

  test(
      'falls back to native orbit if a later transform write fails',
      async () => {
        const mock = await load();
        fixture.rejectTransforms = true;
        element.cameraOrbit = '90deg 90deg 105%';
        await renderAfterUpdate();
        await element.updateComplete;
        expect(mock.element.getAttribute('stagemode')).to.equal('orbit');
        expect(element[$controls].interactionEnabled).to.equal(false);
      });

  test('forwards environment changes to the native model', async () => {
    element.environmentImage = 'environment.hdr';
    const mock = await load();
    expect(mock.environmentMaps)
        .to.include(new URL('environment.hdr', document.baseURI).href);
    const changed = waitForEvent(element, 'environment-change');
    element.environmentImage = 'another.hdr';
    await changed;
    expect(mock.environmentMaps)
        .to.include(new URL('another.hdr', document.baseURI).href);
  });

  test(
      'keeps the homepage viewer native if its HDR environment is unsupported',
      async () => {
        fixture.rejectEnvironment = true;
        element.ar = true;
        element.environmentImage = 'shared-assets/environments/moon_1k.hdr';
        element.shadowIntensity = 1;
        element.poster = 'shared-assets/models/NeilArmstrong.webp';
        const mock = await load('shared-assets/models/NeilArmstrong.glb');
        expect(element.loaded).to.equal(true);
        expect(element[$scene].nativeRenderer!.isActive).to.equal(true);
        expect(element[$scene].currentGLTF).to.equal(null);
        expect(mock.element.isConnected).to.equal(true);
        expect(mock.environmentMaps[mock.environmentMaps.length - 1])
            .to.equal('');
      });

  test(
      'replaces native resources and ignores completion of cancelled loads',
      async () => {
        fixture.autoResolve = false;
        const loadedURLs: string[] = [];
        element.addEventListener(
            'load',
            event => loadedURLs.push((event as CustomEvent).detail.url));
        element.src = 'first.glb';
        document.body.appendChild(element);
        await element.updateComplete;
        const first = fixture.models[0];
        element.src = 'second.glb';
        await element.updateComplete;
        const second = fixture.models[1];
        expect(first.element.isConnected).to.equal(false);
        const loaded = waitForEvent(element, 'load');
        first.resolve();
        second.resolve();
        await loaded;
        await rafPasses();
        expect(loadedURLs).to.deep.equal(['second.glb']);
        expect(element[$scene].url).to.equal('second.glb');
      });

  test('removes native rendering when src is cleared', async () => {
    const mock = await load();
    element.src = null;
    await element.updateComplete;
    expect(element.loaded).to.equal(false);
    expect(mock.element.isConnected).to.equal(false);
    expect(element.shadowRoot!.querySelector('model')).to.equal(null);
  });

  test(
      'does not cancel a new source when Safari aborts the previous one',
      async () => {
        fixture.autoResolve = false;
        element.src = 'first.glb';
        document.body.appendChild(element);
        await element.updateComplete;
        fixture.models[0].reject(
            new DOMException('The operation was aborted.', 'AbortError'));
        element.src = 'second.glb';
        await element.updateComplete;
        const loaded = waitForEvent(element, 'load');
        fixture.models[1].resolve();
        await loaded;
        expect(element[$scene].nativeRenderer!.isActive).to.equal(true);
        expect(element[$scene].url).to.equal('second.glb');
      });

  test(
      'disposes native content when disconnected and reloads when reconnected',
      async () => {
        const mock = await load();
        element.remove();
        await timePasses(20);
        expect(mock.element.isConnected).to.equal(false);
        expect(element.shadowRoot!.querySelector('model')).to.equal(null);
        const loaded = waitForEvent(element, 'load');
        document.body.appendChild(element);
        await loaded;
        expect(fixture.models).to.have.length(2);
        expect(fixture.models[1].element.isConnected).to.equal(true);
      });

  test('can explicitly select the Three.js backend', async () => {
    element.disableNative = true;
    await load(assetPath('models/cube.gltf'));
    expect(element[$scene].externalRenderer).to.equal(null);
    expect(element[$scene].currentGLTF).not.to.equal(null);
    expect(fixture.models).to.have.length(0);
  });

  test('falls back to Three.js when a native resource fails', async () => {
    fixture.autoResolve = false;
    const loaded = load(assetPath('models/cube.gltf'));
    await element.updateComplete;
    fixture.models[0].reject(new Error('Unsupported native resource'));
    await loaded;
    expect(element[$scene].externalRenderer).to.equal(null);
    expect(element[$scene].currentGLTF).not.to.equal(null);
    expect(fixture.models[0].element.isConnected).to.equal(false);
    expect(element[$controls].interactionEnabled).to.equal(true);
  });

  test(
      'falls back to Three.js when Safari aborts the active native resource',
      async () => {
        fixture.autoResolve = false;
        const loaded = load(assetPath('models/cube.gltf'));
        await element.updateComplete;
        fixture.models[0].reject(
            new DOMException('The operation was aborted.', 'AbortError'));
        await loaded;
        expect(element[$scene].externalRenderer).to.equal(null);
        expect(element[$scene].currentGLTF).not.to.equal(null);
        expect(element.loaded).to.equal(true);
      });

  test(
      'uses Three.js for nonuniform scale and extra-model scenes', async () => {
        element.scale = '1 2 3';
        const extra = document.createElement('extra-model');
        extra.src = assetPath('models/cube.gltf');
        element.appendChild(extra);
        await load(assetPath('models/cube.gltf'));
        expect(element[$scene].externalRenderer).to.equal(null);
        expect(element[$scene].models).to.have.length(2);
        expect(fixture.models).to.have.length(0);
      });

  test('loads Three.js geometry on demand for scene export', async () => {
    await load(assetPath('models/cube.gltf'));
    const blob = await element.exportScene();
    expect(blob.size).to.be.greaterThan(0);
    expect(element[$scene].externalRenderer).to.equal(null);
    expect(element[$scene].currentGLTF).not.to.equal(null);
    expect(element.shadowRoot!.querySelector('model')).to.equal(null);
  });

  test(
      'loads geometry when a hotspot is added to a native viewer', async () => {
        await load(assetPath('models/cube.gltf'));
        const loaded = waitForEvent(element, 'load');
        const hotspot = document.createElement('button');
        hotspot.slot = 'hotspot-test';
        hotspot.dataset.position = '0m 0m 0m';
        hotspot.dataset.normal = '0m 1m 0m';
        element.appendChild(hotspot);
        await loaded;
        expect(element[$scene].externalRenderer).to.equal(null);
        expect(element[$scene].currentGLTF).not.to.equal(null);
        expect(element.shadowRoot!.querySelector('model')).to.equal(null);
      });
});
