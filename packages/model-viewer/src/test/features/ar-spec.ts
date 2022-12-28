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

import {IS_ANDROID, IS_IOS} from '../../constants.js';
import {$openIOSARQuickLook, $openSceneViewer} from '../../features/ar.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {waitForEvent} from '../../utilities.js';
import {assetPath, rafPasses, spy} from '../helpers.js';

const expect = chai.expect;

suite('AR', () => {
  let element: ModelViewerElement;
  let intentUrls: Array<string>;
  let restoreAnchorClick: () => void;

  setup(() => {
    element = new ModelViewerElement();
    document.body.insertBefore(element, document.body.firstChild);
    intentUrls = [];
    restoreAnchorClick = spy(HTMLAnchorElement.prototype, 'click', {
      value: function() {
        intentUrls.push((this as HTMLAnchorElement).href);
      }
    });
  });

  teardown(() => {
    if (element.parentNode != null) {
      element.parentNode.removeChild(element);
    }
    restoreAnchorClick();
  });

  suite('openSceneViewer', () => {
    test('preserves query parameters in model URLs', () => {
      element.src = 'https://example.com/model.gltf?token=foo';
      element.alt = 'Example model';
      (element as any)[$openSceneViewer]();

      expect(intentUrls.length).to.be.equal(1);

      const search = new URLSearchParams(new URL(intentUrls[0]).search);

      expect(search.get('token')).to.equal('foo');
    });

    test('keeps title and link when supplied', () => {
      element.src =
          'https://example.com/model.gltf?link=http://linkme.com&title=bar';
      element.alt = 'alt';
      (element as any)[$openSceneViewer]();

      expect(intentUrls.length).to.be.equal(1);

      const search = new URLSearchParams(new URL(intentUrls[0]).search);

      expect(search.get('title')).to.equal('bar');
      expect(search.get('link')).to.equal('http://linkme.com/');
    });

    test('sets sound and link to absolute URLs', () => {
      element.src =
          'https://example.com/model.gltf?link=foo.html&sound=bar.ogg';
      element.alt = 'alt';
      (element as any)[$openSceneViewer]();

      expect(intentUrls.length).to.be.equal(1);

      const search = new URLSearchParams(new URL(intentUrls[0]).search);

      // Tests run in different locations
      expect(search.get('sound')).to.contain('http://');
      expect(search.get('sound')).to.contain('/bar.ogg');
      expect(search.get('link')).to.contain('http://');
      expect(search.get('link')).to.contain('/foo.html');
    });

    test('strips hash params from SceneViewer model src', () => {
      element.src =
          'https://example.com/model.gltf#applePayButtonType=plain&checkoutTitle=TitleText';
      element.alt = 'alt';
      (element as any)[$openSceneViewer]();

      expect(intentUrls.length).to.be.equal(1);

      const search = new URLSearchParams(new URL(intentUrls[0]).search);
      const file = new URL( search.get('file') as any );
      
      expect(file.hash).to.equal('');
    });

    test('strips hash params but preserves query params', () => {
      element.src =
          'https://example.com/model.gltf?link=http://linkme.com&title=bar#applePayButtonType=plain&checkoutTitle=TitleText';
      element.alt = 'alt';
      (element as any)[$openSceneViewer]();

      expect(intentUrls.length).to.be.equal(1);

      const search = new URLSearchParams(new URL(intentUrls[0]).search);
      const file = new URL( search.get('file') as any );
      
      expect(file.hash).to.equal('');
      expect(search.get('title')).to.equal('bar');
      expect(search.get('link')).to.equal('http://linkme.com/');
    });

  });

  suite('openQuickLook', () => {
    test('sets hash for fixed scale', () => {
      element.src = 'https://example.com/model.gltf';
      element.iosSrc = 'https://example.com/model.usdz';
      element.arScale = 'fixed';
      (element as any)[$openIOSARQuickLook]();

      expect(intentUrls.length).to.be.equal(1);

      const url = new URL(intentUrls[0]);

      expect(url.pathname).equal('/model.usdz');
      expect(url.hash).to.equal('#allowsContentScaling=0');
    });

    test('keeps original hash too', () => {
      element.src = 'https://example.com/model.gltf';
      element.iosSrc =
          'https://example.com/model.usdz#custom=path-to-banner.html';
      element.arScale = 'fixed';
      (element as any)[$openIOSARQuickLook]();

      expect(intentUrls.length).to.be.equal(1);

      const url = new URL(intentUrls[0]);

      expect(url.pathname).equal('/model.usdz');
      expect(url.hash).to.equal(
          '#custom=path-to-banner.html&allowsContentScaling=0');
    });

    test('replicate src hash to usdz blob url', async () => {
      element.src =
          assetPath('models/cube.gltf') + '#custom=path-to-banner.html';
      element.arModes = 'webxr scene-viewer quick-look';

      await (element as any)[$openIOSARQuickLook]();

      expect(intentUrls.length).to.be.equal(1);

      const url = new URL(intentUrls[0]);

      expect(url.protocol).to.equal('blob:');

      expect(url.hash).to.equal('#custom=path-to-banner.html');
    });

    test(
        'replicate src hash to usdz blob and set hash for fixed scale',
        async () => {
          element.src =
              assetPath('models/cube.gltf') + '#custom=path-to-banner.html';
          element.arModes = 'webxr scene-viewer quick-look';
          element.arScale = 'fixed';

          await (element as any)[$openIOSARQuickLook]();

          expect(intentUrls.length).to.be.equal(1);

          const url = new URL(intentUrls[0]);

          expect(url.protocol).to.equal('blob:');

          expect(url.hash).to.equal(
              '#custom=path-to-banner.html&allowsContentScaling=0');
        });
  });

  suite('shows the AR button', () => {
    setup(async () => {
      element.ar = true;
      element.src = assetPath('models/Astronaut.glb');

      await waitForEvent(element, 'poster-dismissed');
    });

    // This fails on Android when karma.conf has hostname: 'bs-local.com',
    // possibly due to not serving over HTTPS (which disables WebXR)? However,
    // Browserstack is unstable without this hostname.
    test('if on a WebXR platform', () => {
      expect(element.canActivateAR).to.be.equal(IS_ANDROID || IS_IOS);
    });

    test('with an ios-src on iOS', async () => {
      element.iosSrc = assetPath('models/Astronaut.usdz');
      await rafPasses();
      expect(element.canActivateAR).to.be.equal(IS_ANDROID || IS_IOS);
    });
  });
});
