*🚨 **PROJECT STATUS: EXPERIMENTAL** 🚨 This product is in the Experimentation phase. Someone on the team thinks it’s an idea worth exploring, but it may not go any further than this. Use at your own risk.*

# XRModelElement

`<xr-model>` is a web component that makes rendering interactive 3D models -
optionally in AR - easy to do on as many browsers as possible.

## Installing

**TODO:** Project has not been published to NPM so most of these examples do
not actually work.

You can load a bundled build via unpkg.com:

```html
<script src="https://unpkg.com/@google/xr-model/dist/xr-model-element.js"></script>
```

Alternatively, you can install the package from NPM:

```
npm install ---save @google/xr-model
```


**NOTE:** Bundled builds are useful for demos or for kicking the tires. However,
the bundled build includes some third party dependencies. Some of these
dependencies (like Three.js) are quite large. For production use cases it is
we recommend that you use the NPM package and your own bundler (such as
[Rollup](http://rollupjs.org) or [Webpack](https://webpack.js.org/)) to
eliminate potential duplicate dependencies.

## Usage

If you are using a bundled build, first add a script tag to your page to load it

```html
<script src="path/to/bundled/xr-model-element.js"></script>
```

Alternatively, if you are using the NPM package and a bundler, you can import
the module:

```javascript
import '@googlewebcomponents/xr-model';
```

After the library has been loaded, a new custom element will be defined. You can
use it anywhere you would write HTML. For example, using the bundled build in an
HTML document might look like this:

```html
<!doctype html>
<html>
  <head>
    <title>3D Test</title>
    <script src="path/to/bundled/xr-model-element.js"></script>
  </head>
  <body>
    <xr-model src="path/to/model.gltf"></xr-model>
  </body>
</html>
```

Alternatively, using the NPM package in a JavaScript module might look like
this (note that this example also uses
[`LitElement`](https://github.com/Polymer/lit-element) for brevity:

```javascript
import {LitElement, html} from '@polymer/lit-element';
import '@googlewebcomponents/xr-model';

class MyApp extends LitElement {
  render() {
    return html`
<xr-model src="path/to/model.gltf"></xr-model>
`;
  }
}

customElements.define('my-app', MyApp);
```

You can think of `<xr-model>` sort of like an `<img>` or `<video>` tag, but for
3D content. Just set its `src` attribute to the URL of a valid GLTF (or GLB)
file and voila!

## Polyfills

`<xr-model>` relies on standardized features of the Web Platform to do a lot of
what it does. Some of these features are very new and don't exist in all
browsers yet. In order to maximize browser compatibility, you should install
[polyfills](https://en.wikipedia.org/wiki/Polyfill_(programming) to fill in the
gaps for some of the newest features.

### Browser Support

The following emerging web platform APIs are used by this library:

 - [Web XR Device API](https://immersive-web.github.io/webxr/) ([CanIUse](https://caniuse.com/#feat=webvr), [Platform Status](https://www.chromestatus.com/features/5680169905815552))
 - [Custom Elements](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements) ([CanIUse](https://caniuse.com/#feat=custom-elementsv1), [Platform Status](https://www.chromestatus.com/features/4696261944934400))
 - [Shadow DOM](https://dom.spec.whatwg.org/#shadow-trees) ([CanIUse](https://caniuse.com/#feat=shadowdomv1), [Platform Status](https://www.chromestatus.com/features/4667415417847808))
 - [Resize Observer](https://wicg.github.io/ResizeObserver/) ([CanIUse](https://caniuse.com/#feat=resizeobserver), [Platform Status](https://www.chromestatus.com/features/5705346022637568))
 - [Fullscreen API](https://fullscreen.spec.whatwg.org/) ([CanIUse](https://caniuse.com/#feat=fullscreen), [Platform Status](https://www.chromestatus.com/features/6596356319739904))

Some browser support for these features can be enabled with polyfills. Any
polyfills that faithfully implement the required platform features should be
fine. The following is a selection of recommended polyfill implementations:

 - [Web XR Device API Polyfill](https://github.com/immersive-web/webxr-polyfill)
 - [Web Components Polyfill](https://github.com/webcomponents/webcomponentsjs) (includes Custom Elements and Shadow DOM)
 - [Resize Observer Polyfill](https://github.com/que-etc/resize-observer-polyfill)
 - [Fullscreen Polyfill](https://github.com/nguyenj/fullscreen-polyfill)

Please keep in mind that your mileage may vary depending on the browsers you
need to support and the fidelity of the polyfills used.

### Polyfill Usage Example

If you are using the polyfills recommended above, you can install them with
this NPM command:

```
npm i --save @webcomponents/webcomponentjs resize-observer-polyfill fullscreen-polyfill
```

Once you have them installed, it is generally considered good practice to load
them before the rest of your application code:

```html
<!doctype>
<html>
  <head>
    <title>Polyfill Example</title>

    <!-- The following libraries and polyfills are recommended to maximize browser support -->
    <!-- NOTE: you must adjust the paths as appropriate for your project -->

    <!-- Web Components polyfill is required to support Edge and Firefox < 63: -->
    <script src="./node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"></script>

    <!-- Resize Observer polyfill is required for non-Chrome browsers: -->
    <script src="./node_modules/resize-observer-polyfill/dist/ResizeObserver.js"></script>

    <!-- Fullscreen polyfill is required to support all stable browsers: -->
    <script src="./node_modules/fullscreen-polyfill/dist/fullscreen.polyfill.js"></script>
  </head>
  <body>
    <!-- etc -->
  </body>
</html>
```

## API

### Attributes

* *`src`*: The URL to the 3D model. **Note:** only GLTF/GLB files are supported. For more information, see the Supported Formats section.
* *`ios-src`*: The url to a USDZ model will be used in iOS Safari to launch Quick Look for AR.
* *`preload`*: Whether or not the user must select the element first before the model begins to download. Keep in mind models can be heavy on bandwidth and use preloading with caution.
* *`poster`*: Displays an image instead of the model until the model is loaded or a user action.
* *`controls`*: Enables controls via mouse/touch when in flat view.
* *`ar`*: Enables the option to enter AR and place the 3D model in the real world if the platform supports it. On iOS, this requires that `ios-src` has also been configured.
* *`background-color`*: Sets the background color of the flat view. Takes any valid CSS color string.
* *`auto-rotate`*: Enables the auto rotation of the model.

All attributes have a corresponding property in camel-case format. For example,
the `background-color` attribute can also be configured using the
`backgroundColor` property.

### Events

* *`'load'`*: Fired when a model is loaded. Can fire multiple times per XRModelElement if changing the `src` attribute.

## Supported Formats

An `<xr-model>`'s attributes allows developers to specify multiple file types to work
across different platforms. For WebGL and Web XR purposes, both GLTF and GLB are
supported out of the box. Additionally, developers can specify a USDZ file (using
the `ios-src` attribute) that will be used to launch Quick Look on iOS Safari as
an interim solution until Safari has built-in XR support.

Note: iOS Quick Look only supports model files that use the USDZ format. This means
that iOS users who see a live-rendered model in the browser (loaded as GLTF / GLB) will
have to download the same model a _second time_ in USDZ format when they launch Quick Look.

## Development

After you have cloned the repository locally, you should run:

```
npm install
```

This will install dependencies, run a build and run the tests. Build artifacts
are placed in the `lib` and `dist` folders.

The following NPM scripts are available:

* `npm run clean` - Deletes all build artifacts
* `npm run build` - Builds the distributable from the `src/` directory.
* `npm run watch` - Watches the `src/` directory, rebuilding when a file changes.
* `npm run serve` - Serves a static server on port `8000` from the project root.
* `npm run dev` - Combination of `npm run watch` and `npm run serve` -- watches the `src/` directory, rebuilding when a file changes and opens a static server on port `8000`.
* `npm test` - Runs tests.

## License

Apache License Version 2.0, Copyright © 2018 Google

[USDZ]: https://graphics.pixar.com/usd/docs/Usdz-File-Format-Specification.html
[glTF]: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0
[glb]: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#glb-file-format-specification
