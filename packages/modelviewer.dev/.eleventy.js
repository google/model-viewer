const path = require('path');

const stripQuotationMarks = (string) => string.replace(/^['"]/, '').replace(/['"']$/, '');

const assetData = (name, inventory) => {
  if (inventory == null) {
    throw new Error('Cannot look up assets without an inventory; did you create an inventory.json?');
  }

  const {assets, licenses, authors} = inventory;
  let asset = assets.find((asset) => asset.name === name);
  console.log('Asset:',asset);

  if (asset == null) {
    throw new Error(`Asset "${name}" not found; did you add it to inventory.json?`);
  }

  const {license, author} = asset;

  // Shallow clone the object because 11ty preserves mutations to it:
  asset = {...asset}
  asset.license = licenses.find((l) => l.name === license);

  if (asset.license == null) {
    throw new Error(`Asset "${name}" license ("${license}") not found; did you add it to inventory.json?`);
  }

  asset.author = authors.find((a) => a.name === author);

  if (asset.author == null) {
    throw new Error(`Asset "${name}" author ("${author}") not found; did you add it to inventory.json?`);
  }

  return asset;
};

const rootRelativeTag = (eleventy) => eleventy.addLiquidTag('rootRelative', (liquidEngine) => ({
    parse(tagToken, _otherTokens) {
      this.file = stripQuotationMarks(tagToken.args);
    },
    render(scope, _hash) {
      const { page } = scope.contexts[0];
      const { url } = page;

      return path.join(path.relative(url, '/'), this.file);
    }
  }));

const attributionTag = (eleventy) => eleventy.addLiquidTag('attribution', (liquidEngine) => ({
    parse(tagToken, _otherTokens) {
      this.assetName = tagToken.args;
    },
    render(scope, _hash) {
      let assetName = stripQuotationMarks(this.assetName);

      // If the name is not quoted, then perform a variable lookup:
      if (assetName === this.assetName) {
        const context = scope.contexts[scope.contexts.length - 1];
        assetName = context[this.assetName];
      }

      if (!assetName) {
        throw new Error('No asset name specificed for attribution');
      }

      const asset = assetData(assetName, scope.contexts[0]['inventory']);

      if (asset == null) {
        throw new Error(`No attribution found for "${assetName}"; add one to inventory.json!"`);
      }

      return `<a href="${asset.url}" target="_blank">${asset.name}</a> by <a href="${asset.author.url}" target="_blank">${asset.author.name}</a>,
licensed under <a href="${asset.license.url}" target="_blank">${asset.license.name}</a>`;
    }
  }));

module.exports = (eleventy) => {
  const passthroughPaths = [
    'assets',
    'shared-assets/models',
    'shared-assets/environments',
    'node_modules/@webcomponents/webcomponentsjs',
    'node_modules/@google/model-viewer/dist',
    'node_modules/focus-visible/dist',
    'node_modules/resize-observer-polyfill',
    'node_modules/intersection-observer',
  ];

  const customTags = [
    rootRelativeTag,
    attributionTag
  ];

  eleventy.setLiquidOptions({
    extname: '.html'
  });

  passthroughPaths.forEach(path => eleventy.addPassthroughCopy(path));

  customTags.forEach(addCustomTag => addCustomTag(eleventy));

  return {
    dir: {
      input: 'content',
      includes: 'includes',
      layouts: 'layouts',
      data: 'data',
      output: 'dist'
    }
  };
};