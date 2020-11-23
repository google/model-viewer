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

import {Cache} from 'three';

import ModelViewerElementBase from '../model-viewer-base.js';
import {CachingGLTFLoader} from '../three-components/CachingGLTFLoader.js';
import {timePasses} from '../utilities.js';

export type Constructor<T = object> = {
  new (...args: any[]): T
};

const expect = chai.expect;

export const BasicSpecTemplate =
    (ModelViewerElementAccessor: () => Constructor<ModelViewerElementBase>,
     tagNameAccessor: () => string) => {
      teardown(() => {
        CachingGLTFLoader.clearCache();
        Cache.clear();
      });

      test('can be directly instantiated', () => {
        const ModelViewerElement = ModelViewerElementAccessor();
        const element = new ModelViewerElement();
        expect(element).to.be.ok;
      });

      test('can be instantiated with document.createElement', () => {
        const tagName = tagNameAccessor();
        const element = document.createElement(tagName);
        expect(element).to.be.ok;
      });

      suite('compatibility', () => {
        suite('when WebGL is not supported', () => {
          let nativeGetContext: any;

          setup(() => {
            nativeGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(
                type: string, ...args: Array<any>) {
              if (/webgl/.test(type)) {
                return null;
              }
              return nativeGetContext.call(this, type, ...args);
            };
          });

          teardown(() => {
            HTMLCanvasElement.prototype.getContext = nativeGetContext;
          });

          test(
              'does not explode when created and appended to the document',
              async () => {
                const ModelViewerElement = ModelViewerElementAccessor();
                const element = new ModelViewerElement();
                document.body.insertBefore(element, document.body.firstChild);
                await timePasses();
                document.body.removeChild(element);
              });
        });
      });
    };
