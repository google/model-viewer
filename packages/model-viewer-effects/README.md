# `<model-viewer-effects>`

`<model-viewer-effects>` is a web component library addon for `<model-viewer>` that exposes a simple API for adding post-processing
effects to your models - optionally in AR - easy to do, on as many browsers and devices as possible.
`<model-viewer-effects>` strives to give you great defaults for rendering quality and
performance.

[Documentation](https://modelviewer.dev/)


## Installing

The `<model-viewer-effects>` library can be installed from [NPM](https://npmjs.org):

```sh
npm install @google/model-viewer-effects
```

It can also be used directly from various free CDNs such as [unpkg.com](https://unpkg.com):

```html
<script type="module" src="https://unpkg.com/@google/model-viewer-effects/dist/model-viewer-effects.min.js"></script>
```

For more detailed usage documentation and live examples, please visit our docs
at [modelviewer.dev](https://modelviewer.dev)!

## Browser Support

`<model-viewer-effects>` is supported on the last 2 major versions of all evergreen
desktop and mobile browsers.

|               | <img src="https://github.com/alrra/browser-logos/raw/master/src/chrome/chrome_32x32.png" width="16"> Chrome | <img src="https://github.com/alrra/browser-logos/raw/master/src/firefox/firefox_32x32.png" width="16"> Firefox | <img src="https://github.com/alrra/browser-logos/raw/master/src/safari/safari_32x32.png" width="16"> Safari | <img src="https://github.com/alrra/browser-logos/raw/master/src/edge/edge_32x32.png" width="16"> Edge |
| -------- | --- | --- | --- | --- |
| Desktop  | ✅  | ✅  | ✅  | ✅  |
| Mobile   | ✅  | ✅  | ✅  | ✅  |

`<model-viewer-effects>` builds upon standard web platform APIs so that the performance,
capabilities and compatibility of the library get better as the web evolves.

## Development

To get started, follow the instructions in [the main README.md file](../../README.md).

The following commands are available when developing `<model-viewer-effects>`:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Builds all `<model-viewer-effects>` distributable files
`npm run build:dev`             | Builds a subset of distributable files (faster than `npm run build`)
`npm run test`                  | Run `<model-viewer>` unit tests
`npm run clean`                 | Deletes all build artifacts
`npm run dev`                   | Starts `tsc` and `rollup` in "watch" mode, causing artifacts to automatically rebuild upon incremental changes

