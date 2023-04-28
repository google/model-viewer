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

import {Hotspot, HotspotVisibilityDetails} from '../../three-components/Hotspot.js';
import {waitForEvent} from '../../utilities.js';

suite('Hotspot', () => {
  suite('with only a name', () => {
    test('has a DOM element', () => {
      expect(new Hotspot({name: 'foo'}).element).to.be.ok;
    });
  });


  suite('with assigned nodes', () => {
    let host: HTMLElement;
    let assigned: HTMLElement;

    setup(() => {
      host = document.createElement('div');
      host.attachShadow({mode: 'open'});

      assigned = document.createElement('div');
      host.appendChild(assigned);

      document.body.insertBefore(host, document.body.firstChild);
    });

    teardown(() => {
      document.body.removeChild(host);
    });

    suite('with a configured visibilityAttribute', () => {
      let hotspot: Hotspot;

      setup(async () => {
        hotspot = new Hotspot({name: 'foo'});
        host.shadowRoot!.appendChild(hotspot.element);
        assigned.slot = 'foo';
        assigned.setAttribute('data-visibility-attribute', 'bar');
      });

      suite('when shown', () => {
        setup(() => {
          hotspot.show();
        });

        test('adds a corresponding data-* attribute to assigned nodes', () => {
          expect(assigned.hasAttribute('data-bar')).to.be.true;
        });

        suite('and then hidden', () => {
          setup(() => {
            hotspot.hide();
          });

          test('removes the corresponding data-* attribute', () => {
            expect(assigned.hasAttribute('data-bar')).to.be.false;
          });
        });
      });
    });

    suite('when shown', () => {
      let event: CustomEvent<HotspotVisibilityDetails>;
      let hotspot: Hotspot;

      setup(async () => {
        hotspot = new Hotspot({name: 'foo'});
        host.shadowRoot!.appendChild(hotspot.element);

        assigned.slot = 'foo';

        const assignedNodeHides = waitForEvent(assigned, 'hotspot-visibility');

        hotspot.show();

        event = await (
            assignedNodeHides as
            Promise<CustomEvent<HotspotVisibilityDetails>>);
      });

      test('dispatches a "visibility-change" on assigned nodes', async () => {
        expect(event.detail.visible).to.be.true;
      });


      suite('and then hidden', () => {
        test('dispatches a "visibility-change" on assigned nodes', async () => {
          const assignedNodeHides =
              waitForEvent(assigned, 'hotspot-visibility');

          hotspot.hide();

          const event = await (
              assignedNodeHides as
              Promise<CustomEvent<HotspotVisibilityDetails>>);

          expect(event.detail.visible).to.be.false;
        });
      });
    });
  });
});