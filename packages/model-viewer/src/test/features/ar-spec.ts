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
import {$openIOSARQuickLook, $openSceneViewer, ARInterface, ARMixin} from '../../features/ar.js';
import ModelViewerElementBase from '../../model-viewer-base.js';
import {Constructor, timePasses, waitForEvent} from '../../utilities.js';
import {assetPath, spy} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;

suite('ModelViewerElementBase with ARMixin', () => {
  suite('when registered', () => {
    let nextId = 0;
    let tagName: string;
    let ModelViewerElement: Constructor<ModelViewerElementBase&ARInterface>;

    setup(() => {
      tagName = `model-viewer-ar-${nextId++}`;
      ModelViewerElement = class extends ARMixin
      (ModelViewerElementBase) {
        static get is() {
          return tagName;
        }
      };
      customElements.define(tagName, ModelViewerElement);
    });

    BasicSpecTemplate(() => ModelViewerElement, () => tagName);

    suite('AR intents', () => {
      let element: ModelViewerElementBase&ARInterface;
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
      });
    });

    suite('with webxr', () => {
      let element: ModelViewerElementBase&ARInterface;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);

        element.ar = true;
        element.arModes = 'webxr';
        element.src = assetPath('models/Astronaut.glb');

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('shows the AR button if on a WebXR platform', () => {
        expect(element.canActivateAR).to.be.equal(IS_ANDROID);
      });
    });

    suite('ios-src', () => {
      let element: ModelViewerElementBase&ARInterface;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);

        element.ar = true;
        element.src = assetPath('models/Astronaut.glb');

        await waitForEvent(element, 'load');
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      if (IS_IOS) {
        suite('on iOS Safari', () => {
          test('hides the AR button', () => {
            expect(element.canActivateAR).to.be.equal(false);
          });

          suite('with an ios-src', () => {
            setup(async () => {
              element.iosSrc = assetPath('models/Astronaut.usdz');
              await timePasses();
            });

            test('shows the AR button', () => {
              expect(element.canActivateAR).to.be.equal(true);
            });
          });
        });
      } else if (!IS_ANDROID) {
        suite('on browsers that do not support AR', () => {
          test('hides the AR button', () => {
            expect(element.canActivateAR).to.be.equal(false);
          });

          suite('with an ios-src', () => {
            setup(async () => {
              element.iosSrc = assetPath('models/Astronaut.usdz');
              await timePasses();
            });

            test('still hides the AR button', () => {
              expect(element.canActivateAR).to.be.equal(false);
            });
          });
        });
      }
    });
  });
});
