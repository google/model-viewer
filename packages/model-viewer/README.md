> ## 🛠 Status: In Development
> `<model-viewer>` is currently in development. It's on the fast track to a 1.0 release, so we encourage you to use it and give us your feedback, but there are things that haven't been finalized yet and you can expect some changes.

<p align="center">
  <img alt="A 3D model of an astronaut" src="screenshot.png" width="480">
</p>

# `<model-viewer>`

 [![Build Status](https://api.travis-ci.org/GoogleWebComponents/model-viewer.svg?branch=master)](https://travis-ci.org/GoogleWebComponents/model-viewer)
 [![NPM](https://img.shields.io/npm/v/@google/model-viewer.svg)](https://www.npmjs.com/package/@google/model-viewer)
 [![Bundlephobia](https://badgen.net/bundlephobia/minzip/@google/model-viewer)](https://bundlephobia.com/result?p=@google/model-viewer)

`<model-viewer>` is a web component that makes rendering interactive 3D
models - optionally in AR - easy to do, on as many browsers and devices as possible.
`<model-viewer>` strives to give you great defaults for rendering quality and
performance.

As new standards and APIs become available `<model-viewer>` will be improved
to take advantage of them. If possible, fallbacks and polyfills will be
supported to provide a seamless development experience.

[Demo](https://model-viewer.glitch.me) • [Documentation](https://googlewebcomponents.github.io/model-viewer/index.html) • [Kanban](https://github.com/GoogleWebComponents/model-viewer/projects/1) • [Quality Tests](https://googlewebcomponents.github.io/model-viewer/test/fidelity/results-viewer.html)


## Installing

The `<model-viewer>` web component can be installed from [NPM](https://npmjs.org):

```sh
npm install @google/model-viewer
```

It can also be used directly from various free CDNs such as [unpkg.com](https://unpkg.com):

```html
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.js"></script>
<script nomodule src="https://unpkg.com/@google/model-viewer/dist/model-viewer-legacy.js"></script>
```

For more detailed usage documentation and live examples, please visit our docs
at [modelviewer.dev](https://modelviewer.dev)!

## Browser Support

`<model-viewer>` is supported on the last 2 major versions of all evergreen
desktop and mobile browsers. `<model-viewer>` is also supported on IE11.

|               | <img src="https://github.com/alrra/browser-logos/raw/master/src/chrome/chrome_32x32.png" width="16"> Chrome | <img src="https://github.com/alrra/browser-logos/raw/master/src/firefox/firefox_32x32.png" width="16"> Firefox | <img src="https://github.com/alrra/browser-logos/raw/master/src/safari/safari_32x32.png" width="16"> Safari | <img src="https://github.com/alrra/browser-logos/raw/master/src/edge/edge_32x32.png" width="16"> Edge | <img src="https://github.com/alrra/browser-logos/raw/master/src/archive/internet-explorer_9-11/internet-explorer_9-11_32x32.png" width="16"> IE11 |
| -------- | --- | --- | --- | --- | --- |
| Desktop  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Mobile   | ✅  | ✅  | ✅  | ✅  | N/A |

`<model-viewer>` builds upon standard web platform APIs so that the performance,
capabilities and compatibility of the library get better as the web evolves.

However, not all browsers support all of these features today. **Check out
[POLYFILLS.md](https://github.com/PolymerLabs/model-viewer/blob/master/POLYFILLS.md) to
learn how to polyfill for maximum browser compatibility!**

## Development

To get started, follow the instructions in [the main README.md file](../../README.md).

The following commands are available when developing `<model-viewer>`:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Builds all `<model-viewer>` distributable files
`npm run build:dev`             | Builds a subset of distributable files (faster than `npm run build`)
`npm run test`                  | Run `<model-viewer>` unit tests
`npm run clean`                 | Deletes all build artifacts
`npm run create-legacy-bundles` | Generates IE11-compatible bundles (run `npm run build` first)
`npm run dev`                   | Starts `tsc` and `rollup` in "watch" mode, causing artifacts to automatically rebuild upon incremental changes

