*🚨 **PROJECT STATUS: EXPERIMENTAL** 🚨 This product is in the Experimentation phase. Someone on the team thinks it’s an idea worth exploring, but it may not go any further than this. Use at your own risk.*

# XRModelElement

`<xr-model>` is a web component that makes rendering interactive 3D models -
optionally in AR - easy to do on as many browsers as possible.

## Installing

**TODO:** Project has not been published to npm so most of these examples do
not actually work.

You can load a _bundled build_ via
[unpkg.com](https://unpkg.com/@mcnultron/xr-model/dist/xr-model-element.js):

```html
<script src="https://unpkg.com/@mcnultron/xr-model/dist/xr-model-element.js"></script>
```

Alternatively, you can install the _npm package_:

```
npm install ---save @mcnultron/xr-model
```

### Important note on bundling

Bundled builds are useful for demos or for kicking the tires. However,
the _bundled build_ includes some third party dependencies. Some of these
dependencies (like [three](https://threejs.org/)) are quite large. For
production use cases it is we recommend that you use the _npm package_ and your
own bundler (such as [Rollup](http://rollupjs.org) or
[Webpack](https://webpack.js.org/)) to eliminate potential duplicate
dependencies.

## Usage

If you are using a _bundled build_, first add a script tag to your page to load it

```html
<script src="path/to/bundled/xr-model-element.js"></script>
```

Alternatively, if you are using the _npm package_ and a bundler (see
"Important note on bundling" above), you can import the module:

```javascript
import '@mcnultron/xr-model';
```

After the library has been loaded, a new custom element will be defined. You can
use it anywhere you would write HTML. For example, using the _bundled build_ in
an HTML document might look like this:

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

Alternatively, using the _npm package_ in a JavaScript module might look like
this:

```javascript
import '@mcnultron/xr-model';

const model = document.createElement('xr-model');
model.src = 'path/to/model.gltf';

document.body.appendChild(model);
```

You can think of `<xr-model>` sort of like an `<img>` or `<video>` tag, but for
3D content. Just set its `src` attribute to the URL of a valid [glTF][glTF] (or
[glB][glB]) file and voila!

## Browser Support

`<xr-model>` builds upon standard web platform APIs so that the performance,
capabilities and compatibility of the library get better as the web evolves.

However, not all browsers support all of these features today. Below is the
latest state of browser support for the relevant emerging features.

**📢 Check out
[POLYFILLS.md](https://github.com/PolymerLabs/xr-model/blob/master/POLYFILLS.md) to
learn how to polyfill for maximum browser compatibility!**

---

 - ✅ No polyfill needed
 - 🚧 Requires a polyfill
 - 🚫 Not available
 - 🎌 Available but unstable

Feature                   | Chrome | Canary | Safari 12 | Firefox 63 | Firefox 62 | Edge  | IE 11
--------------------------|--------|--------|-----------|------------|------------|-------|------
Resize Observer           |     ✅ |     ✅ |        🚧 |         🚧 |         🚧 |    🚧 |   🚧
Custom Elements           |     ✅ |     ✅ |        ✅ |         🚧 |         🚧 |    🚧 |   🚧
Shadow DOM                |     ✅ |     ✅ |        ✅ |         ✅ |         🚧 |    🚧 |   🚧
Intersection Observer     |     ✅ |     ✅ |        🚧 |         ✅ |         ✅ |    ✅ |   🚧
Fullscreen API            |     🚧 |     ✅ |        🚧 |         🚧 |         🚧 |    🚧 |   🚧
Web XR Device API         |     🚫 |     🎌 |        🚫 |         🚫 |         🚫 |    🚫 |   🚫
Web XR HitTest API        |     🚫 |     🎌 |        🚫 |         🚫 |         🚫 |    🚫 |   🚫

## API

### Attributes

* *`src`*: The URL to the 3D model. **Note:** only [glTF][glTF]/[glB][glB] files are supported. For more information, see the Supported Formats section.
* *`ios-src`*: The url to a [USDZ][USDZ] model will be used in iOS Safari to launch Quick Look for AR.
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

An `<xr-model>`'s attributes allows developers to specify multiple file types to
work across different platforms. For WebGL and Web XR purposes, both
[glTF][glTF] and [glB][glB] are supported out of the box. Additionally,
developers can specify a [USDZ][USDZ] file (using the `ios-src` attribute) that
will be used to launch Quick Look on iOS Safari as an interim solution until
Safari has support for something like the Web XR Device and Hit Test APIs.

### Important note on data usage

iOS Quick Look only supports model files that use the [USDZ][USDZ] format. This
means that iOS users who see a live-rendered model in the browser (loaded as
[glTF][glTF]/[glB][glB] will have to download the same model
a _second time_ in [USDZ][USDZ] format when they launch Quick Look.

## Development

After you have cloned the repository locally, you should run:

```
npm install
```

This will install dependencies, run a build and run the tests. Build artifacts
are placed in the `lib` and `dist` folders.

The following npm scripts are available:

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
