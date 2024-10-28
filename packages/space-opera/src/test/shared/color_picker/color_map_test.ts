/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
 *
 */

import '../../../components/shared/color_picker/color_map.js';

import {expect} from 'chai';

import {ColorMap} from '../../../components/shared/color_picker/color_map.js';

suite('color map test', () => {
  let colorMap: ColorMap;

  setup(async () => {
    colorMap = new ColorMap();
    document.body.appendChild(colorMap);

    await colorMap.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(colorMap);
  });

  test('dispatches a color change event on mouse event', async () => {
    let nCalled = 0;
    const handler = () => ++nCalled;
    colorMap.addEventListener('change', handler);

    // Click a position relative to the top-left, for a more robust test.
    const mapRect = colorMap.getBoundingClientRect();
    const fakeMouseEvent = new MouseEvent(
        'mouseup', {clientX: mapRect.x + 92, clientY: mapRect.y + 82});

    colorMap.onMouseEvent(fakeMouseEvent);

    await colorMap.updateComplete;

    expect(colorMap.saturation).to.be.equal(0.46);
    // Allow some room for error in the value.
    expect(colorMap.value).to.be.lessThan(118);
    expect(colorMap.value).to.be.greaterThan(115);

    expect(nCalled).to.be.eq(1);
  });
});
