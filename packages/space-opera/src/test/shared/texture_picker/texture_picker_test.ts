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

import {FileDetails, TexturePicker} from '../../../components/shared/texture_picker/texture_picker.js';
import {createSafeObjectURL} from '../../../components/utils/create_object_url.js';
import {generatePngBlob} from '../../utils/test_utils.js';

describe('texture picker test', () => {
  let texturePicker: TexturePicker;

  beforeEach(async () => {
    texturePicker = new TexturePicker();
    texturePicker.images = [
      createSafeObjectURL(await generatePngBlob('#000')),
      createSafeObjectURL(await generatePngBlob('#fff')),
    ];
    document.body.appendChild(texturePicker);
    await texturePicker.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(texturePicker);
  });

  it('exists', () => {
    expect(texturePicker instanceof HTMLElement).toBe(true);
    expect(texturePicker.tagName).toEqual('ME-TEXTURE-PICKER');
  });

  it('dispatches an event when select an image', () => {
    const dispatchEventSpy = spyOn(texturePicker, 'dispatchEvent');

    const input = texturePicker.shadowRoot!.querySelectorAll('input')[1];
    input.click();

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    expect(texturePicker.selectedIndex).toBe(1);
  });

  it('dispatches an event after uploading an image', async () => {
    const eventListenerSpy = jasmine.createSpy('handler');
    texturePicker.addEventListener('texture-uploaded', eventListenerSpy);

    const fileInput = texturePicker.shadowRoot!.querySelector(
                          'input#texture-input') as HTMLInputElement;

    const fileList = new DataTransfer();
    fileList.items.add(new File(['test'], 'testname', {type: 'image/jpeg'}));
    fileInput.files = fileList.files;

    fileInput.dispatchEvent(new CustomEvent('change'));

    expect(eventListenerSpy).toHaveBeenCalledTimes(1);
    const eventListenerArguments = eventListenerSpy.calls.first().args;
    expect(eventListenerArguments.length).toBe(1);
    const {url, type} = eventListenerArguments[0].detail as FileDetails;
    expect(url).toBeInstanceOf(String);
    expect(type).toEqual('image/jpeg');
  });

  it('dispatches an event with undefined selectedIndex on null texture click',
     async () => {
       const dispatchEventSpy = spyOn(texturePicker, 'dispatchEvent');

       texturePicker.selectedIndex = 0;
       await texturePicker.updateComplete;
       const nullTextureSquare =
           texturePicker.shadowRoot!.querySelector(
               'div.NullTextureSquareInList') as HTMLInputElement;
       expect(nullTextureSquare).toBeDefined();
       nullTextureSquare.click();

       expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
       expect(texturePicker.selectedIndex).not.toBeDefined();
     });
});
