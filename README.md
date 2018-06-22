# XRModelElement

[![Build Status](http://img.shields.io/travis/google/xr-model-element.svg?style=flat-square)](https://travis-ci.org/google/xr-model-element)
[![Build Status](http://img.shields.io/npm/v/xr-model-element.svg?style=flat-square)](https://www.npmjs.org/package/xr-model-element)
[![Build Status](http://img.shields.io/npm/dt/xr-model-element.svg?style=flat-square)](https://www.npmjs.org/package/xr-model-element)
[![Build Status](http://img.shields.io/npm/l/xr-model-element.svg?style=flat-square)](https://www.npmjs.org/package/xr-model-element)


`<xr-model>` is a web component for rendering interactive 3D models, optionally in AR,
supporting multiple formats.

## Demo

## Install

Install the component using [npm](https://www.npmjs.com/), and build using your tool of choice:

```
$ npm install xr-model-element --save
```

Or include the [dist/xr-model-element.js](dist/xr-model-element.js) script directly in your markup:

```html
  <script src="xr-model-element.js"></script>
```

## Usage

Once the component has been included on your page, you can start using the
`<xr-model>` tag.

```html
<xr-model controls ar style="height: 500px">
    <source src="assets/Astronaut.usdz" type="model/vnd.usd+zip">
    <source src="assets/Astronaut.glb" type="model/gltf-binary">
</xr-model>
```

## API

### `<xr-model>`

The base element for rendering 3D models.

#### Attributes

* *`src`*: The URL to the 3D model. **It's recommended to use children `<source>` elements documented below to support all platforms and explicitly define types.** Not currently implemented.
* *`controls`*: Enables controls via mouse/touch when in flat view.
* *`ar`*: Enables the option to enter AR and place the 3D model in the real world if the platform supports it.
* *`background-color`*: Sets the background color of the flat view. Takes any valid CSS color string.
* *`auto-rotate`*: Enables the auto rotation of the model.
* *`vignette`*: Enables vignette rendering when not on mobile.

### `<source>`

The [`<source>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source)
elements that are children of an `<xr-model>` are used similarly to their `<audio>` and `<video>`
counterparts. The `<source>` elements specify multiple media resources for its parent
`<xr-model>`, used to serve media content in multiple formats supported by different browsers.
The parent `<xr-model>` must not have a `src` attribute defined if using `<source>` elements.

#### Attributes

* *`src`*: (**required**) The URL to the 3D model.
* *`type`*: (**required**) The [MIME-type](https://tools.ietf.org/html/rfc4281) of the resource. See [Supported Formats](#supported-formats).

## Supported Formats

An `<xr-model>`'s `<source>` element allows developers to specify multiple file types to work
across different platforms.

| Name | MIME Type | Support
| --- | --- | --- |
| [USDZ] | `model/vnd.usd+zip` |
| [GLB] | `model/gltf-binary` |
| [glTF] | `model/gltf+json` |

## Development

* `npm run build` - Builds the distributable from the `src/` directory.
* `npm run watch` - Watches the `src/` directory, rebuilding when a file changes
* `npm test` - Runs tests. As of now, only a linter.

## TODOs/Questions

* The DOM view is using post processing, but due to [WebGLRenderTargets not supporting antialiasing](https://github.com/mrdoob/three.js/issues/568), we get aliasing. Perhaps there are other solutions. Currently using a FXAA pass if post processing is used.
* three.js 94dev includes the `WebGLRenderer.prototype.setFramebuffer` function which we need in order to bind WebXR's framebuffer easily. This version is not yet in npm, so a local version is committed in third_party/three, and some extra rollup work to work around this. Upgrade to r94 once its on npm.
* There is currently no way to tell whether an iOS device has AR Quick Look support. Possibly check for other features added in Safari iOS 12 (like CSS font-display): https://css-tricks.com/font-display-masses/
* Since there are no USDZ three.js loaders (and seems that it'd be difficult to do), Safari iOS users would either need to load a poster image, or if they load the 3D model content before entering AR, they'd download both glTF and USDZ formats, which are already generally rather large.
* With native AR Quick Look, the entire image triggers an intent to the AR Quick Look. Currently in this component implementation, the user must click the AR button. Unclear if we want to change this, as interacting and moving the model could cause an AR Quick Look trigger.
* The size of the AR Quick Look native button scales to some extent based off of the wrapper. We could attempt to mimic this, or leverage the native rendering possibly with a transparent base64 image.
* I'm sure there's some race conditions if quickly toggling states between DOM and AR views.

## License

Apache License Version 2.0, Copyright © 2018 Google

[USDZ]: https://graphics.pixar.com/usd/docs/Usdz-File-Format-Specification.html
[glTF]: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0
[glb]: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#glb-file-format-specification
