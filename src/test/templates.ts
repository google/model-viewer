import ModelViewerElementBase from '../model-viewer-base.js';
import {timePasses} from './helpers.js';

export type Constructor<T = object> = {
  new (...args: any[]): T
};

const expect = chai.expect;

export const BasicSpecTemplate =
    (ModelViewerElementAccessor: () => Constructor<ModelViewerElementBase>,
     tagNameAccessor: () => string) => {
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
                document.body.appendChild(element);
                await timePasses();
                document.body.removeChild(element);
              });
        });
      });
    };
