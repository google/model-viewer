# `<model-viewer-effects>`

 [![Min Zip](https://badgen.net/bundlephobia/minzip/@beilinson/model-viewer-effects)](https://bundlephobia.com/result?p=@beilinson/model-viewer-effects)

`<model-viewer-effects>` is a web component library addon for `<model-viewer>` that exposes a simple API for adding post-processing
effects to your models easy to do, on as many browsers and devices as possible.

`<model-viewer-effects>` strives to give you great defaults for rendering quality and
performance.

## Usage
Using effects is as simple as adding the `mv-effect-composer>` inside your `<model-viewer>`.

```html
<model-viewer src="...">
  <effect-composer>
    <bloom-effect></bloom-effect>
  </effect-composer>
</model-viewer>
```

There is no documentation yet, but you may refer to the types for all available properties.

### *XR Support*
The effects are not supported in the `<model-viewer>` XR modes, which will render as usual.

## Status
`<model-viewer-effects>` is in early development. Currently, it relies on my fork of `<model-viewer>`: 

`@beilinson/model-viewer`. 

## Installing

The `<model-viewer-effects>` library can be installed from [NPM](https://npmjs.org):

```sh
npm install three @beilinson/model-viewer @beilinson/model-viewer-effects
```

Or using jsDeliver:

```html
<script type="module" src=" https://cdn.jsdelivr.net/npm/@beilinson/model-viewer-effects@0.0.4/dist/model-viewer-effects.min.js "></script>
```

## Browser Support

`<model-viewer-effects>` is supported on the last 2 major versions of all evergreen
desktop and mobile browsers, and on all platforms (Android, IOS, MacOS, Windows, Linux).

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
`npm run test`                  | Run `<model-viewer-effects>` unit tests
`npm run clean`                 | Deletes all build artifacts
`npm run dev`                   | Starts `tsc` and `rollup` in "watch" mode, causing artifacts to automatically rebuild upon incremental changes

