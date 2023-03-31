# `<model-viewer-effects>`

 ![npm bundle size](https://img.shields.io/bundlephobia/min/@google/model-viewer-effects)
 ![npm (scoped)](https://img.shields.io/npm/v/@google/model-viewer-effects)

`<model-viewer-effects>` is a web component library addon for `<model-viewer>` that makes adding post-processing
effects to your models easy to do, on as many browsers and devices as possible.

`<model-viewer-effects>` strives to give you great defaults for rendering quality and
performance.

![A 3D Model of a Rocket Ship](screenshot.png)
## Usage
Using effects is as simple as adding the `<effect-composer>` inside your `<model-viewer>`, and placing any effects inside the composer component.

```html
<model-viewer src="...">
  <effect-composer>
    <bloom-effect></bloom-effect>
  </effect-composer>
</model-viewer>
```

### PostProcessing
`<model-viewer-effects>` uses the [postprocessing](https://github.com/pmndrs/postprocessing) library under the hood, for its superior [performance](https://github.com/pmndrs/postprocessing#performance) and support.

While not all effects are wrapped by this library, you can add any custom effects/passes that follow the postprocessing spec.

There is no documentation yet, but you may refer to the types for all available properties.

### *XR Support*
The effects are not supported in the `<model-viewer>` XR modes, which will render as usual.

## Installing
### NPM

The `<model-viewer-effects>` library can be installed from [NPM](https://npmjs.org):

```sh
npm install three @google/model-viewer @google/model-viewer-effects
```

### HTML

`<model-viewer-effects>` and `<model-viewer>` share a [Three.js](https://threejs.org/) dependency. In order to avoid version conflicts, you should bring Three through an `import-map`:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@^0.150.0/build/three.module.js"
    }
  }
</script>
```

You should then bring the `no-three` version of `<model-viewer>`, along with `<model-viewer-effects>` from your favourite CDN, such as [jsDelivr](https://www.jsdelivr.com/package/npm/@google/model-viewer):


```html
<script type="module" src=" https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer-no-three.min.js "></script>

<script type="module" src=" https://cdn.jsdelivr.net/npm/@google/model-viewer-effects/dist/model-viewer-effects.min.js "></script>
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


----
*Rocket Ship by Daniel Melchior [CC-BY](https://creativecommons.org/licenses/by/3.0/) via [Poly Pizza](https://poly.pizza/m/9dyJn4gp7U8)*