<p align="center">
  <img alt="A 3D model of an astronaut" src="screenshot.png" width="480">
</p>

# `<model-viewer>`

 [![Build Status](https://github.com/google/model-viewer/workflows/Unit%20tests/badge.svg?branch=master)](https://github.com/google/model-viewer/actions?query=branch%3Amaster)
 [![NPM](https://img.shields.io/npm/v/@google/model-viewer.svg)](https://www.npmjs.com/package/@google/model-viewer)
 [![Bundlephobia](https://badgen.net/bundlephobia/minzip/@google/model-viewer)](https://bundlephobia.com/result?p=@google/model-viewer)
 [![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/model-viewer)

`<model-viewer>` is a web component that makes rendering interactive 3D
models - optionally in AR - easy to do, on as many browsers and devices as possible.
`<model-viewer>` strives to give you great defaults for rendering quality and
performance.

As new standards and APIs become available `<model-viewer>` will be improved
to take advantage of them. If possible, fallbacks and polyfills will be
supported to provide a seamless development experience.

[Demo](https://model-viewer.glitch.me) • [Documentation](https://modelviewer.dev/) • [Kanban](https://github.com/google/model-viewer/projects/1) • [Quality Tests](https://modelviewer.dev/fidelity/)


## Installing

The `<model-viewer>` web component can be installed from [NPM](https://npmjs.org):

```sh
npm install @google/model-viewer
```

It can also be used directly from various free CDNs such as [unpkg.com](https://unpkg.com):

```html
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
```

For more detailed usage documentation and live examples, please visit our docs
at [modelviewer.dev](https://modelviewer.dev)!

### Important note about versions
Our goal for `<model-viewer>` is to be a consistent, stable part of your web
platform while continuing to deliver cutting-edge features. We’ll always try
to minimize breaking changes, and to keep the component backwards compatible.
See our [guide to contributing](../../CONTRIBUTING.md#Stability) for more
information on backwards compatibility.

For your production site you may want the extra stability that comes by
pinning to a specific version, and upgrading on your own schedule (after
testing).

If you’ve installed via [NPM](https://npmjs.org), you’re all set - you’ll only
upgrade when you run [`npm update`](https://docs.npmjs.com/cli/update.html).

If you’re using [unpkg.com](https://unpkg.com), you can pin to a specific
version by specifying it in the URL. Replace the `<version>` tag in the sample
below with the full version number (like `0.10.0`) to be pinned to.

```html
<!-- Loads <model-viewer> for modern browsers: -->
<script type="module"
    src="https://unpkg.com/@google/model-viewer@<version>/dist/model-viewer.min.js">
</script>
```


## Browser Support

`<model-viewer>` is supported on the last 2 major versions of all evergreen
desktop and mobile browsers.

|               | <img src="https://github.com/alrra/browser-logos/raw/master/src/chrome/chrome_32x32.png" width="16"> Chrome | <img src="https://github.com/alrra/browser-logos/raw/master/src/firefox/firefox_32x32.png" width="16"> Firefox | <img src="https://github.com/alrra/browser-logos/raw/master/src/safari/safari_32x32.png" width="16"> Safari | <img src="https://github.com/alrra/browser-logos/raw/master/src/edge/edge_32x32.png" width="16"> Edge |
| -------- | --- | --- | --- | --- |
| Desktop  | ✅  | ✅  | ✅  | ✅  |
| Mobile   | ✅  | ✅  | ✅  | ✅  |

`<model-viewer>` builds upon standard web platform APIs so that the performance,
capabilities and compatibility of the library get better as the web evolves.

## Development

To get started, follow the instructions in [the main README.md file](../../README.md).

The following commands are available when developing `<model-viewer>`:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Builds all `<model-viewer>` distributable files
`npm run build:dev`             | Builds a subset of distributable files (faster than `npm run build`)
`npm run test`                  | Run `<model-viewer>` unit tests
`npm run clean`                 | Deletes all build artifacts
`npm run dev`                   | Starts `tsc` and `rollup` in "watch" mode, causing artifacts to automatically rebuild upon incremental changes

