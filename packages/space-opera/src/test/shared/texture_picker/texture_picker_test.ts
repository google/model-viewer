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


import '../../../components/shared/texture_picker/texture_picker.js';

import {expect} from '@esm-bundle/chai';

import {FileDetails, TexturePicker} from '../../../components/shared/texture_picker/texture_picker.js';
import {createSafeObjectURL} from '../../../components/utils/create_object_url.js';
import {generatePngBlob} from '../../utils/test_utils.js';

suite('texture picker test', () => {
  let texturePicker: TexturePicker;

  setup(async () => {
    texturePicker = new TexturePicker();
    texturePicker.images = [
      createSafeObjectURL(await generatePngBlob('#000')),
      createSafeObjectURL(await generatePngBlob('#fff')),
    ];
    document.body.appendChild(texturePicker);
    await texturePicker.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(texturePicker);
  });

  test('exists', () => {
    expect(texturePicker instanceof HTMLElement).to.be.equal(true);
    expect(texturePicker.tagName).to.be.equal('ME-TEXTURE-PICKER');
  });

  test('dispatches an event when select an image', () => {
    let nCalled = 0;
    const handler = () => ++nCalled;
    texturePicker.addEventListener('texture-changed', handler);

    const input = texturePicker.shadowRoot!.querySelectorAll('input')[1];
    input.click();

    expect(nCalled).to.be.eq(1);
    expect(texturePicker.selectedIndex).to.be.equal(1);
  });

  test('dispatches an event after uploading an image', async () => {
    let nCalled = 0;
    let arg;
    const handler = (a) => {
      arg = a;
      ++nCalled;
    };
    texturePicker.addEventListener('texture-uploaded', handler);

    const fileInput = texturePicker.shadowRoot!.querySelector(
                          'input#texture-input') as HTMLInputElement;

    const fileList = new DataTransfer();
    fileList.items.add(new File(['test'], 'testname', {type: 'image/jpeg'}));
    fileInput.files = fileList.files;

    fileInput.dispatchEvent(new CustomEvent('change'));

    expect(nCalled).to.be.eq(1);
    const {url, type} = arg.detail as FileDetails;
    expect(url).to.contain('blob:');
    expect(type).to.be.equal('image/jpeg');
  });

  test(
      'dispatches an event with undefined selectedIndex on null texture click',
      async () => {
        let nCalled = 0;
        const handler = () => ++nCalled;
        texturePicker.addEventListener('texture-changed', handler);

        texturePicker.selectedIndex = 0;
        await texturePicker.updateComplete;
        const nullTextureSquare =
            texturePicker.shadowRoot!.querySelector(
                'div.NullTextureSquareInList') as HTMLInputElement;
        expect(nullTextureSquare).to.be.ok;
        nullTextureSquare.click();

        expect(nCalled).to.be.eq(1);
        expect(texturePicker.selectedIndex).not.to.be.ok;
      });
});
