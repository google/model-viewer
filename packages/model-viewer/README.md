<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.1/model-viewer.min.js"></script>
<p align="center">
  <model-viewer alt="Neil Armstrong's Spacesuit from the Smithsonian Digitization Programs Office and National Air and Space Museum" src="https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb" ar environment-image="https://modelviewer.dev/shared-assets/environments/moon_1k.hdr" poster="https://modelviewer.dev/shared-assets/models/NeilArmstrong.webp" shadow-intensity="1" camera-controls touch-action="pan-y" style="width: 480px; height: 600px"></model-viewer>
</p>

# `<model-viewer>`

 [![Min Zip](https://badgen.net/bundlephobia/minzip/@google/model-viewer)](https://bundlephobia.com/result?p=@google/model-viewer)
 [![Latest Release](https://img.shields.io/github/v/release/google/model-viewer)](https://github.com/google/model-viewer/releases)

 [![follow on Twitter](https://img.shields.io/twitter/follow/modelviewer?style=social&logo=twitter)](https://twitter.com/intent/follow?screen_name=modelviewer)
 [![Github Discussions](https://img.shields.io/github/stars/google/model-viewer.svg?style=social&label=Star&maxAge=2592000)](https://github.com/google/model-viewer/discussions)

`<model-viewer>` is a web component that makes rendering interactive 3D
models - optionally in AR - easy to do, on as many browsers and devices as possible.
`<model-viewer>` strives to give you great defaults for rendering quality and
performance.

As new standards and APIs become available `<model-viewer>` will be improved
to take advantage of them. If possible, fallbacks and polyfills will be
supported to provide a seamless development experience.

[Demo](https://model-viewer.glitch.me) • [Documentation](https://modelviewer.dev/) • [Quality Tests](https://modelviewer.dev/fidelity/)


## Installing

The `<model-viewer>` web component can be installed from [NPM](https://npmjs.org):

```sh
npm install three @google/model-viewer
```

It can also be used directly from various free CDNs such as [jsDelivr](https://www.jsdelivr.com/package/npm/@google/model-viewer) and Google's own [hosted libraries](https://developers.google.com/speed/libraries#model-viewer):

```html
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.1/model-viewer.min.js"></script>
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
Note that three.js is a peer dependency, so that must also be installed, but can
be shared with other bundled code. Note that `<model-viewer>` requires the
version of three.js we test on to maintain quality, due to frequent upstream
breaking changes. We strongly recommend you keep your three.js version locked to
`<model-viewer>`'s. If you must use a different version, npm will give you an
error which you can work around using their `--legacy-peer-deps` option, which
will allow you to go outside of our version range. Please do not file issues if
you use this option. 

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

