import {FakeModelKernel} from '../test-helpers.js';

import {defineThreeDOMElement} from './three-dom-element.js';

suite('three-dom-element', () => {
  suite('defineThreeDOMElement', () => {
    test('yields a valid constructor', () => {
      const GeneratedConstructor = defineThreeDOMElement();
      const instance = new GeneratedConstructor(new FakeModelKernel());

      expect(instance).to.be.ok;
    });

    test('produces elements with the correct owner model', () => {
      const kernel = new FakeModelKernel();
      const GeneratedConstructor = defineThreeDOMElement();
      const instance = new GeneratedConstructor(kernel);

      expect(instance.ownerModel).to.be.equal(kernel.model);
    });
  });
});