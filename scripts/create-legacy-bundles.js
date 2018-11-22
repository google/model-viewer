const fs = require('fs').promises;
const {jsTransform} = require('polymer-build/lib/js-transform');

const bundlesToTransform = [
  './dist/model-viewer.js',
  './dist/unit-tests.js',
  './examples/built/dependencies.js'
];

console.log('Generating legacy bundles for IE11 compatibility...');

const transformation = (async () => {
  for (const bundlePath of bundlesToTransform) {
    console.log(' 🚧', bundlePath);
    const file = await fs.readFile(bundlePath);
    const transformed = jsTransform(file.toString('utf8'), {compile: 'es5'});
    await fs.writeFile(bundlePath.replace('.js', '-legacy.js'), transformed);
  }
  console.log(' ✅ Legacy bundles finished building successfully!');
})();

transformation.catch(error => {
  console.warn(' 🚨 Error while generating legacy bundles:');
  console.error(error);
});
