import {generateInitializer} from './initialize.js'

suite('initialize', () => {
  suite('generateInitializer', () => {
    test('yields a string of JS that can be evaluated', () => {
      const implementationString = generateInitializer();
      expect(implementationString.length).to.be.greaterThan(0);
      const fn = new Function(implementationString);
      expect(fn).to.be.ok;
    });

    test('yields a string that defines an initialize function', () => {
      const implementationString = generateInitializer();
      expect(implementationString).to.match(/function initialize/);
    });
  });
});